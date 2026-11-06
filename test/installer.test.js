import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  addInstruction,
  createNotebook,
  findProjectRoot,
  installSkills,
  loadPackageData,
  inspectProject,
  writeInstallMarker,
} from "../lib/installer.js";

test("finds the Git repository root", async () => {
  const root = await findProjectRoot();
  assert.equal(path.basename(root), "repo-notebook");
});

test("installs every skill into a selected harness location", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-test-"));
  try {
    const packageData = await loadPackageData();
    await installSkills(root, ".agents", packageData);

    for (const skill of packageData.skills) {
      const contents = await readFile(
        path.join(root, ".agents", "skills", skill, "SKILL.md"),
        "utf8",
      );
      assert.match(contents, /^---\nname: /);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("inspection exposes relative location paths and instruction names", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-test-"));
  try {
    await writeFile(path.join(root, "AGENTS.md"), "Existing guidance\n");
    const inspection = await inspectProject(root);
    const agents = inspection.locations.find((entry) => entry.path === ".agents");

    assert.equal(agents.path, ".agents");
    assert.equal(agents.instructionName, "AGENTS.md");
    assert.equal(agents.instructionExists, true);
    assert.equal(agents.skillsExist, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("creates notebook records without overwriting existing files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-test-"));
  try {
    const notebook = path.join(root, ".repo-notebook");
    await mkdir(notebook, { recursive: true });
    await writeFile(path.join(notebook, "context.md"), "Keep me\n");

    await createNotebook(root);

    assert.equal(await readFile(path.join(notebook, "context.md"), "utf8"), "Keep me\n");
    assert.match(await readFile(path.join(notebook, "index.md"), "utf8"), /Project Notebook/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("notebook contains flat transient work and decisions directories", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-test-"));
  try {
    await createNotebook(root);

    await readFile(path.join(root, ".repo-notebook", "work", ".gitkeep"));
    await readFile(path.join(root, ".repo-notebook", "decisions", ".gitkeep"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("adds and replaces the instruction block while preserving surrounding content", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-test-"));
  try {
    const packageData = await loadPackageData();
    const instruction = path.join(root, "AGENTS.md");
    await writeFile(instruction, "# Existing\n\nKeep this.\n");

    await addInstruction(root, "AGENTS.md", packageData);
    let contents = await readFile(instruction, "utf8");
    assert.match(contents, /# Existing/);
    assert.match(contents, /Keep this\./);
    assert.match(contents, /repo-notebook:start/);

    await writeFile(instruction, `${contents}\nAfter block.\n`);
    await addInstruction(root, "AGENTS.md", packageData);
    contents = await readFile(instruction, "utf8");
    assert.equal(contents.match(/repo-notebook:start/g).length, 1);
    assert.match(contents, /After block\./);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("writes an installation marker", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-test-"));
  try {
    const packageData = await loadPackageData();
    await writeInstallMarker(root, packageData, [".agents"], true, ["AGENTS.md"]);
    const marker = JSON.parse(await readFile(path.join(root, ".repo-notebook-install.json"), "utf8"));
    assert.equal(marker.version, packageData.version);
    assert.deepEqual(marker.locations, [".agents"]);
    assert.equal(marker.notebook, ".repo-notebook");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
