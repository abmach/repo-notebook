import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { resolveCli } from "./resolve-cli.mjs";

const root = path.resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const npmCli = await resolveCli("npm-cli.js");
const result = spawnSync(
  process.execPath,
  [npmCli, "pack", "--dry-run", "--json"],
  { cwd: root, encoding: "utf8" },
);
if (result.status !== 0) {
  process.stderr.write(result.stderr ?? "");
  process.stdout.write(result.stdout ?? "");
  process.exit(result.status ?? 1);
}

const payload = JSON.parse(result.stdout);
const metadata = Array.isArray(payload) ? payload[0] : payload[packageJson.name];
if (!metadata?.files) {
  console.error(`Unexpected npm pack output: ${result.stdout}`);
  process.exit(1);
}
const files = metadata.files.map((file) => file.path.replaceAll("\\", "/"));

// Code files are derived from the tree, so a new module is part of the contract
// the moment it exists: if npm does not ship it, the check fails.
async function listJs(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => `${directory}/${entry.name}`)
    .sort();
}

const expected = [
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "package.json",
  "templates/manifest.json",
  "templates/instruction.md",
  "templates/notebook/index.md",
  "templates/notebook/context.md",
  "templates/notebook/glossary.md",
  "templates/notebook/principles.md",
  "templates/notebook/system.md",
  "templates/notebook/stack.md",
  "templates/notebook/decisions/.gitkeep",
  "templates/notebook/work/.gitkeep",
  "skills/bootstrap/SKILL.md",
  "skills/capture/SKILL.md",
  "skills/capture/references/artifact-formats.md",
  "skills/context/SKILL.md",
  "skills/scope/SKILL.md",
  "skills/scope/references/change-brief.md",
  ...(await listJs("bin")),
  ...(await listJs("lib")),
];

const packaged = new Set(files);
const allowedRoot = new Set(["README.md", "LICENSE", "CHANGELOG.md", "package.json"]);
const missing = expected.filter((file) => !packaged.has(file));
const unexpected = files.filter((file) => !expected.includes(file) && !allowedRoot.has(file));
if (missing.length > 0 || unexpected.length > 0) {
  console.error("Package file contract failed.");
  if (missing.length > 0) console.error(`Missing: ${missing.join(", ")}`);
  if (unexpected.length > 0) console.error(`Unexpected: ${unexpected.join(", ")}`);
  process.exit(1);
}

console.log(`Package contains ${files.length} expected consumer files.`);
