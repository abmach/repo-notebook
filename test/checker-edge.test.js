// Regression tests for checker edge cases found by probing: link normalization,
// principle list style, and index integrity.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkNotebook } from "../lib/checker.js";

async function nb(files, dirs = []) {
  const root = await mkdtemp(path.join(os.tmpdir(), "rn-edge-"));
  const dir = path.join(root, ".repo-notebook");
  await mkdir(dir, { recursive: true });
  for (const d of dirs) await mkdir(path.join(dir, d), { recursive: true });
  for (const [name, body] of Object.entries(files)) await writeFile(path.join(dir, name), body);
  return dir;
}
const codes = (f) => f.map((x) => x.code).sort();

test("index link with ./ prefix links the artifact (no false W003)", async () => {
  const dir = await nb({
    "index.md": "# Project Notebook\n\n- [Context](./context.md) — x.\n",
    "context.md": "# Project Context\n",
  });
  try {
    const f = await checkNotebook(dir);
    assert.equal(f.filter((x) => x.code === "W003").length, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("index link with an anchor links the artifact (no false W003)", async () => {
  const dir = await nb({
    "index.md": "# Project Notebook\n\n- [Context](context.md#purpose) — x.\n",
    "context.md": "# Project Context\n",
  });
  try {
    const f = await checkNotebook(dir);
    assert.equal(f.filter((x) => x.code === "W003").length, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("dangling link with ./ prefix is still W004", async () => {
  const dir = await nb({
    "index.md": "# Project Notebook\n\n- [Gone](./missing.md) — x.\n",
  });
  try {
    const f = await checkNotebook(dir);
    assert.ok(f.filter((x) => x.code === "W004").some((x) => x.message.includes("missing.md")));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("principle numbered with ) and no Source is E008", async () => {
  const dir = await nb({
    "principles.md": "# Principles\n\n1) **Rule** — why.\n",
  });
  try {
    const f = await checkNotebook(dir);
    assert.equal(f.filter((x) => x.code === "E008").length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("principle numbered with ) and Source is accepted", async () => {
  const dir = await nb({
    "principles.md": "# Principles\n\n1) **Rule** — why. Source: decision 0001.\n",
  });
  try {
    const f = await checkNotebook(dir);
    assert.equal(f.filter((x) => x.code === "E008").length, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("CRLF front matter is parsed (no false errors)", async () => {
  const dir = await nb({
    "decisions/0001-thing.md": "---\r\nid: 1\r\nstatus: accepted\r\n---\r\n\r\n# Thing\r\n",
  }, ["decisions"]);
  try {
    const f = await checkNotebook(dir);
    assert.equal(f.filter((x) => x.code.startsWith("E")).length, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});