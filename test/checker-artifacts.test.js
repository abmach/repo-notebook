import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkNotebook } from "../lib/checker.js";

async function nb(files) {
  const root = await mkdtemp(path.join(os.tmpdir(), "rn-art-"));
  const dir = path.join(root, ".repo-notebook");
  await mkdir(dir, { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    const full = path.join(dir, name);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  }
  return dir;
}
const codes = (f) => f.map((x) => x.code).sort();
const clean = (root) => rm(root, { recursive: true, force: true });

const GOOD_INDEX = `# Project Notebook

- [Context](context.md) — purpose.
- [Glossary](glossary.md) — terms.
- [Principles](principles.md) — rules.
- [Decisions](decisions/) — choices.
- [System behavior](system.md) — behavior.
- [Technical choices](stack.md) — stack.
- [Change Briefs](work/) — transient.
`;

test("required headings missing is E007", async () => {
  const dir = await nb({
    "index.md": GOOD_INDEX,
    "context.md": "# Wrong Heading\n\n## Purpose\n\nx\n",
    "system.md": "# System Behavior\n",
    "stack.md": "# Technical Choices\n",
    "glossary.md": "# Glossary\n",
    "principles.md": "# Principles\n",
  });
  try {
    const f = await checkNotebook(dir);
    const e = f.filter((x) => x.code === "E007");
    assert.equal(e.length, 1);
    assert.match(e[0].message, /Project Context/);
  } finally { await clean(dir); }
});

test("all required headings present is clean", async () => {
  const dir = await nb({
    "index.md": GOOD_INDEX,
    "context.md": "# Project Context\n\n## Purpose\n\nx\n",
    "system.md": "# System Behavior\n",
    "stack.md": "# Technical Choices\n",
    "glossary.md": "# Glossary\n",
    "principles.md": "# Principles\n",
  });
  await mkdir(path.join(dir, "decisions"), { recursive: true });
  await mkdir(path.join(dir, "work"), { recursive: true });
  try {
    assert.deepEqual(await checkNotebook(dir), []);
  } finally { await clean(dir); }
});

test("principle without Source is E008", async () => {
  const dir = await nb({
    "index.md": GOOD_INDEX,
    "context.md": "# Project Context\n",
    "system.md": "# System Behavior\n",
    "stack.md": "# Technical Choices\n",
    "glossary.md": "# Glossary\n",
    "principles.md": "# Principles\n\n1. **Be careful** — it matters.\n",
  });
  try {
    const f = await checkNotebook(dir);
    assert.equal(f.filter((x) => x.code === "E008").length, 1);
  } finally { await clean(dir); }
});

test("principle with Source is accepted", async () => {
  const dir = await nb({
    "index.md": GOOD_INDEX,
    "context.md": "# Project Context\n",
    "system.md": "# System Behavior\n",
    "stack.md": "# Technical Choices\n",
    "glossary.md": "# Glossary\n",
    "principles.md": "# Principles\n\n1. **Be careful** — it matters. Source: decision 0001.\n",
  });
  try {
    const f = await checkNotebook(dir);
    assert.equal(f.filter((x) => x.code === "E008").length, 0);
  } finally { await clean(dir); }
});

test("top-level artifact not linked is W003", async () => {
  const dir = await nb({
    "index.md": "# Project Notebook\n\n- [Context](context.md) — purpose.\n",
    "context.md": "# Project Context\n",
    "system.md": "# System Behavior\n", // exists but unlinked
  });
  try {
    const f = await checkNotebook(dir);
    const w = f.filter((x) => x.code === "W003");
    assert.ok(w.some((x) => x.message.includes("system.md")));
  } finally { await clean(dir); }
});

test("dangling index link is W004", async () => {
  const dir = await nb({
    "index.md": "# Project Notebook\n\n- [Context](context.md) — purpose.\n- [Gone](missing.md) — nope.\n",
    "context.md": "# Project Context\n",
  });
  try {
    const f = await checkNotebook(dir);
    assert.ok(f.filter((x) => x.code === "W004").some((x) => x.message.includes("missing.md")));
  } finally { await clean(dir); }
});