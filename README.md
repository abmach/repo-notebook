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
- **Bootstrap** — analyze an existing repository and propose an initial notebook with developer confirmation.
- **Thin installer** — install the skills into supported harness locations with explicit consent.

## Install

Use the consent-aware initializer with any supported package runner:

```sh
bun x repo-notebook init
yarn dlx repo-notebook init
npx repo-notebook init
```

`yarn dlx` requires Yarn Berry (Yarn 2 or later); Yarn Classic has no `dlx` command.

The installer:

1. finds the Git repository root;
2. in a terminal, offers an arrow-key multiselect of the supported harness
   locations (`.agents`, `.claude`, `.omp`, `.opencode`) with locations whose
   instruction file already exists preselected;
3. asks (with an explicit default) before creating `.repo-notebook/`;
4. asks (checkbox, all preselected) before adding or updating the
   always-read instruction file (`AGENTS.md` or `CLAUDE.md`);
5. shows a summary and asks for final confirmation before installing the
   skills and recording the installed version in
   `.repo-notebook-install.json`.

With piped stdin/stdout (CI, scripts, tests) the interactive prompts fall
back to the original line-based questions with identical text and meaning,
so both paths stay compatible.

Explicit flags also count as consent and use the same arguments across all supported runners:

```sh
<package-runner> repo-notebook init --location .agents --notebook --instruction AGENTS.md
```

Unknown flags fail without installing anything. Interactive mode asks before creating notebook files or modifying instruction files.

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
