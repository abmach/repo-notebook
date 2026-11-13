import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

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
const expected = [
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "package.json",
  "bin/repo-notebook.js",
  "lib/installer.js",
  "lib/checker.js",
  "lib/prompts.js",
  "templates/manifest.json",
  "templates/instruction.md",
  "templates/notebook/index.md",
  "templates/notebook/context.md",
  "templates/notebook/glossary.md",
  "templates/notebook/principles.md",
  "templates/notebook/system.md",
  "templates/notebook/stack.md",
  "skills/bootstrap/SKILL.md",
  "skills/capture/SKILL.md",
  "skills/capture/references/artifact-formats.md",
  "skills/context/SKILL.md",
  "skills/scope/SKILL.md",
  "skills/scope/references/change-brief.md",
];

const missing = expected.filter((file) => !files.includes(file));
const forbidden = files.filter((file) => file.startsWith("scripts/") || file.startsWith("test/"));
if (missing.length > 0 || forbidden.length > 0) {
  console.error("Package file contract failed.");
  if (missing.length > 0) console.error(`Missing: ${missing.join(", ")}`);
  if (forbidden.length > 0) console.error(`Unexpected: ${forbidden.join(", ")}`);
  process.exit(1);
}

console.log(`Package contains ${files.length} expected consumer files.`);

async function whichAll(bin) {
  const { execFileSync } = await import("node:child_process");
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const out = execFileSync(cmd, [bin], { encoding: "utf8" });
    return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function resolveCli(entrypoint) {
  const candidates = [];
  if (process.env.npm_execpath) {
    candidates.push(process.env.npm_execpath);
  }
  // Resolve npm relative to every plausible Node/npm install: alongside the
  // current executable, as a sibling lib tree, and via PATH. Bun and Node have
  // different execPath layouts, so hardcoding one breaks the other.
  const exeDir = path.dirname(process.execPath);
  candidates.push(path.join(exeDir, "node_modules", "npm", "bin", entrypoint));
  candidates.push(path.join(exeDir, "..", "lib", "node_modules", "npm", "bin", entrypoint));
  candidates.push(path.join(exeDir, "..", "..", "lib", "node_modules", "npm", "bin", entrypoint));
  candidates.push(path.join("/usr/local/lib/node_modules/npm/bin", entrypoint));
  candidates.push(path.join("/usr/lib/node_modules/npm/bin", entrypoint));
  // Last resort: every `npm` on PATH (a machine may have several shims).
  for (const onPath of await whichAll("npm")) {
    const dir = path.dirname(onPath);
    candidates.push(path.join(dir, "node_modules", "npm", "bin", entrypoint));
    candidates.push(path.join(dir, "..", "lib", "node_modules", "npm", "bin", entrypoint));
  }

  for (const candidate of candidates) {
    try {
      await access(candidate);
      if (path.basename(candidate) === entrypoint) return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  console.error(`Unable to locate ${entrypoint}; run this validator through npm or with Node installed.`);
  process.exit(1);
}
