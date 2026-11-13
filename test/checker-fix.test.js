import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkNotebook, summarize, fixMechanical } from "../lib/checker.js";

async function notebook(decisions, extra = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "rn-check2-"));
  const dir = path.join(root, ".repo-notebook", "decisions");
  await mkdir(dir, { recursive: true });
  for (const [name, body] of Object.entries(decisions)) await writeFile(path.join(dir, name), body);
  for (const [name, body] of Object.entries(extra)) await writeFile(path.join(root, ".repo-notebook", name), body);
  return root;
}
const nb = (root) => path.join(root, ".repo-notebook");
const codes = (f) => f.map((x) => x.code).sort();
const dec = (id, status, title, extra = "") =>
  `---\nid: ${id}\nstatus: ${status}${extra}\n---\n\n# ${title}\n`;

test("S001 flags a superseded decision whose terms persist in system.md", async () => {
  const root = await notebook({
    "0001-inmemory.md": dec(1, "superseded", "Use in-memory database", "\nsuperseded_by: 2"),
    "0002-pg.md": dec(2, "accepted", "Use PostgreSQL"),
  }, { "system.md": "## Persistence\n\n- Uses an in-memory database.\n" });
  try {
    const f = await checkNotebook(nb(root));
    const s = f.filter((x) => x.code === "S001");
    assert.equal(s.length, 1);
    assert.equal(summarize(f).ok, true); // report-only: does not fail
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("S001 does not fire when current truth no longer mentions the term", async () => {
  const root = await notebook({
    "0001-inmemory.md": dec(1, "superseded", "Use in-memory database", "\nsuperseded_by: 2"),
    "0002-pg.md": dec(2, "accepted", "Use PostgreSQL"),
  }, { "system.md": "## Persistence\n\n- Uses PostgreSQL.\n" });
  try {
    const f = await checkNotebook(nb(root));
    assert.equal(f.filter((x) => x.code === "S001").length, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("S001 does not fire for accepted decisions", async () => {
  const root = await notebook(
    { "0001-x.md": dec(1, "accepted", "Use in-memory database") },
    { "system.md": "- Uses an in-memory database.\n" },
  );
  try {
    const f = await checkNotebook(nb(root));
    assert.equal(f.filter((x) => x.code === "S001").length, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("fixMechanical aligns id to filename (E002)", async () => {
  const root = await notebook({ "0007-thing.md": dec(3, "accepted", "Thing") });
  try {
    const r = await fixMechanical(nb(root));
    assert.ok(r.fixed.some((x) => x.code === "E002"));
    const text = await readFile(path.join(nb(root), "decisions", "0007-thing.md"), "utf8");
    assert.match(text, /^id: 0007$/m);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("fixMechanical renumbers a duplicate id (E001)", async () => {
  const root = await notebook({
    "0002-alpha.md": dec(2, "accepted", "Alpha"),
    "0002-beta.md": dec(2, "accepted", "Beta"),
  });
  try {
    const r = await fixMechanical(nb(root));
    assert.ok(r.fixed.some((x) => x.code === "E001"));
    const after = await checkNotebook(nb(root));
    assert.equal(after.filter((x) => x.code === "E001").length, 0);
    assert.equal(after.filter((x) => x.code === "E002").length, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("fixMechanical is idempotent on a clean notebook", async () => {
  const root = await notebook({
    "0001-a.md": dec(1, "accepted", "A"),
    "0002-b.md": dec(2, "accepted", "B"),
  });
  try {
    const r = await fixMechanical(nb(root));
    assert.equal(r.fixed.length, 0);
    assert.equal(r.changed, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});