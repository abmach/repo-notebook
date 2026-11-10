import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
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

test("upgrades unmodified packaged skill files and preserves customized files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-test-"));
  try {
    const packageData = await loadPackageData();
    const first = await installSkills(root, ".agents", packageData);
    await writeInstallMarker(root, packageData, [".agents"], false, [], { ".agents": first.hashes });

    const packaged = path.join(root, ".agents", "skills", "bootstrap", "SKILL.md");
    const customized = path.join(root, ".agents", "skills", "context", "SKILL.md");
    const previousPackaged = "Previous packaged bootstrap guidance.\n";
    const customContent = "# Local context customization\n";
    await writeFile(packaged, previousPackaged);
    await writeFile(customized, customContent);

    const markerPath = path.join(root, ".repo-notebook-install.json");
    const marker = JSON.parse(await readFile(markerPath, "utf8"));
    marker.skillHashes[".agents"]["skills/bootstrap/SKILL.md"] = createHash("sha256")
      .update(previousPackaged)
      .digest("hex");
    await writeFile(markerPath, `${JSON.stringify(marker, null, 2)}\n`, "utf8");

    const result = await installSkills(root, ".agents", packageData);
    await writeInstallMarker(root, packageData, [".agents"], false, [], { ".agents": result.hashes });

    const currentSource = path.join(packageData.packageRoot, "skills", "bootstrap", "SKILL.md");
    const currentSourceBytes = await readFile(currentSource);
    assert.deepEqual(await readFile(packaged), currentSourceBytes);
    assert.equal(await readFile(customized, "utf8"), customContent);
    assert.deepEqual(result.preserved, [".agents/skills/context/SKILL.md"]);
    assert.deepEqual(result.replaced, [".agents/skills/bootstrap/SKILL.md"]);

    const updatedMarker = JSON.parse(await readFile(markerPath, "utf8"));
    assert.equal(
      updatedMarker.skillHashes[".agents"]["skills/bootstrap/SKILL.md"],
      createHash("sha256").update(currentSourceBytes).digest("hex"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a corrupt install marker does not overwrite differing skill files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-test-"));
  try {
    const packageData = await loadPackageData();
    await installSkills(root, ".agents", packageData);
    const customized = path.join(root, ".agents", "skills", "bootstrap", "SKILL.md");
    const customContent = "# Local customization\n";
    await writeFile(customized, customContent);
    await writeFile(path.join(root, ".repo-notebook-install.json"), "{not valid json\n");

    const result = await installSkills(root, ".agents", packageData);

    assert.equal(await readFile(customized, "utf8"), customContent);
    assert.deepEqual(result.preserved, [".agents/skills/bootstrap/SKILL.md"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("explicit replacement overwrites customized installed skill files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-test-"));
  try {
    const packageData = await loadPackageData();
    await installSkills(root, ".agents", packageData);
    const customized = path.join(root, ".agents", "skills", "bootstrap", "SKILL.md");
    await writeFile(customized, "# Local customization\n");

    const result = await installSkills(root, ".agents", packageData, { replaceExisting: true });

    assert.match(await readFile(customized, "utf8"), /# Bootstrap the notebook/);
    assert.deepEqual(result.preserved, []);
    assert.deepEqual(result.replaced, [".agents/skills/bootstrap/SKILL.md"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rerunning the installer preserves differing installed skill files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-test-"));
  try {
    const packageData = await loadPackageData();
    await installSkills(root, ".agents", packageData);

    const customized = path.join(root, ".agents", "skills", "bootstrap", "SKILL.md");
    const customContent = "# Custom bootstrap guidance\n\nKeep this local customization.\n";
    await writeFile(customized, customContent);

    const missing = path.join(root, ".agents", "skills", "capture", "references", "artifact-formats.md");
    await rm(missing);

    const result = await installSkills(root, ".agents", packageData);

    assert.equal(await readFile(customized, "utf8"), customContent);
    assert.match(await readFile(missing, "utf8"), /# Durable artifact formats/);
    assert.deepEqual(result.preserved, [".agents/skills/bootstrap/SKILL.md"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rerunning the installer preserves file-directory conflicts", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-test-"));
  try {
    const packageData = await loadPackageData();
    const conflicting = path.join(root, ".agents", "skills", "bootstrap", "SKILL.md");
    await mkdir(conflicting, { recursive: true });

    const result = await installSkills(root, ".agents", packageData);

    const stats = await stat(conflicting);
    assert.equal(stats.isDirectory(), true);
    assert.deepEqual(result.preserved, [".agents/skills/bootstrap/SKILL.md"]);
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

test("writes only valid current baselines for selected skill locations", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-notebook-test-"));
  try {
    const packageData = await loadPackageData();
    const markerPath = path.join(root, ".repo-notebook-install.json");
    const currentHash = "a".repeat(64);
    const otherLocationHash = "b".repeat(64);
    await writeFile(
      markerPath,
      `${JSON.stringify({
        skillHashes: {
          ".agents": {
            "skills/stale/SKILL.md": "c".repeat(64),
            "skills/current/SKILL.md": currentHash,
            "skills/invalid/SKILL.md": "not-a-hash",
          },
          ".claude": { "skills/context/SKILL.md": otherLocationHash },
        },
      }, null, 2)}\n`,
      "utf8",
    );

    await writeInstallMarker(
      root,
      packageData,
      [".agents"],
      false,
      [],
      { ".agents": { "skills/current/SKILL.md": currentHash, "skills/invalid/SKILL.md": 42 } },
    );

    const marker = JSON.parse(await readFile(markerPath, "utf8"));
    assert.deepEqual(marker.skillHashes[".agents"], { "skills/current/SKILL.md": currentHash });
    assert.deepEqual(marker.skillHashes[".claude"], { "skills/context/SKILL.md": otherLocationHash });
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
