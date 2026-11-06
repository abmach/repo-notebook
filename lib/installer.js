import { access, cp, mkdir, readFile, writeFile } from "node:fs/promises";
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

export async function installSkills(root, location, packageData) {
  const destination = path.join(root, location, "skills");
  await mkdir(destination, { recursive: true });

  for (const skill of packageData.skills) {
    const source = path.join(packageRoot, "skills", skill);
    const target = path.join(destination, skill);
    await cp(source, target, { recursive: true, force: true });
  }
}

export async function createNotebook(root) {
  const destination = path.join(root, notebookDirectory);
  await mkdir(destination, { recursive: true });
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
  const existing = (await exists(destination))
    ? await readFile(destination, "utf8")
    : "";
  const block = packageData.instructionTemplate.trim();

  const startMarker = "<!-- repo-notebook:start -->";
  const endMarker = "<!-- repo-notebook:end -->";
  const start = existing.indexOf(startMarker);
  const end = existing.indexOf(endMarker);

  let updated;
  if (start !== -1 && end !== -1 && end > start) {
    updated = `${existing.slice(0, start)}${block}${existing.slice(end + endMarker.length)}`;
  } else {
    const separator = existing.length === 0 ? "" : existing.endsWith("\n\n") ? "" : existing.endsWith("\n") ? "\n" : "\n\n";
    updated = `${existing}${separator}${block}\n`;
  }

  await writeFile(destination, updated, "utf8");
}

export async function writeInstallMarker(root, packageData, selectedLocations, notebookCreated, instructionFiles) {
  const destination = path.join(root, ".repo-notebook-install.json");
  const payload = {
    version: packageData.version,
    installedAt: new Date().toISOString(),
    skills: packageData.skills,
    locations: selectedLocations,
    notebook: notebookCreated ? notebookDirectory : null,
    instructions: instructionFiles,
  };

  await writeFile(destination, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function pathExists(target) {
  return exists(target);
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
