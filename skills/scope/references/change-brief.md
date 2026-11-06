# Change Brief format

A Change Brief captures shared understanding while scope is being shaped or implemented. It lives at `.repo-notebook/work/<descriptive-kebab-case-name>.md`.

```markdown
# <Feature or bug title>

## Purpose

Why this change exists and the outcome it should produce.

## Scope

- <included behavior, change, or boundary>

## Non-goals

- <explicitly excluded work>

## Change points

- **<Area or contract>** — <expected consequence>

## Acceptance

- <observable condition that establishes completion>

## Open questions

- <unresolved question, or "None">

## Decisions

- <durable choice made while shaping this work, with a link when captured>

## Outcome

<Final scope and the durable context records produced by the work.>
```

## Rules

- Use only sections that carry useful information; omit `Non-goals`, `Open questions`, or `Decisions` when empty and not yet needed.
- State acceptance as observable outcomes, not implementation steps.
- Record change points, not tasks.
- Keep implementation detail in the repository and current task, not in the brief.
- Keep the brief transient. When work settles, promote durable consequences and remove the brief.
