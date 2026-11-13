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
| Project vocabulary and discouraged aliases | `.repo-notebook/glossary.md` |
| Project purpose, scope boundaries, and domain-level relationships | `.repo-notebook/context.md` |
| Normative enduring constraints | `.repo-notebook/principles.md` |
| Durable choices, rationale, and history | `.repo-notebook/decisions/NNNN-<slug>.md` |
| Observable shipped capabilities and contracts | `.repo-notebook/system.md` |
| Current runtime, framework, persistence, versions, and technical topology | `.repo-notebook/stack.md` |

Use one canonical owner for each fact. Do not copy the same fact into multiple artifacts. A decision retains the historical outcome and rationale; a current-truth artifact states the present outcome. When both reflect the same choice, propose both updates together so they cannot disagree.

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

## Inspect existing records

Before proposing an update:

1. Read `.repo-notebook/index.md` and every existing record that could cover the fact.
2. Search by the project concept, not only by the proposed filename.
3. Identify the exact existing entry to amend, or state that no equivalent entry was found.
4. Maintain one canonical glossary entry, one rule, and one current behavior or technical choice per subject. Amend the identified entry instead of appending a duplicate.
5. Maintain one current accepted decision per choice. When a choice changes, supersede the previous decision rather than rewriting its historical outcome.
6. Before proposing an amendment to a current-truth artifact (`context.md`, `stack.md`, `system.md`, `glossary.md`, `principles.md`), identify the accepted decision that owns that fact. If one exists, the proposal MUST supersede it—create the next decision, mark the old record `superseded` with `superseded_by`, and update the current-truth artifact—all in the same atomic proposal. Amending the current-truth artifact without superseding its owning decision is incomplete: it leaves an `accepted` record contradicting shipped behavior.

## Confirm before writing

For every proposed update:

1. State the evidence: the developer statement, prompt, code, diff, verification result, or history that supports it.
2. Name the target record and show the proposed addition or replacement.
3. Offer **apply**, **edit**, or **skip**, then wait for the developer's response.
4. Treat **apply** as approval of exactly the displayed proposal, **edit** as a request to revise it, and **skip** as no change.
5. For **edit**, use the developer's wording, display the revised proposal, and obtain approval before writing it.
6. Preserve the developer's wording when they supply it.
7. Treat dependent edits—such as a decision, an affected current-truth artifact, and an index correction—as one atomic proposal: apply all or none.

Do not write or delete any notebook record until the developer explicitly approves the displayed proposal. A request to "remember" a fact starts this workflow but does not approve unseen wording.

## Follow artifact rules

Read [the artifact formats](references/artifact-formats.md) before writing.

- Keep glossary definitions short and prefer one canonical term over several synonyms.
- Keep principles load-bearing. Include rationale and provenance so future agents understand the rule.
- Create a durable decision only when it should affect future work. Use `significance: durable` or `architectural`; do not create both a decision log and a parallel ADR system.
- For glossary, principles, context, system, and stack, an amendment replaces the identified existing entry and removes its conflicting old wording.
- Do not rewrite the outcome or rationale of an `accepted` decision to represent a later choice. When a change supersedes an owning decision (see Inspect existing records 6), create the next decision and mark the old record superseded with `superseded_by`, updating every affected current-truth artifact in the same proposal.
- Keep `system.md` in the present tense. Amend only the affected behavior in place; preserve unrelated entries.
- Keep `stack.md` as current truth. Put the reason for a consequential choice in `decisions/`.
- Update `.repo-notebook/index.md` only when its map becomes inaccurate, and include any required index correction in the confirmed proposal.
- Allocate decision IDs at write time. Immediately before writing, enumerate `.repo-notebook/decisions/`, find the highest numeric prefix, and allocate the next unused sequential ID with the existing padding width. Never reuse an ID, including IDs of deprecated or superseded records, and never reuse an ID allocated in an earlier turn: a record proposed before a write is not reserved, so re-enumerate and re-allocate at the moment of writing.

## Reconcile a settled Change Brief

Only the developer may mark a brief settled, and only after the implementation is complete and its acceptance conditions have been verified.

1. Identify its durable consequences.
2. Propose only those consequences and the brief removal together.
3. Delete the brief only after every approved consequence update has been written successfully.
4. If a skipped or deferred consequence has unique durable rationale in the brief, keep the brief unless the developer explicitly approves discarding that rationale.
5. Ensure no unique **durable** rationale remains only in the brief. Promote rationale only when it explains a durable choice; ephemeral implementation rationale may be discarded with the brief.
6. Remove only the settled brief file from `.repo-notebook/work/`, but keep the `work/` directory.

During brief reconciliation, write `system.md` only when evidence shows the capability or contract is present in the shipped product. Write `stack.md` only when the technical choice is already current in the repository or runtime. Accepted scope alone is not evidence of shipped behavior.

Do not create a settled-work archive.

## Boundaries

- Do not silently mutate curated truth.
- Do not invent rationale the developer did not provide; mark an inference as an inference.
- Do not add generic preferences or universal engineering advice as project truth.
- Do not create a second source of truth for external issue state.
