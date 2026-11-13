// Structural linter for a Repo Notebook.
//
// Scope is deliberately narrow: only invariants that are mechanically decidable
// from the notebook files themselves. Semantic questions ("does this accepted
// decision contradict system.md?") are NOT checked here, because answering them
// reliably requires judgment, and a keyword heuristic would give false
// confidence. Contradiction detection stays the agent's job through `context`.
//
// Rules (all ERRORs unless noted):
//   E001 duplicate-id            two decision files declare the same id
//   E002 id-filename-mismatch    front-matter id != filename numeric prefix
//   E003 dangling-superseded-by  superseded_by points at a missing decision
//   E004 superseded-without-pointer
//                                a record marked superseded has no superseded_by
//   E005 invalid-status          status not one of proposed|accepted|deprecated|superseded
//   E006 missing-id              decision file without a numeric id
//   W001 accepted-with-pointer (WARN)
//                                an accepted record lists superseded_by (accepted
//                                records should not be superseded)
//   W002 non-sequential-ids (WARN) gaps in the id sequence (informational)
//   S001 stale-candidate (REPORT-ONLY) a superseded decision's terms still appear
//                                in system.md/stack.md; a review prompt, never a
//                                pass/fail verdict

import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const STATUSES = new Set(["proposed", "accepted", "deprecated", "superseded"]);
const DECISION_FILE = /^(\d+)-(.+)\.md$/;
const FRONT_MATTER_ID = /^id:\s*(\d+)\s*$/m;
const FRONT_MATTER_STATUS = /^status:\s*([A-Za-z-]+)\s*$/m;
const FRONT_MATTER_SUPERSEDED_BY = /^superseded_by:\s*(\d+)\s*$/m;

export async function checkNotebook(notebookDir) {
  const findings = [];

  // Distinguish "no notebook here" from "notebook is clean": an absent notebook
  // is a hard failure, otherwise CI would pass on a repo that never adopted one.
  let notebookEntries;
  try {
    notebookEntries = await stat(notebookDir);
  } catch {
    findings.push({ code: "E000", file: null, message: `no notebook at ${notebookDir}` });
    return findings;
  }
  if (!notebookEntries.isDirectory()) {
    findings.push({ code: "E000", file: null, message: `notebook path is not a directory: ${notebookDir}` });
    return findings;
  }

  const decisionsDir = path.join(notebookDir, "decisions");

  let entries;
  try {
    entries = await readdir(decisionsDir, { withFileTypes: true });
  } catch {
    return findings; // notebook exists but has no decisions/ yet: nothing to check
  }

  const records = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const fileMatch = entry.name.match(DECISION_FILE);
    const text = await readFile(path.join(decisionsDir, entry.name), "utf8");
    const idMatch = text.match(FRONT_MATTER_ID);
    const statusMatch = text.match(FRONT_MATTER_STATUS);
    const supersededByMatch = text.match(FRONT_MATTER_SUPERSEDED_BY);

    const titleMatch = text.match(/^#\s+(.+)$/m);
    const record = {
      file: entry.name,
      fileId: fileMatch ? fileMatch[1] : null,
      id: idMatch ? idMatch[1] : null,
      // Numeric form, used for identity/lookup so "1" and "0001" agree everywhere.
      numId: idMatch ? Number(idMatch[1]) : null,
      status: statusMatch ? statusMatch[1].toLowerCase() : null,
      supersededBy: supersededByMatch ? supersededByMatch[1] : null,
      numSupersededBy: supersededByMatch ? Number(supersededByMatch[1]) : null,
      title: titleMatch ? titleMatch[1].trim() : "",
    };
    records.push(record);
  }

  // E006 missing id
  for (const r of records) {
    if (r.id === null) {
      findings.push({ code: "E006", file: r.file, message: "decision file has no numeric id in front matter" });
    }
  }

  // E002 id/filename mismatch (only when both are known; compare numerically so
  // "id: 1" and filename "0001-" agree)
  for (const r of records) {
    if (r.fileId !== null && r.id !== null && Number(r.fileId) !== Number(r.id)) {
      findings.push({
        code: "E002",
        file: r.file,
        message: `front-matter id ${r.id} does not match filename prefix ${r.fileId}`,
      });
    }
  }

  // E001 duplicate id (numeric identity, so 1 and 0001 collide)
  const byId = new Map();
  for (const r of records) {
    if (r.numId === null) continue;
    if (!byId.has(r.numId)) byId.set(r.numId, []);
    byId.get(r.numId).push(r.file);
  }
  for (const [id, files] of byId) {
    if (files.length > 1) {
      findings.push({
        code: "E001",
        file: files.join(", "),
        message: `id ${id} is declared by ${files.length} decision files`,
      });
    }
  }

  // E005 invalid status
  for (const r of records) {
    if (r.status !== null && !STATUSES.has(r.status)) {
      findings.push({ code: "E005", file: r.file, message: `invalid status "${r.status}"` });
    }
  }

  const idToRecord = new Map();
  for (const r of records) {
    if (r.numId !== null && !idToRecord.has(r.numId)) idToRecord.set(r.numId, r);
  }

  // E003 dangling superseded_by, E004 superseded-without-pointer, W001 accepted-with-pointer
  for (const r of records) {
    if (r.status === "superseded" && r.supersededBy === null) {
      findings.push({
        code: "E004",
        file: r.file,
        message: "record is marked superseded but declares no superseded_by",
      });
    }
    if (r.numSupersededBy === null) continue;
    const target = idToRecord.get(r.numSupersededBy);
    if (!target) {
      findings.push({
        code: "E003",
        file: r.file,
        message: `superseded_by ${r.supersededBy} points at a decision that does not exist`,
      });
      continue;
    }
    if (r.status === "accepted") {
      findings.push({
        code: "W001",
        file: r.file,
        message: `accepted record declares superseded_by ${r.supersededBy}`,
      });
    }
  }

  // W002 non-sequential ids (informational). Deduplicate first: repeated ids are
  // already reported as E001, and comparing equal ids would print "jumps from N to N".
  const uniqueIds = [...new Set(records.map((r) => r.numId).filter((n) => n !== null))].sort((a, b) => a - b);
  for (let i = 1; i < uniqueIds.length; i++) {
    if (uniqueIds[i] !== uniqueIds[i - 1] + 1) {
      findings.push({
        code: "W002",
        file: null,
        message: `id sequence jumps from ${uniqueIds[i - 1]} to ${uniqueIds[i]}`,
      });
    }
  }

  // S001 stale candidates (report-only, never pass/fail). For each superseded
  // decision, if significant terms from its title still appear in a current-truth
  // artifact, surface it for human review. This is a review prompt, NOT a verdict:
  // it does not decide whether the claim is actually stale.
  findings.push(...(await staleCandidates(notebookDir, records)));

  return findings;
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "use", "using",
  "keep", "must", "should", "when", "are", "was", "were", "has", "have", "not",
  "but", "its", "their", "they", "them", "than", "then", "also", "only", "all",
  "any", "each", "per", "via", "onto", "over", "under", "after", "before",
]);

