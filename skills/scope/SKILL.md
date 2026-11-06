---
name: scope
description: Use this skill when a feature request, bug fix, refactor, or technical change needs brainstorming or a materially clearer scope before implementation. It collaborates with the developer to define purpose, inclusions, non-goals, change points, acceptance conditions, open questions, and consequences, then maintains a transient Change Brief.
license: MIT
---

# Collaborative scope

Collaborate with the developer until the intended change is clear enough to implement. This skill shapes scope; it does not orchestrate execution.

## Choose whether scope work is needed

Use scope work when at least one material uncertainty remains:

- the purpose or desired outcome is unclear;
- more than one plausible interpretation would produce different behavior;
- the boundary between in-scope and out-of-scope work is unclear;
- a change point or affected contract is unknown;
- acceptance cannot be stated observably;
- the request conflicts with recorded project context.

Do not use scope work for a straightforward, well-bounded change whose answers are available in the repository.

## Establish shared understanding

1. Read `.repo-notebook/index.md` and the relevant context, glossary, principles, decisions, current behavior, and active Change Briefs.
2. Inspect the repository before asking questions it can answer.
3. Restate the likely purpose and intended outcome in plain language.
4. Ask only questions whose answers affect scope, behavior, boundaries, or acceptance. Prefer a small number of concrete questions over an exhaustive interview.
5. Probe meaningful alternatives and edge cases only where they could change the implementation.
6. Separate confirmed facts from assumptions and open questions.

## Maintain a Change Brief

Store a Change Brief in `.repo-notebook/work/` while the work is being shaped or implemented. Use a descriptive kebab-case filename, for example `add-user-imports.md`.

Follow [the Change Brief format](references/change-brief.md). A brief is transient working context, not a milestone plan or an execution registry.

Treat `work/` as versioned by default and do not add it wholesale to `.gitignore`. Commit a brief only when the scope needs to remain available to teammates, future sessions, or other agents while the work is active; ignore a specific brief only when it is intentionally private or local.

## Define change points

A **change point** is a place where the implementation can affect established project truth or behavior. Include only applicable points:

- user-visible workflow or interface;
- domain rule or invariant;
- public or internal contract;
- data shape, ownership, or migration;
- integration boundary or external dependency;
- configuration, runtime, deployment, or operational behavior;
- documentation, terminology, glossary, or principle;
- test and verification surface.

For each change point, identify the affected area and the expected consequence. Do not prescribe implementation steps or milestones.

## Settle the work

When the developer considers the scope settled:

1. Promote durable consequences into the appropriate records through the `capture` skill:
   - terms and relationships → glossary or context;
   - enduring constraints → principles;
   - choices that should affect future work → decisions;
   - shipped capabilities and contracts → system behavior;
   - current technical choices → stack.
2. Ensure the brief contains no unique durable rationale that was not promoted.
3. Remove the settled brief from `.repo-notebook/work/`.
4. Do not create a settled-work archive. If the brief was committed, Git history preserves it.

## Boundaries

- Do not create milestones, dependencies, task assignments, retries, or approval gates.
- Do not write code while clarifying scope.
- Do not turn implementation preferences into project-wide principles.
- Do not assume where external issues are tracked.
