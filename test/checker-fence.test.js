// Regression tests: markdown fences must not satisfy or trip artifact checks.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkNotebook } from "../lib/checker.js";

async function nb(files) {
  const root = await mkdtemp(path.join(os.tmpdir(), "rn-fence-"));
  const dir = path.join(root, ".repo-notebook");
  await mkdir(dir, { recursive: true });
  for (const [name, body] of Object.entries(files)) await writeFile(path.join(dir, name), body);
  return dir;
}

test("a heading only inside a fence does not satisfy E007", async () => {
  const dir = await nb({
    "index.md": "# Project Notebook\n\n- [System behavior](system.md) — x.\n",
    "system.md": "Prose, no heading.\n\n```md\n# System Behavior\n```\n",
  });
  try {
    const f = await checkNotebook(dir);
    assert.equal(f.filter((x) => x.code === "E007" && x.file === "system.md").length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("a real heading outside a fence satisfies E007", async () => {
  const dir = await nb({
    "index.md": "# Project Notebook\n\n- [System behavior](system.md) — x.\n",
    "system.md": "# System Behavior\n\n```md\nwhatever\n```\n",
  });
  try {
    const f = await checkNotebook(dir);
    assert.equal(f.filter((x) => x.code === "E007" && x.file === "system.md").length, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("a rule only inside a fence does not trip E008", async () => {
  const dir = await nb({
    "principles.md": "# Principles\n\nExample:\n\n```md\n1. **Example** — no source.\n```\n",
  });
  try {
    const f = await checkNotebook(dir);
    assert.equal(f.filter((x) => x.code === "E008").length, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("a real rule with no Source trips E008", async () => {
  const dir = await nb({
    "principles.md": "# Principles\n\n1. **Real rule** — no source.\n",
  });
  try {
    const f = await checkNotebook(dir);
    assert.equal(f.filter((x) => x.code === "E008").length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("tilde fences are also stripped", async () => {
  const dir = await nb({
    "index.md": "# Project Notebook\n\n- [System behavior](system.md) — x.\n",
    "system.md": "Prose.\n\n~~~md\n# System Behavior\n~~~\n",
  });
  try {
    const f = await checkNotebook(dir);
    assert.equal(f.filter((x) => x.code === "E007" && x.file === "system.md").length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});