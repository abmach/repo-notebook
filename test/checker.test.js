import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkNotebook, summarize } from "../lib/checker.js";

async function notebookWith(decisions) {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-check-"));
  const dir = path.join(root, ".repo-notebook", "decisions");
  await mkdir(dir, { recursive: true });
  for (const [name, body] of Object.entries(decisions)) {
    await writeFile(path.join(dir, name), body);
  }
  return root;
}

function decision({ id, status, supersededBy, slug = "record" }) {
  const lines = ["---", `id: ${id}`, `status: ${status}`];
  if (supersededBy !== undefined) lines.push(`superseded_by: ${supersededBy}`);
  lines.push("---", "", `# ${slug}`, "");
  return lines.join("\n");
}

function codes(findings) {
  return findings.map((f) => f.code).sort();
}

test("clean notebook produces no findings", async () => {
  const root = await notebookWith({
    "0001-first.md": decision({ id: 1, status: "accepted" }),
    "0002-second.md": decision({ id: 2, status: "accepted" }),
  });
  try {
    const findings = await checkNotebook(path.join(root, ".repo-notebook"));
    assert.deepEqual(findings, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("notebook with no decisions directory is not an error", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-check-"));
  await mkdir(path.join(root, ".repo-notebook"), { recursive: true });
  try {
    const findings = await checkNotebook(path.join(root, ".repo-notebook"));
    assert.deepEqual(findings, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("absent notebook is a hard failure (E000), not a clean pass", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-check-"));
  try {
    const findings = await checkNotebook(path.join(root, ".repo-notebook"));
    assert.ok(codes(findings).includes("E000"));
    assert.equal(summarize(findings).ok, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("duplicate ids differing only by padding are caught (1 vs 0001)", async () => {
  const root = await notebookWith({
    "0001-alpha.md": decision({ id: 1, status: "accepted", slug: "alpha" }),
    "0001-beta.md": "---\nid: 0001\nstatus: accepted\n---\n\n# Beta\n",
  });
  try {
    const findings = await checkNotebook(path.join(root, ".repo-notebook"));
    assert.ok(codes(findings).includes("E001"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("duplicate id is reported", async () => {
  const root = await notebookWith({
    "0002-alpha.md": decision({ id: 2, status: "accepted", slug: "alpha" }),
    "0002-beta.md": decision({ id: 2, status: "accepted", slug: "beta" }),
  });
  try {
    const findings = await checkNotebook(path.join(root, ".repo-notebook"));
    assert.ok(codes(findings).includes("E001"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("id/filename mismatch is reported", async () => {
  const root = await notebookWith({
    "0005-thing.md": decision({ id: 4, status: "accepted" }),
  });
  try {
    const findings = await checkNotebook(path.join(root, ".repo-notebook"));
    assert.ok(codes(findings).includes("E002"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("dangling superseded_by is reported", async () => {
  const root = await notebookWith({
    "0002-thing.md": decision({ id: 2, status: "superseded", supersededBy: 9 }),
  });
  try {
    const findings = await checkNotebook(path.join(root, ".repo-notebook"));
    assert.ok(codes(findings).includes("E003"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("superseded without superseded_by is reported", async () => {
  const root = await notebookWith({
    "0001-old.md": decision({ id: 1, status: "superseded" }),
    "0002-new.md": decision({ id: 2, status: "accepted" }),
  });
  try {
    const findings = await checkNotebook(path.join(root, ".repo-notebook"));
    assert.ok(codes(findings).includes("E004"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("valid supersession chain is clean", async () => {
  const root = await notebookWith({
    "0001-old.md": decision({ id: 1, status: "superseded", supersededBy: 2 }),
    "0002-new.md": decision({ id: 2, status: "accepted" }),
  });
  try {
    const findings = await checkNotebook(path.join(root, ".repo-notebook"));
    assert.deepEqual(findings, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("invalid status is reported", async () => {
  const root = await notebookWith({
    "0001-thing.md": decision({ id: 1, status: "retired" }),
  });
  try {
    const findings = await checkNotebook(path.join(root, ".repo-notebook"));
    assert.ok(codes(findings).includes("E005"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("missing id is reported", async () => {
  const root = await notebookWith({
    "0001-thing.md": "---\nstatus: accepted\n---\n\n# Thing\n",
  });
  try {
    const findings = await checkNotebook(path.join(root, ".repo-notebook"));
    assert.ok(codes(findings).includes("E006"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepted record with superseded_by is a warning", async () => {
  const root = await notebookWith({
    "0001-old.md": decision({ id: 1, status: "superseded", supersededBy: 2 }),
    "0002-new.md": decision({ id: 2, status: "accepted" }),
    "0003-odd.md": decision({ id: 3, status: "accepted", supersededBy: 1 }),
  });
  try {
    const findings = await checkNotebook(path.join(root, ".repo-notebook"));
    assert.ok(codes(findings).includes("W001"));
    assert.equal(summarize(findings).ok, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("summarize separates errors from warnings", async () => {
  const errors = [{ code: "E001" }, { code: "W002" }];
  const s = summarize(errors);
  assert.equal(s.errors.length, 1);
  assert.equal(s.warnings.length, 1);
  assert.equal(s.ok, false);
});