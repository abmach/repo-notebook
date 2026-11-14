import { createHash } from "node:crypto";
import { access, copyFile, cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const supportedLocations = Object.freeze({
  ".agents": "AGENTS.md",
  ".claude": "CLAUDE.md",
  ".omp": "AGENTS.md",
  ".opencode": "AGENTS.md",
});

export const notebookDirectory = ".repo-notebook";

export async function loadPackageData() {
  const [manifestText, versionText, instructionText] = await Promise.all([
    readFile(path.join(packageRoot, "templates", "manifest.json"), "utf8"),
    readFile(path.join(packageRoot, "package.json"), "utf8"),
    readFile(path.join(packageRoot, "templates", "instruction.md"), "utf8"),
  ]);

  const manifest = JSON.parse(manifestText);
  const packageJson = JSON.parse(versionText);

  return {
    ...manifest,
    version: packageJson.version,
    instructionTemplate: instructionText,
    packageRoot,
  };
}

export async function findProjectRoot(cwd = process.cwd()) {
  let current = path.resolve(cwd);

  while (true) {
    if (await exists(path.join(current, ".git"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(cwd);
    }
    current = parent;
  }
}

export async function inspectProject(root) {
  const locations = [];

  for (const locationPath of Object.keys(supportedLocations)) {
    const instructionName = supportedLocations[locationPath];
    const instructionPath = path.join(root, instructionName);
    locations.push({
      path: locationPath,
      instructionName,
      instructionExists: await exists(instructionPath),
      skillsExist: await exists(path.join(root, locationPath, "skills")),
    });
  }

  return {
    root,
    notebookExists: await exists(path.join(root, notebookDirectory)),
    locations,
  };
}

export async function installSkills(root, location, packageData, options = {}) {
  const locationDir = path.join(root, location);
  await assertDirectoryTarget(locationDir, `${location} in ${root}`);
  const destination = path.join(locationDir, "skills");
  await assertDirectoryTarget(destination, `${location}/skills`);
  await mkdir(destination, { recursive: true });
  const preserved = [];
  const replaced = [];
  const hashes = {};
  const previousHashes = await readInstalledSkillHashes(root, location);

  for (const skill of packageData.skills) {
    const source = path.join(packageRoot, "skills", skill);
    const target = path.join(destination, skill);
    await copySkillDirectory(source, target, `skills/${skill}`, `${location}/skills/${skill}`, {
      preserved,
      replaced,
      hashes,
      previousHashes,
      replaceExisting: options.replaceExisting === true,
    });
  }

  return { preserved, replaced, hashes };
}

async function copySkillDirectory(source, target, hashTarget, displayTarget, state) {
  await mkdir(target, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    const hashPath = `${hashTarget}/${entry.name}`;
    const displayPath = `${displayTarget}/${entry.name}`;

    if (entry.isDirectory()) {
      const existing = await pathType(targetPath);
      if (existing === "file") {
        state.preserved.push(displayPath);
        continue;
      }
      await mkdir(targetPath, { recursive: true });
      await copySkillDirectory(sourcePath, targetPath, hashPath, displayPath, state);
      continue;
    }

    const existing = await pathType(targetPath);
    if (existing === "directory") {
      state.preserved.push(displayPath);
      continue;
    }

    const sourceContents = await readFile(sourcePath);
    const sourceHash = hashContents(sourceContents);

    if (existing === "file") {
      const targetContents = await readFile(targetPath);
      if (sourceContents.equals(targetContents)) {
        state.hashes[hashPath] = sourceHash;
        continue;
      }

      const targetHash = hashContents(targetContents);
      const previousHash = state.previousHashes[hashPath];
      const isUnmodifiedPackageFile = previousHash !== undefined && targetHash === previousHash;
      if (!state.replaceExisting && !isUnmodifiedPackageFile) {
        state.preserved.push(displayPath);
        if (previousHash !== undefined) {
          state.hashes[hashPath] = previousHash;
        }
        continue;
      }
      state.replaced.push(displayPath);
    }
    await copyFile(sourcePath, targetPath);
    state.hashes[hashPath] = sourceHash;
  }
}

async function readInstalledSkillHashes(root, location) {
  const marker = path.join(root, ".repo-notebook-install.json");
  try {
    const payload = JSON.parse(await readFile(marker, "utf8"));
    return sanitizeHashes(payload.skillHashes?.[location]);
  } catch {
    return {};
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hashContents(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

async function pathType(target) {
  try {
    const stats = await stat(target);
    return stats.isDirectory() ? "directory" : "file";
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

// A file where a directory belongs is a user-visible state (a stale checkout,
// an editor swap file), not a crash: fail with the path that is in the way.
async function assertDirectoryTarget(target, label) {
  const type = await pathType(target);
  if (type === "file") {
    throw new Error(`Cannot install into ${label}: ${target} exists as a file`);
  }
}

export async function createNotebook(root) {
  const destination = path.join(root, notebookDirectory);
  await assertDirectoryTarget(destination, notebookDirectory);
  await mkdir(destination, { recursive: true });
  for (const subdirectory of ["decisions", "work"]) {
    await assertDirectoryTarget(
      path.join(destination, subdirectory),
      `${notebookDirectory}/${subdirectory}`,
    );
  }
  await cp(path.join(packageRoot, "templates", "notebook"), destination, {
    recursive: true,
    force: false,
    errorOnExist: false,
  });
  await mkdir(path.join(destination, "decisions"), { recursive: true });
  await mkdir(path.join(destination, "work"), { recursive: true });
}

export async function addInstruction(root, instructionFile, packageData) {
  const destination = path.join(root, instructionFile);
  const destinationType = await pathType(destination);
  if (destinationType === "directory") {
    throw new Error(`Cannot write ${destination}: path is a directory`);
  }
  const existing = destinationType === "file" ? await readFile(destination, "utf8") : "";
  const block = packageData.instructionTemplate.trim();

  const startMarker = "<!-- repo-notebook:start -->";
  const endMarker = "<!-- repo-notebook:end -->";
  const start = existing.indexOf(startMarker);
  const end = existing.indexOf(endMarker);

  let updated;
  if (start !== -1 && end !== -1 && end > start) {
    updated = `${existing.slice(0, start)}${block}${existing.slice(end + endMarker.length)}`;
  } else if (start !== -1) {
    // Unterminated block: rewrite from the marker to the end of the file, so a
    // half-written block cannot accumulate a duplicate on every run.
    updated = `${existing.slice(0, start)}${block}\n`;
  } else {
    const separator = existing.length === 0 ? "" : existing.endsWith("\n\n") ? "" : existing.endsWith("\n") ? "\n" : "\n\n";
    updated = `${existing}${separator}${block}\n`;
  }

  await writeFile(destination, updated, "utf8");
}

export async function writeInstallMarker(
  root,
  packageData,
  selectedLocations,
  notebookCreated,
  instructionFiles,
  skillHashes = {},
) {
  const destination = path.join(root, ".repo-notebook-install.json");
  let existingSkillHashes = {};
  try {
    const existing = JSON.parse(await readFile(destination, "utf8"));
    if (isRecord(existing.skillHashes)) {
      existingSkillHashes = existing.skillHashes;
    }
  } catch {
    // A missing or invalid marker has no prior baselines.
  }
  const payload = {
    version: packageData.version,
    installedAt: new Date().toISOString(),
    skills: packageData.skills,
    locations: selectedLocations,
    notebook: notebookCreated ? notebookDirectory : null,
    instructions: instructionFiles,
    skillHashes: mergeSkillHashes(existingSkillHashes, skillHashes),
  };

  await writeFile(destination, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function mergeSkillHashes(existing, next) {
  const merged = {};
  for (const [location, hashes] of Object.entries(existing)) {
    const sanitized = sanitizeHashes(hashes);
    if (Object.keys(sanitized).length > 0) {
      merged[location] = sanitized;
    }
  }
  for (const [location, hashes] of Object.entries(next)) {
    const sanitized = sanitizeHashes(hashes);
    merged[location] = sanitized;
  }
  return merged;
}

function sanitizeHashes(hashes) {
  if (!isRecord(hashes)) return {};
  return Object.fromEntries(
    Object.entries(hashes).filter(([, hash]) => typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash)),
  );
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
