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

Before proposing, read `.repo-notebook/index.md` and every existing record that could cover a candidate. Search by project concept, not only by the proposed filename, and identify the exact existing entry to amend or state that no equivalent entry exists. Do not propose a duplicate when an existing record owns the fact.

Present candidates with evidence and a concrete destination. Use these options:

- **apply as proposed**;
- **edit** the developer's wording;
- **skip**;
- **skip the remaining candidates** for that artifact.

Then wait for the developer's response. **Apply as proposed** approves exactly the displayed proposal; **edit** requires revised wording to be displayed and approved; **skip** changes nothing. Prefer the developer's exact wording. Mark inferred rationale as inferred. Never write, overwrite, amend, or delete an unconfirmed candidate.

## Create the notebook

After confirmation:

1. Create missing artifacts for confirmed candidates and apply only the confirmed amendments to existing artifacts.
2. Use the formats defined by the `capture` skill, including its one-owner-per-fact and amendment rules.
3. Create or update `.repo-notebook/index.md` only as needed to map the confirmed records accurately.
4. Do not create empty `work/` or `decisions/` directories unless confirmed content requires them.
5. Preserve every pre-existing notebook file and directory unless the developer explicitly approves deleting that exact path.
6. Treat dependent edits—such as a decision, an affected current-truth artifact, and an index correction—as one atomic proposal: apply all or none.
7. Report what was created, what was skipped, what was preserved, and any unresolved disagreement.

Skipping a candidate means leaving the existing path unchanged, not deleting it. An empty or placeholder file is still an existing path. For example, do not delete `glossary.md` merely because no glossary candidate was confirmed.

## Refresh safely

If `.repo-notebook/` already exists:

1. Inventory the existing notebook paths and read them before scanning.
2. Identify missing, contradictory, or stale content. Treat **empty** as a content state, not as permission to delete a path.
3. Propose additions or amendments with evidence and show the exact resulting entry or path.
4. Do not overwrite, amend, or delete confirmed records without explicit developer approval of the displayed proposal.
5. Do not delete an existing record or directory during discovery or refresh. Deletion requires a separate explicit proposal that names the exact path and reason, followed by explicit developer approval.
6. Do not settle or remove transient Change Briefs during bootstrap. Use the `scope` and `capture` skills for that workflow; preserve `work/` and its briefs here.
7. After applying approved additions and amendments, run `repo-notebook check` on the notebook. Fold any error it reports into a further proposal; do not report the refresh as complete while a structural error remains.

## Boundaries

- Do not infer durable project truth from generic framework conventions.
- Do not create milestones, plans, issues, or execution state.
- Do not assume an external tracker platform.
- Do not create empty records merely to complete the taxonomy.
- Do not delete or rename pre-existing notebook paths because they are empty, skipped, placeholder-only, or not part of the proposed refresh.
