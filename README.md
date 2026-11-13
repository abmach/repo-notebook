# Repo Notebook

[![GitLab pipeline](https://gitlab.com/abmach/repo-notebook/badges/main/pipeline.svg)](https://gitlab.com/abmach/repo-notebook/-/pipelines)

**Durable guidance for AI-assisted projects.**

Repo Notebook keeps a project's durable context explicit: its vocabulary and relationships, load-bearing principles, consequential decisions, current behavior, technical choices, and the scope of work currently being shaped.

It is deliberately not an orchestration framework. Modern harnesses already plan, delegate, implement, and verify effectively. Repo Notebook focuses on what those sessions would otherwise forget: why the project is shaped as it is, which boundaries still apply, and what changed.

For this repository, GitLab is the canonical source and GitHub is a read-only distribution mirror. The notebook format is independent of issue-tracker providers.

## What it provides

- **Context** — consult durable project truth before work and reconcile verified behavior afterward.
- **Scope** — collaborate with the developer on purpose, boundaries, change points, and acceptance for features and bug fixes.
- **Capture** — register confirmed terms, principles, decisions, behavior, and technical choices.
- **Bootstrap** — analyze an existing repository and propose an initial notebook with developer confirmation; refreshes preserve existing notebook paths unless deletion is explicitly approved.
- **Thin installer** — install the skills into supported harness locations with explicit consent.
- **Structural check** — lint a notebook for duplicate IDs, broken supersession, and invalid records, with a nonzero exit for CI or a harness.

## Install

Repo Notebook runs the same way however you invoke it: the CLI is a single
`init` (install) and `check` (lint) command. Pick whichever form fits.

### One-off, no install (recommended)

Run the published package directly; nothing is added to the machine or the
project:

```sh
bun x repo-notebook init
yarn dlx repo-notebook init
npx repo-notebook init
```

`yarn dlx` requires Yarn Berry (Yarn 2 or later); Yarn Classic has no `dlx` command.

### Project-local (adds a dev dependency)

Install it as a dev dependency so the version is pinned by the project
lockfile, then run the local binary:

```sh
bun add -d repo-notebook && bun x repo-notebook init
yarn add -D repo-notebook && yarn exec repo-notebook init
npm install -D repo-notebook && npx repo-notebook init
```

Each runner's form: Bun runs a `node_modules/.bin` binary as `bun x <name>`
(or `bun run <name>`); Yarn Berry uses `yarn exec <name>`; npm uses
`npx <name>`. `yarn repo-notebook` is not portable — plain `yarn <name>`
resolves a package.json script, not a binary — so use `yarn exec`.

### Global (available everywhere)

Install the binary on your `PATH` and run `repo-notebook` in any repository:

```sh
bun add -g repo-notebook && repo-notebook init
npm install -g repo-notebook && repo-notebook init
```

`init` must run inside the target repository: it resolves the project root and
writes the notebook and skills there. Global and project-local installs differ
only in where the binary comes from; the effect on the repository is identical.

The installer:

1. finds the Git repository root;
2. in a terminal, offers an arrow-key multiselect of the supported harness
   locations (`.agents`, `.claude`, `.omp`, `.opencode`) with no location
   preselected;
3. asks (with an explicit default) before creating `.repo-notebook/`;
4. asks (checkbox, all preselected) before adding or updating the
   always-read instruction file (`AGENTS.md` or `CLAUDE.md`);
5. shows a summary and asks for final confirmation before installing the
   skills and recording the installed version in
   `.repo-notebook-install.json`.

Re-running the installer records packaged skill-file hashes in
`.repo-notebook-install.json`. When the packaged version changes, an installed
file is replaced only if it still matches the previously packaged hash;
locally modified files are preserved and reported. Use the explicit
`--replace-skills` option to replace differing files deliberately.

With piped stdin/stdout (CI, scripts, tests) the interactive prompts fall
back to the original line-based questions with identical text and meaning,
so both paths stay compatible.

Explicit flags also count as consent and use the same arguments across all supported runners:

```sh
<package-runner> repo-notebook init --location .agents --notebook --instruction AGENTS.md
```

Unknown flags fail without installing anything. Interactive mode asks before creating notebook files or modifying instruction files.

## Check notebook structure

`check` lints a notebook for mechanically decidable problems. It is read-only,
needs no install step beyond the same runner forms above, and exits nonzero when
an error is found so it can gate CI or a harness:

```sh
bun x repo-notebook check
yarn dlx repo-notebook check
npx repo-notebook check
```

It reports, as errors:

- no notebook present at the resolved project root (`E000`) — an absent
  notebook fails rather than passing as "clean";
- duplicate decision IDs (two files declaring the same `id`, including IDs
  that differ only by zero-padding, e.g. `1` vs `0001`);
- `id`/filename-prefix mismatches;
- `superseded_by` pointing at a decision that does not exist;
- a record marked `superseded` with no `superseded_by`;
- an invalid `status` or a missing numeric `id`.

Warnings (non-fatal): an `accepted` record that declares `superseded_by`, and
gaps in the ID sequence. `--strict` fails on warnings too; `--json` prints
machine-readable output.

**`--fix`** applies the mechanical corrections only: align `id:` to the
filename prefix, and renumber duplicate IDs. It never rewrites record bodies.

**`S001` stale candidates** (report-only, never pass/fail): a superseded
decision whose title terms still appear in `system.md` or `stack.md` is
surfaced as a review prompt. This is a deliberate, transparent keyword match,
not a verdict: it never decides whether the claim is actually stale, only that
a human (or the `context` skill) should look. `check` makes no attempt to judge
whether an `accepted` decision *contradicts* current behavior — that semantic
call stays with the agent and the developer.

## The project notebook

A consuming repository owns its notebook:

```text
.repo-notebook/
├── index.md          # Compact map of the notebook
├── context.md        # Purpose, scope, architecture, relationships
├── glossary.md       # Canonical terms and discouraged aliases
├── principles.md     # Load-bearing rules with rationale and provenance
├── decisions/        # Durable choices with rationale and alternatives
├── system.md         # Current shipped capabilities and contracts
├── stack.md          # Current technical choices and architecture
└── work/             # Transient Change Briefs
```

The distinction between curated truth and transient work is deliberate:

- Durable records describe what should continue to influence future work.
- Change Briefs describe what a current feature or fix should change.
- `work/` is versioned by default; do not add it wholesale to `.gitignore`. A specific brief may be ignored only when it is intentionally private or local.
- External issue state remains in the external tracker. Repo Notebook does not presume GitLab, GitHub, Azure DevOps, or any other platform, and does not maintain tracker configuration.

## Skills

Skills follow the open [Agent Skills](https://agentskills.io/specification) format and live under `skills/<skill-name>/SKILL.md`.

| Skill | Role |
| --- | --- |
| `context` | Consult durable context before work and reconcile the implementation afterward. |
| `scope` | Brainstorm material scope questions and maintain a transient Change Brief. |
| `capture` | Record confirmed vocabulary, principles, decisions, behavior, and technical choices. |
| `bootstrap` | Discover an existing project's durable context and propose confirmed records. |

The always-read instruction block provides dependable consultation. Skill descriptions provide semantic activation for specialist work; the installer therefore installs both rather than relying on skill discovery alone.

## Development

```sh
npm run validate

```

Validation checks every skill against the Agent Skills specification, verifies the npm tarball contract, and runs installer tests.

## License

MIT
