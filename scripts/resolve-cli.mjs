import { execFileSync } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

async function whichAll(bin) {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const out = execFileSync(cmd, [bin], { encoding: "utf8" });
    return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// Resolve an npm CLI entrypoint relative to every plausible Node/npm install:
// alongside the current executable, as a sibling lib tree, and via PATH. Bun
// and Node have different execPath layouts, so hardcoding one breaks the other.
export async function resolveCli(entrypoint) {
  const candidates = [];
  if (process.env.npm_execpath) {
    candidates.push(process.env.npm_execpath);
  }
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