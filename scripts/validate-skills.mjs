import { spawnSync } from "node:child_process";
import { access, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const skillsRoot = path.join(root, "skills");
const entries = await readdir(skillsRoot, { withFileTypes: true });
const skills = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

if (skills.length === 0) {
  console.error("No skills found.");
  process.exit(1);
}

const npxCli = await resolveCli("npx-cli.js");
for (const skill of skills) {
  const result = spawnSync(
    process.execPath,
    [npxCli, "--yes", "--package", "skills-ref@0.1.5", "skills-ref", "validate", path.join(skillsRoot, skill)],
    { cwd: root, stdio: "inherit" },
  );

  if (result.error) {
    console.error(`Unable to validate ${skill}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Validated ${skills.length} skills.`);

async function resolveCli(entrypoint) {
  const candidates = [];
  if (process.env.npm_execpath) {
    candidates.push(process.env.npm_execpath);
  }
  candidates.push(path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", entrypoint));


  for (const candidate of candidates) {
    if (path.basename(candidate) !== entrypoint) {
      continue;
    }
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  console.error(`Unable to locate ${entrypoint}; run this validator through npm or Bun with Node installed.`);
  process.exit(1);
}
