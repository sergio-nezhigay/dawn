---
name: shopify-frontend-loop
description: Turn-based verification loop for iterative Shopify Liquid theme work — implement one increment, verify it visually and functionally against a real `shopify theme dev` render in Chrome via claude-in-chrome, report pass/fail with evidence, then stop for the next instruction. Use when building or fixing a theme section/snippet/asset step by step and each step should be checked against a real Liquid render instead of taking Claude's word for it.
---

# Shopify frontend turn-based loop

This is a **turn-based** loop, not an autonomous one: one invocation = one increment of work,
verified end-to-end, then stop. Do not chain into the next task on your own — report and wait
for the user's next prompt. (Contrast with `/loop`, which self-paces across many turns
unattended; this skill is the manual, human-in-the-loop pattern instead.)

This is the Shopify-theme fork of the generic `frontend-loop` skill. The turn discipline is
identical; only the "how do I get a real render to check" step differs, because Liquid is
server-rendered by Shopify, not served from static files.

## Per-turn procedure

1. **Identify acceptance criteria** for this turn — from `LESSON-TASKS.md`/`TASKS.md` if the
   project has one, otherwise from the user's prompt. If the criteria aren't concrete and
   observable (e.g. "make it nicer" instead of "clicking X shows Y"), ask for one concrete
   example before writing code.
2. **Implement the smallest change** that satisfies the criteria — a section, snippet, asset
   CSS/JS file, or schema tweak. Don't fix unrelated bugs or refactor adjacent code — that's a
   different turn. Load `shopify-plugin:shopify-liquid` for Liquid syntax/schema questions rather
   than guessing; don't duplicate that knowledge here. Two hard rules from this repo's
   `CLAUDE.md` that are easy to break mid-edit: never hardcode a section ID (use
   `{{ section.id }}`), and never leave two `{% schema %}` tags in one file.
3. **Start (or reuse) the dev server.** `claude-in-chrome` refuses `file://` URLs, and Liquid
   can't be served as a static file anyway — it needs real server-side rendering. Check first
   whether a `shopify theme dev` process is already running (an existing background task, or a
   listening port from earlier in the session) before starting another one.
   - Run `npm run dev` (this repo's script; falls back to
     `shopify theme dev --store=<store> --theme <id>` if no such script exists) with
     `run_in_background: true`, redirecting output to a log file.
   - Read that log for the actual printed preview URL line. **Don't assume `127.0.0.1:9292`** —
     read the real host:port the CLI prints, since it can differ.
   - Optionally run `shopify theme check` on the changed files first — it's fast and catches
     Liquid/schema syntax errors before spending a browser round-trip on them.
4. **Load browser tools once** (skip if already loaded this session):
   `ToolSearch select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__read_console_messages`
5. **Open the real preview.** `tabs_create_mcp` then `navigate` to the preview URL read in step 3,
   plus whatever path renders the section/page under test (e.g. `/pages/<handle>`).
6. **Exercise the change directly**: click/type whatever the task touched, screenshot
   before/after with `computer`, and pull `read_console_messages` for errors.
   - **Known quirk (click):** the first click right after a fresh `navigate` can silently not
     register in `claude-in-chrome`, even after a `wait` — the screenshot right after will show
     unchanged state. Don't count that alone as a FAIL: click once more and re-screenshot before
     concluding the app itself is broken. If a second identical click also shows no change,
     that's a real bug.
   - **Known quirk (hot reload):** `shopify theme dev` hot-reloads CSS and section-Liquid edits
     in place most of the time, but there are known CLI bugs where this silently fails for some
     file types, and JS asset edits / non-section Liquid (layout, snippets) more often need a
     full reload regardless. If an edit doesn't show up after a brief wait, do **one explicit
     page reload** before treating it as a real failure — same "don't jump to FAIL on the first
     flake" principle as the click quirk, applied to a different flaky layer.
7. **Check against the acceptance criteria explicitly** — element present/absent, exact text
   content, class/state toggled, input value, zero new console errors. A screenshot that "looks
   about right" is not a pass; check the specific thing the task named. Never declare success
   from reading the source code alone — the same agent that wrote the code can't grade it blind.
8. **If it fails, fix and re-check** before reporting anything to the user.
9. **Report and stop.** Give a short PASS/FAIL using the template below, then end the turn.

## Definition-of-done template

```
Task: <what this turn was supposed to do>
Criteria: <the exact observable check>
Preview URL: <the real shopify theme dev URL + path used>
Action taken: <what was clicked/typed in the browser>
Observed: <what the screenshot/console actually showed>
Result: PASS | FAIL (+ what's still broken, if FAIL)
```
