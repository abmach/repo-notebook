// CLI contract for `check`: exit codes, JSON shape, strict mode, and --fix.
// The library rules are covered in checker*.test.js; this file exercises the
// user-facing surface (argument handling, output, process exit status).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const cli = path.resolve("bin/repo-notebook.js");

const DECISION = (id, status, title, extra = "") =>
  `---\nid: ${id}\nstatus: ${status}${extra}\n---\n\n# ${title}\n`;

const INDEX = "# Project Notebook\n\n- [Decisions](decisions/)\n";

async function repo(files = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "rn-check-cli-"));
  await mkdir(path.join(root, ".git"));
  const notebook = path.join(root, ".repo-notebook");
  await mkdir(path.join(notebook, "decisions"), { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    const full = path.join(notebook, name);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  }
  return root;
}

function check(root, ...flags) {
  return spawnSync(process.execPath, [cli, "check", ...flags], {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
  });
}

test("check exits 1 when the notebook is absent", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "rn-check-cli-"));
  await mkdir(path.join(root, ".git"));
  try {
    const result = check(root);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /E000 .*no notebook/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check exits 0 on a clean notebook", async () => {
  const root = await repo({
    "index.md": INDEX,
    "decisions/0001-first.md": DECISION(1, "accepted", "First"),
    "decisions/0002-second.md": DECISION(2, "accepted", "Second"),
  });
  try {
    const result = check(root);
    assert.equal(result.status, 0, result.stdout);
    assert.match(result.stdout, /No structural issues found/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check exits 1 on a structural error", async () => {
  const root = await repo({
    "index.md": INDEX,
    "decisions/0001-first.md": DECISION(1, "accepted", "First"),
    "decisions/0001-duplicate.md": DECISION(1, "accepted", "Duplicate"),
  });
  try {
    const result = check(root);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /E001/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("--json prints one machine-readable payload and honours ok", async () => {
  const root = await repo({
    "index.md": INDEX,
    "decisions/0001-first.md": DECISION(1, "accepted", "First"),
  });
  try {
    const result = check(root, "--json");
    assert.equal(result.status, 0, result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.deepEqual(Object.keys(payload).sort(), ["errors", "ok", "stale", "warnings"]);
    assert.equal(payload.ok, true);
    assert.ok(Array.isArray(payload.errors));
    assert.ok(Array.isArray(payload.warnings));
    assert.ok(Array.isArray(payload.stale));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("warnings pass by default and fail under --strict", async () => {
  const root = await repo({
    "index.md": "# Project Notebook\n",
    "context.md": "# Project Context\n",
  });
  try {
    const lenient = check(root);
    assert.equal(lenient.status, 0, lenient.stdout);
    assert.match(lenient.stdout, /W003/);

    const strict = check(root, "--strict");
    assert.equal(strict.status, 1);
    assert.match(strict.stdout, /W003/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("--fix aligns the id to the filename prefix", async () => {
  const root = await repo({
    "index.md": INDEX,
    "decisions/0007-record.md": DECISION(6, "accepted", "Record"),
  });
  try {
    const result = check(root, "--fix");
    assert.equal(result.status, 0, result.stdout);
    assert.match(result.stdout, /fixed E002 \(0007-record\.md\)/);
    assert.match(await readFile(path.join(root, ".repo-notebook", "decisions", "0007-record.md"), "utf8"), /^id: 0007$/m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check rejects unknown options with exit 2", async () => {
  const root = await repo({ "index.md": INDEX });
  try {
    const result = check(root, "--jsn");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Unknown option for check: --jsn/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check --help prints check usage and exits 0", async () => {
  const root = await repo({ "index.md": INDEX });
  try {
    const result = check(root, "--help");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /repo-notebook check \[--json\] \[--strict\] \[--fix\]/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
