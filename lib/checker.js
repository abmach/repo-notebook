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

// Decision front matter is the leading `---` block, nothing else. Matching the
// whole file would read metadata-shaped prose or fenced examples as records,
// so a body line could invent or mask an id, status, or superseded_by.
const FRONT_MATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function frontMatter(text) {
  const match = String(text).match(FRONT_MATTER_BLOCK);
  return match ? match[1] : "";
}

// Required top-level heading for each durable artifact. A file that exists but
// lacks its heading has drifted from the format the capture skill defines.
const REQUIRED_HEADINGS = {
  "context.md": "# Project Context",
  "glossary.md": "# Glossary",
  "principles.md": "# Principles",
  "system.md": "# System Behavior",
  "stack.md": "# Technical Choices",
};

// Strip fenced code blocks (``` or ~~~) so checks only see real markdown, not
// examples or snippets. A "# System Behavior" inside a fence is not a heading,
// and a "1. **rule**" inside a fence is not a principle. Returns the text with
// fenced regions removed (newlines preserved so line structure stays stable).
function stripFences(text) {
  const lines = String(text).split("\n");
  const out = [];
  let fence = null;
  for (const line of lines) {
    const m = line.match(/^\s*(```+|~~~+)/);
    if (m) {
      if (fence === null) fence = m[1][0];
      else if (m[1][0] === fence) fence = null;
      out.push("");
      continue;
    }
    out.push(fence === null ? line : "");
  }
  return out.join("\n");
}

async function checkArtifacts(notebookDir, findings) {
  for (const [file, heading] of Object.entries(REQUIRED_HEADINGS)) {
    let text;
    try { text = await readFile(path.join(notebookDir, file), "utf8"); }
    catch { continue; } // absent artifact: bootstrap decides whether it should exist
    if (!stripFences(text).split("\n").some((l) => l.trim() === heading)) {
      findings.push({
        code: "E007",
        file,
        message: `missing required heading "${heading}"`,
      });
    }
  }

  // Principle provenance: every numbered rule must carry a Source. A rule with
  // no provenance is the "generic advice" the capture skill forbids. Accept both
  // "1. **Rule**" and "1) **Rule**" list styles.
  let principles;
  try { principles = await readFile(path.join(notebookDir, "principles.md"), "utf8"); }
  catch { return; }
  const rules = stripFences(principles).split("\n").filter((l) => /^\s*\d+[.)]\s+\*\*/.test(l));
  for (const rule of rules) {
    if (!/Source:/i.test(rule)) {
      findings.push({
        code: "E008",
        file: "principles.md",
        message: `principle has no Source: ${rule.trim().slice(0, 80)}`,
      });
    }
  }
}

async function checkIndex(notebookDir, findings) {
  const indexPath = path.join(notebookDir, "index.md");
  let indexText;
  try { indexText = await readFile(indexPath, "utf8"); }
  catch { return; } // no index: nothing to cross-check

  // Every top-level artifact must be linked from the index. Normalize each link
  // target (strip "./", anchor, trailing "/") so "./context.md" and
  // "context.md#x" count as linking context.md.
  const linkTargets = new Set();
  const linkRe = /\]\(([^)]+)\)/g;
  let m;
  while ((m = linkRe.exec(indexText)) !== null) {
    let href = m[1].trim().replace(/#.*$/, "").replace(/^\.\//, "");
    if (/^[a-z]+:/i.test(href)) continue; // external
    if (href.endsWith("/")) href = href.replace(/\/+$/, "");
    if (href) linkTargets.add(href);
  }

  let top;
  try { top = await readdir(notebookDir, { withFileTypes: true }); }
  catch { return; }
  const artifacts = top
    .filter((e) => (e.isFile() && e.name.endsWith(".md") && e.name !== "index.md")
      || (e.isDirectory() && (e.name === "decisions" || e.name === "work")))
    .map((e) => e.name);
  for (const name of artifacts) {
    if (!linkTargets.has(name)) {
      const label = name === "decisions" || name === "work" ? `${name}/` : name;
      findings.push({
        code: "W003",
        file: "index.md",
        message: `top-level ${label} is not linked from the index`,
      });
    }
  }

  // Every relative link in the index must resolve (normalized: no "./", no anchor).
  for (const href of linkTargets) {
    const resolved = path.join(notebookDir, href);
    let ok = false;
    try { await stat(resolved); ok = true; } catch { ok = false; }
    if (!ok) {
      findings.push({
        code: "W004",
        file: "index.md",
        message: `index link target does not exist: ${href}`,
      });
    }
  }
}

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

  // Artifact and index checks run whether or not decisions/ exists.
  await checkArtifacts(notebookDir, findings);
  await checkIndex(notebookDir, findings);

  const decisionsDir = path.join(notebookDir, "decisions");

  let entries;
  try {
    entries = await readdir(decisionsDir, { withFileTypes: true });
    entries.sort((a, b) => byName(a.name, b.name));
  } catch {
    entries = []; // no decisions/ yet: skip decision rules, keep artifact findings
  }

  const records = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const fileMatch = entry.name.match(DECISION_FILE);
    const text = await readFile(path.join(decisionsDir, entry.name), "utf8");
    const matter = frontMatter(text);
    const idMatch = matter.match(FRONT_MATTER_ID);
    const statusMatch = matter.match(FRONT_MATTER_STATUS);
    const supersededByMatch = matter.match(FRONT_MATTER_SUPERSEDED_BY);

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

// Code-point name order, not locale order: findings and fixes must not depend
// on readdir's filesystem-specific order.
function byName(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
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
// Returns { fixed, changed }. Never touches record bodies.
export async function fixMechanical(notebookDir) {
  const decisionsDir = path.join(notebookDir, "decisions");
  let entries;
  try { entries = await readdir(decisionsDir, { withFileTypes: true }); }
  catch { return { fixed: [], changed: false }; }

  const files = entries
    .filter((e) => e.isFile() && DECISION_FILE.test(e.name))
    .map((e) => e.name)
    .sort(byName);
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
    const idMatch = frontMatter(text).match(FRONT_MATTER_ID);
    if (idMatch && Number(idMatch[1]) !== Number(fm[1])) {
      text = text.replace(/^id:\s*\d+\s*$/m, `id: ${fm[1]}`);
      fixed.push({ code: "E002", file, message: `aligned id to filename prefix ${fm[1]}` });
    }

    // E001: renumber duplicates (keep first occurrence). Renumber id AND rename
    // the file, so the E002 rule (id must equal filename prefix) stays satisfied.
    const numId = Number(frontMatter(text).match(FRONT_MATTER_ID)?.[1] ?? fm[1]);
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
  return { fixed, changed };
}
