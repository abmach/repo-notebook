---
name: capture
description: Use this skill when durable project knowledge crystallizes and should be recorded with developer confirmation, including glossary terms, principles, consequential decisions, current system behavior, technical choices, or the durable consequences of a Change Brief. Also use when the developer says to remember, register, amend, or supersede project context.
license: MIT
---

# Capture durable context

Record only knowledge that should influence future work. Keep curated truth compact, evidence-backed, and under the developer's control.

## Select the artifact

| Knowledge | Destination |
| --- | --- |
| Canonical term, discouraged alias, scope, relationship | `.repo-notebook/glossary.md` or `context.md` |
| Enduring rule that constrains future work | `.repo-notebook/principles.md` |
| Choice that should affect future work | `.repo-notebook/decisions/NNNN-<slug>.md` |
| Current shipped capability or contract | `.repo-notebook/system.md` |
| Current runtime, framework, persistence, or architecture choice | `.repo-notebook/stack.md` |

Do not create an issue record. External issue state belongs to the external tracker and may be accessed through whatever tools the harness provides.

## Test whether knowledge is durable

Capture a record only when at least one condition applies:

- future work should preserve it;
- it constrains implementation choices;
- it establishes an important boundary;
- it has non-obvious trade-offs;
- changing it later would be costly or disruptive;
- a future contributor would reasonably ask why the alternative was not chosen;
- the developer explicitly asks to remember it.

Do not persist an ephemeral implementation choice. Leave it in code, tests, a transient Change Brief, Git history, or the external tracker.

## Confirm before writing

For every proposed update:

1. State the evidence: the developer statement, prompt, code, diff, verification result, or history that supports it.
2. Name the target record and show the proposed addition or replacement.
3. Offer **apply**, **edit**, or **skip**.
4. Preserve the developer's wording when they supply it.
5. Amend or supersede old records explicitly; do not leave contradictory guidance.

## Follow artifact rules

Read [the artifact formats](references/artifact-formats.md) before writing.

- Keep glossary definitions short and prefer one canonical term over several synonyms.
- Keep principles load-bearing. Include rationale and provenance so future agents understand the rule.
- Create a durable decision only when it should affect future work. Use `significance: durable` or `architectural`; do not create both a decision log and a parallel ADR system.
- Keep `system.md` in the present tense and rewrite affected behavior in place.
- Keep `stack.md` as current truth. Put the reason for a consequential choice in `decisions/`.
- Update `.repo-notebook/index.md` only when its map becomes inaccurate.

## Reconcile a settled Change Brief

When a brief is settled:

1. Identify its durable consequences.
2. Capture only those consequences.
3. Ensure no unique rationale remains only in the brief.
4. Remove the brief from `.repo-notebook/work/`.

Do not create a settled-work archive.

## Boundaries

- Do not silently mutate curated truth.
- Do not invent rationale the developer did not provide; mark an inference as an inference.
- Do not add generic preferences or universal engineering advice as project truth.
- Do not create a second source of truth for external issue state.
