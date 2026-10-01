# PR Template (English)

Use for international / open-source projects. Fill every section from the actual commits and diff. Delete a section entirely (heading included) when it does not apply — never leave placeholder text or "N/A" filler.

## Title

`<type>: <imperative summary>` — under ~70 characters, lowercase after the colon, no trailing period.
Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`.
If the target repo's recent PR titles follow a different convention (scopes like `feat(api):`, no prefix, ticket keys), follow theirs instead.

Examples:
- `feat: add 500-character limit to prompt input`
- `fix: keep fallback model order when the first model times out`

## Body

```markdown
## Summary

<1–3 sentences: what this PR does and why, from a reviewer's point of view.>

## Changes

- <Behavior-level change, not a file list. Group related edits into one bullet.>
- <...>

## Motivation

<Why this is needed: the bug, the user problem, the linked issue. Skip if Summary already covers it.>

## How to Test

<Commands that were actually run and their result, then manual steps if any.>

- `bun run test` — 23 passed
- <Manual check: steps a reviewer can repeat>

## Screenshots

<UI changes only. Before / after. Delete this section otherwise.>

## Notes for Reviewers

<Trade-offs, follow-ups left out of scope, risky areas, breaking changes, migration steps.>

Closes #<issue>
```

Rules:
- "How to Test" lists only commands that were really executed in this session, with their real outcome. If nothing was run, say so plainly ("Not run locally").
- `Closes #N` only when an issue number is known from the branch name, commits, or the user's request.
