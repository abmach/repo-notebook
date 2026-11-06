---
name: bootstrap
description: Use this skill when adopting Repo Notebook in an existing repository or refreshing its initial durable context. It analyzes repository structure, terminology, conventions, current behavior, technical choices, and history, then proposes evidence-backed glossary, context, principle, decision, system, and stack records for developer confirmation.
license: MIT
---

# Bootstrap the notebook

Build an accurate, minimal starting point for the project's durable context. Discovery proposes; the developer confirms.

## Inspect the project

1. Resolve the project root. Prefer the Git repository root; otherwise use the current working directory.
2. Read existing guidance and documentation before proposing duplicates: `AGENTS.md`, `CLAUDE.md`, `README.md`, architecture documents, contribution guides, API documentation, and existing notebooks.
3. Inspect source structure and representative code. Use configuration and lockfiles to identify the current stack.
4. Inspect relevant Git history for decisions that would surprise a future contributor, but do not invent rationale from commit messages alone.
5. Identify existing external issue tooling or tracker configuration only as environment evidence; do not add tracker configuration to the notebook.

## Propose a minimal set

Consider these durable artifacts, but create only those with confirmed content:

- `context.md` — purpose, scope, architecture, and relationships;
- `glossary.md` — project-specific canonical terms;
- `principles.md` — load-bearing rules visible in code or confirmed by the developer;
- `decisions/` — consequential choices supported by evidence or explicit developer confirmation;
- `system.md` — current user-visible capabilities and contracts;
- `stack.md` — current project-specific technical choices and architecture.

Do not seed generic technology preferences, testing doctrine, or design doctrine. The repository's actual choices are authoritative. Propose a rule only when project-specific evidence supports it.

## Confirm candidates in batches

Present candidates with evidence and a concrete destination. Use these options:

- **apply as proposed**;
- **edit** the developer's wording;
- **skip**;
- **skip the remaining candidates** for that artifact.

Prefer the developer's exact wording. Mark inferred rationale as inferred. Never write an unconfirmed candidate.

## Create the notebook

After confirmation:

1. Create `.repo-notebook/` only for confirmed artifacts.
2. Use the formats defined by the `capture` skill.
3. Create `.repo-notebook/index.md` as a compact map of the confirmed records.
4. Do not create empty `work/` or `decisions/` directories unless confirmed content requires them.
5. Report what was created, what was skipped, and any unresolved disagreement.

## Refresh safely

If `.repo-notebook/` already exists:

1. Read it before scanning.
2. Identify missing, contradictory, or stale content.
3. Propose additions or amendments with evidence.
4. Do not overwrite confirmed records without explicit developer approval.

## Boundaries

- Do not infer durable project truth from generic framework conventions.
- Do not create milestones, plans, issues, or execution state.
- Do not assume an external tracker platform.
- Do not create empty records merely to complete the taxonomy.