function significantTerms(text) {
  return [...new Set(
    (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
  )];
}

async function staleCandidates(notebookDir, records) {
  const out = [];
  const truthFiles = ["system.md", "stack.md"];
  const truthText = {};
  for (const f of truthFiles) {
    try { truthText[f] = (await readFile(path.join(notebookDir, f), "utf8")).toLowerCase(); }
    catch { truthText[f] = ""; }
  }
  const titleOf = (r) => r.title || "";
  for (const r of records) {
    if (r.status !== "superseded") continue;
    const terms = significantTerms(titleOf(r));
    for (const f of truthFiles) {
      const hits = terms.filter((t) => truthText[f].includes(t));
      if (hits.length > 0) {
        out.push({
          code: "S001",
          file: `${f} (candidate from ${r.file})`,
          message: `superseded decision "${titleOf(r)}" may still be described as current; terms found: ${hits.join(", ")}. Review whether ${f} reflects the superseding decision.`,
        });
      }
    }
  }
  return out;
}

export function summarize(findings) {
  const errors = findings.filter((f) => f.code.startsWith("E"));
  const warnings = findings.filter((f) => f.code.startsWith("W"));
  const stale = findings.filter((f) => f.code.startsWith("S"));
  return { errors, warnings, stale, ok: errors.length === 0 };
}

// fixMechanical applies only the safe, deterministic corrections:
//   E002  align front-matter id: to the filename prefix
//   E001  renumber later duplicates to the next unused sequential id
// Returns { fixed: [...], remaining: [...] }. Never touches record bodies.
export async function fixMechanical(notebookDir) {
  const decisionsDir = path.join(notebookDir, "decisions");
  let entries;
  try { entries = await readdir(decisionsDir, { withFileTypes: true }); }
  catch { return { fixed: [], remaining: [], changed: false }; }

  const files = entries.filter((e) => e.isFile() && DECISION_FILE.test(e.name)).map((e) => e.name);
  const used = new Set();
  for (const f of files) {
    const m = f.match(DECISION_FILE);
    if (m) used.add(Number(m[1]));
  }
  const nextFree = () => { let n = 1; while (used.has(n)) n++; used.add(n); return n; };

  const seen = new Map(); // numId -> first file
  const fixed = [];
  let changed = false;

  for (const file of files) {
    const full = path.join(decisionsDir, file);
    let text = await readFile(full, "utf8");
    const fm = file.match(DECISION_FILE);
    const before = text;

    // E002: align id: to filename prefix
    const idMatch = text.match(/^id:\s*(\d+)\s*$/m);
    if (idMatch && Number(idMatch[1]) !== Number(fm[1])) {
      text = text.replace(/^id:\s*\d+\s*$/m, `id: ${fm[1]}`);
      fixed.push({ code: "E002", file, message: `aligned id to filename prefix ${fm[1]}` });
    }

    // E001: renumber duplicates (keep first occurrence). Renumber id AND rename
    // the file, so the E002 rule (id must equal filename prefix) stays satisfied.
    const numId = Number((text.match(/^id:\s*(\d+)\s*$/m) || [])[1] || fm[1]);
    let finalName = file;
    if (seen.has(numId) && seen.get(numId) !== file) {
      const newId = nextFree();
      const padded = String(newId).padStart(fm[1].length, "0");
      text = text.replace(/^id:\s*\d+\s*$/m, `id: ${padded}`);
      finalName = `${padded}-${file.slice(fm[1].length + 1)}`;
      fixed.push({ code: "E001", file, message: `renumbered duplicate id ${numId} to ${newId} (renamed to ${finalName})` });
    } else if (!seen.has(numId)) {
      seen.set(numId, file);
    }

    if (text !== before || finalName !== file) {
      if (finalName !== file) {
        await writeFile(path.join(decisionsDir, finalName), text);
        await rm(path.join(decisionsDir, file));
      } else {
        await writeFile(full, text);
      }
      changed = true;
    }
  }
  return { fixed, remaining: [], changed };
}