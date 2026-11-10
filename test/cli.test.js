import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const cli = path.resolve("bin/repo-notebook.js");

test("interactive init installs only consented locations and files", async () => {
  const root = await createTempRepository();
  try {
    const result = runCli(root, ".agents\ny\ny\ny\n");

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /- \.agents \(/);
    assert.doesNotMatch(result.stdout, /\[object Object\]/);
    await readFile(path.join(root, ".agents", "skills", "context", "SKILL.md"), "utf8");
    await readFile(path.join(root, ".repo-notebook", "index.md"), "utf8");
    assert.match(await readFile(path.join(root, "AGENTS.md"), "utf8"), /repo-notebook:start/);
    assert.match(await readFile(path.join(root, ".repo-notebook-install.json"), "utf8"), /".agents"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("interactive init installs nothing when no location is selected", async () => {
  const root = await createTempRepository();
  try {
    const result = runCli(root, "none\n");

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /No harness locations selected/);
    await assertMissing(path.join(root, ".agents"));
    await assertMissing(path.join(root, ".repo-notebook"));
    await assertMissing(path.join(root, ".repo-notebook-install.json"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("interactive init installs nothing when installation is declined", async () => {
  const root = await createTempRepository();
  try {
    const result = runCli(root, ".agents\nn\nn\nn\n");

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Installation cancelled/);
    await assertMissing(path.join(root, ".agents"));
    await assertMissing(path.join(root, ".repo-notebook"));
    await assertMissing(path.join(root, ".repo-notebook-install.json"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rerunning init preserves differing installed skill files", async () => {
  const root = await createTempRepository();
  try {
    const first = spawnSync(process.execPath, [cli, "init", "--location", ".agents"], {
      cwd: root,
      encoding: "utf8",
      timeout: 30_000,
    });
    assert.equal(first.status, 0, first.stderr);

    const customized = path.join(root, ".agents", "skills", "bootstrap", "SKILL.md");
    const customContent = "# Local customization\n";
    await writeFile(customized, customContent);

    const second = spawnSync(process.execPath, [cli, "init", "--location", ".agents"], {
      cwd: root,
      encoding: "utf8",
      timeout: 30_000,
    });
    assert.equal(second.status, 0, second.stderr);
    assert.equal(await readFile(customized, "utf8"), customContent);
    assert.match(second.stdout, /Preserved existing differing skill files:/);
    assert.match(second.stdout, /\.agents\/skills\/bootstrap\/SKILL\.md/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("explicit --replace-skills replaces a customized installed skill file", async () => {
  const root = await createTempRepository();
  try {
    const first = spawnSync(process.execPath, [cli, "init", "--location", ".agents"], {
      cwd: root,
      encoding: "utf8",
      timeout: 30_000,
    });
    assert.equal(first.status, 0, first.stderr);

    const customized = path.join(root, ".agents", "skills", "bootstrap", "SKILL.md");
    await writeFile(customized, "# Local customization\n");

    const second = spawnSync(
      process.execPath,
      [cli, "init", "--location", ".agents", "--replace-skills"],
      { cwd: root, encoding: "utf8", timeout: 30_000 },
    );
    assert.equal(second.status, 0, second.stderr);
    assert.match(await readFile(customized, "utf8"), /# Bootstrap the notebook/);
    assert.match(second.stdout, /Replaced packaged skill files:/);
    assert.match(second.stdout, /\.agents\/skills\/bootstrap\/SKILL\.md/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("explicit init rejects unknown options without installing anything", async () => {
  const root = await createTempRepository();
  try {
    const result = spawnSync(process.execPath, [cli, "init", "--unknown"], {
      cwd: root,
      encoding: "utf8",
      timeout: 30_000,
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unknown option: --unknown/);
    await assertMissing(path.join(root, ".agents"));
    await assertMissing(path.join(root, ".repo-notebook"));
    await assertMissing(path.join(root, ".repo-notebook-install.json"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createTempRepository() {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-cli-"));
  await import("node:fs/promises").then((fs) => fs.mkdir(path.join(root, ".git")));
  return root;
}

function runCli(cwd, input) {
  return spawnSync(process.execPath, [cli, "init"], {
    cwd,
    input,
    encoding: "utf8",
    timeout: 30_000,
  });
}

async function assertMissing(target) {
  await assert.rejects(access(target));
}
