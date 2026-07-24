# GAME_STATUS.md — How to Use It

**File location (game repo):** `docs/GAME_STATUS.md`  
**Purpose:** Single living document that records what is built, what is in progress, and what remains — in enough detail that both humans and AI assistants stay aligned.

This guide is written for **developers and AI coding assistants** working on the game. DevelopmentOS reads this file on every Git push and keeps the project board in sync.

---

## Required every session (AI coding assistants)

**If you changed game code, you MUST update `docs/GAME_STATUS.md` before push.** A push with code but no status update is incomplete work.

For **every feature you touched**, add or update a `## Feature Name` section that includes **all four** of these:

| # | Required | What to write |
|---|----------|----------------|
| 1 | **Status line** | `**Status:**` — one honest sentence: what works now and what does not |
| 2 | **Session comment** | At least one `> …` blockquote with what you did, tested, and what is next |
| 3 | **Checklist** | Concrete `- [ ]` / `- [x]` / `- [~]` items — add new steps when you discover them |
| 4 | **Checkbox updates** | Mark `[x]` only for steps you verified; use `[~]` for partial work |

### Minimum block (copy this shape)

```markdown
## Feature Name

**Status:** [~] Short honest summary of current state.

> YYYY-MM-DD: What I changed, what I tested, what the next person should do.

**Implementation**
- [x] Step that is done and verified
- [~] Step started but not finished
- [ ] Step not started yet

**Validation**
- [ ] Tested in fresh save
- [ ] Tested after load (if persistence matters)
```

### Do not skip comments

Comments are **not optional decoration**. They sync to the DevelopmentOS card as real comments via Souls.

Always add a session comment when you:
- Finish or partially finish work on a feature
- Find a bug or regression
- Leave something blocked or unclear
- Change files another AI should know about

If you only update checkboxes with no comment, the next session loses **why** things changed.

### End-of-session checklist (mandatory)

Before every commit/push:

- [ ] `docs/GAME_STATUS.md` updated
- [ ] Every touched feature has a `##` section
- [ ] Every touched feature has a **Status** line
- [ ] Every touched feature has at least one **`>` session comment**
- [ ] Checklist items added for new work discovered during the session
- [ ] Finished steps marked `[x]`; partial steps marked `[~]`
- [ ] `GAME_STATUS.md` included in the **same push** as the code

---

## Why this file matters

`GAME_STATUS.md` is not a one-time design doc. It is the **running production log** of the game.

If something is finished in code but not reflected here, the team loses track. If checklists are missing, nobody can tell whether a feature is truly done or only half-implemented. If progress is not written down, the next AI session or teammate has to rediscover the same context.

**Rule of thumb:** If you built it, tested it, or changed how it works — update `GAME_STATUS.md` before you push.

---

## Relationship to DevelopmentOS

| Layer | Role |
|-------|------|
| **DevelopmentOS boards** | Structured cards, lists, milestones, checklists, ownership |
| **`docs/GAME_STATUS.md`** | Human-readable truth in the game repo; updated as you work |
| **Souls (on push)** | Reads `GAME_STATUS.md`, syncs checklists and card status in DevelopmentOS, sends an Inbox summary |

**Souls does not edit `GAME_STATUS.md`.** The game repo owns that file. Souls updates DevelopmentOS when the file changes.

When Souls sees a checkbox marked done in `GAME_STATUS.md` but the matching checklist item is still open in the app, **she marks it complete in DevelopmentOS**. If you reopen a checkbox (`[ ]`), the matching checklist item is unchecked again. Checked items can move dev-board cards toward Done / In Progress.

**Souls can do everything you can do on the board** when asked or when syncing: move cards, change list colors, add comments, add/complete/uncomplete checklist items, and update card status. She does **not** edit `GAME_STATUS.md` in Git — that file stays in the game repo.

---

## Checkbox syntax

Only lines in this format are parsed for sync:

```markdown
- [ ] Not started
- [x] Done
- [~] In progress / partially done
```

| Marker | Meaning | Effect on DevelopmentOS |
|--------|---------|-------------------------|
| `[ ]` | Open / not done | Checklist item stays unchecked |
| `[x]` or `[X]` | Done | Matching checklist item marked complete |
| `[~]` | Partial / WIP | Task tends toward **in progress**; checklist stays open unless also `[x]` |

Use **`[~]`** when you have started but not finished — e.g. core logic works but UI or save/load is missing.

---

## Comments on cards (synced to DevelopmentOS)

Put notes **under the feature’s `##` heading**. They become **comments on the matching card** in DevelopmentOS when you push.

### Supported comment formats

```markdown
## Tree Chopping

> Fall direction fixed. Still needs chopping sound before milestone close.

!comment Tested on fresh save — depletion does not persist after load yet.

- [x] Trees can be chopped
```

| Format | Example |
|--------|---------|
| Blockquote | `> Your note here` |
| Directive | `!comment Your note here` |
| HTML (optional) | `<!-- @comment: Your note here -->` |

**Rules for comments:**
- Must sit **under** a `## Feature Name` section (same title as the board card).
- One blockquote line = one comment. Duplicate text is not added twice.
- Comments appear on the card with a `[GAME_STATUS.md]` prefix so you know the source.
- Use comments for session notes, blockers, “what’s next”, and context that does not belong in a checkbox.

**Status line** (optional, not synced as a comment but good for humans/AI):

```markdown
**Status:** [~] Core loop works; audio pass remaining.
```

---

## What to document for every feature

When you build something new (or extend an existing system), **always add checklists**. A feature is not “done” because the code compiles.

### Minimum for each feature block

1. **Clear title** — must match or closely match the DevelopmentOS card title (see naming below).
2. **Status line** — required; one sentence: what works today and what does not.
3. **Session comment** — required; at least one `> …` blockquote per work session on that feature.
4. **Checklist** — required; concrete, testable steps with checkbox state.
5. **Extra notes** — blockers, file paths, follow-ups (can be more blockquotes or `!comment` lines).

### Standard checklist template

Copy and adapt this for every feature:

```markdown
## Tree Chopping

**Status:** Playable in prototype. No polish on fall animation.

> 2026-07-24: Fixed log pickup radius. Next session: chopping sounds.

**Implementation**
- [x] Tree can be targeted and chopped
- [x] Logs spawn and can be picked up
- [ ] Chopping sound variation
- [ ] Save/load preserves depleted trees correctly

**Validation**
- [x] Tested in fresh save
- [ ] Tested after load
- [ ] Edge case: chop while inventory full
```

### Sections to use inside the file

Organize by what helps you navigate — common patterns:

```markdown
# Game Status — Project Name

## Currently in progress          ← meta (not synced as a card)
## Planned next                   ← meta
## Milestone — …                  ← meta (checkboxes still match tasks by title)
## Validation                     ← meta wrapper

## Save and Load Regression       ← dev-board card (synced — needs **Status:**)

# Core Player                     ← Board B system category (not a card)
## Third-Person Movement          ← feature card (synced)
**Status:** Playable.
> 2026-07-24: Session comment syncs to DevelopmentOS.

# Appendix                        ← not synced
## Item reference                 ← appendix tables, not feature cards
```

**Souls sync rules for this structure:**
- Only `## Feature Name` sections with a `**Status:**` line sync comments/checklists to that card.
- **New `## Feature` sections** without a matching DevelopmentOS card → Souls **creates the card** on push (never duplicates — fuzzy title match across all boards first).
- **New checklist lines** under a feature → Souls **adds them to the card** (and marks done/partial from `[x]` / `[~]`).
- **Planned next** checkbox lines (`## Planned next`) → Souls creates **dev board** cards in `Planned` if missing.
- **New system lists** (unknown `# Category`) → Souls creates the list on the systems board when needed.

Legacy single-file layout (feature `##` sections only, no `#` categories) still works.

---

## Checklist and comment discipline (important)

1. **Add checklists when you start** — not when you think you are finished. Break work into small verifiable steps.
2. **Add a session comment every time you work on a feature** — use `> YYYY-MM-DD: …` under that feature’s `##` heading.
3. **Check off as you go** — `[x]` only when that step is truly done and verified.
4. **Use `[~]`** on items that are started but incomplete.
5. **Never mark “done” without validation** — at minimum: works in fresh save; if persistence matters, test after load.
6. **Split large features** — one card in DevelopmentOS per feature; checklist items are the sub-steps.
7. **Link design docs** when relevant — file path or wiki link in a comment or status line.

### Definition of done (for marking `[x]` on a whole feature)

A feature can be treated as complete when:

- Core logic works in-game
- UI/feedback exists where the player needs it
- Save/load works if the feature affects persisted state
- No known blocker for the current milestone
- Acceptance-style checklist items are checked

“Code exists in a branch” is **not** done.

---

## Writing progress for unfinished work

When something is **not** finished, be explicit:

```markdown
## Swimming

**Status:** [~] Basic movement in water works; stamina drain not implemented.

- [x] Enter/exit water volume
- [x] Slow swim movement
- [~] Underwater camera — works but clips on steep shores
- [ ] Stamina consumption while swimming
- [ ] Drowning / oxygen (design TBD)

**Next:** Hook stamina drain to existing sprint system (`player_stamina.gd`).
**Blocked by:** None.
```

Good progress notes answer:

- What works right now?
- What is explicitly not done?
- What should the next person (or AI) do first?
- Any blockers or design decisions pending?

---

## Naming — so sync actually works

DevelopmentOS matches checkbox text to **task titles** and **checklist item titles** using fuzzy matching (similar wording counts).

**Do:**

- Use the same names as on the board when possible: `Tree Chopping`, `Player Save and Load`
- Keep checklist item text stable once created in DevelopmentOS
- Prefer clear English titles consistent with board cards

**Avoid:**

- Renaming features every session without updating the board
- Vague items like `Fix stuff` or `Misc`
- One giant checkbox for an entire system with no sub-items
- **Near-duplicate titles** on the same board (Souls fuzzy-matches similar names to avoid duplicate cards)

Souls deduplicates by:
1. Exact normalized title match (`Tree Chopping` = `tree chopping`)
2. Fuzzy match when titles share enough words (e.g. `Crafted Consumable Use Effects` ≈ `Add Use Effects to Crafted Consumables`)
3. Search across **all boards** before creating a new card
4. Checklist items use the same fuzzy match before adding a new line

If you add new checklist lines in `GAME_STATUS.md` that do not exist on the card yet, ask Souls (or use DevelopmentOS) to add them with `tasks.checklist.add` so the app and file stay aligned.

---

## Workflow for AI coding assistants

Follow this at the **end of every implementation session** (or before every push):

### 1. Before coding

- Read `docs/GAME_STATUS.md` for current truth.
- Find the matching DevelopmentOS card (or note that a new card is needed).

### 2. While coding

- Break work into checklist-sized steps.
- Do not claim a system is complete without running the relevant in-game checks.

### 3. Before commit / push (all required)

- [ ] Update `docs/GAME_STATUS.md`
- [ ] Add or update a `##` section for every feature you touched
- [ ] Add or update the **Status** line on each touched feature
- [ ] Add at least one **session comment** (`> …`) on each touched feature
- [ ] Mark finished checklist items `[x]` and partial items `[~]`
- [ ] Add new checklist lines for work discovered during the session
- [ ] Commit `GAME_STATUS.md` in the **same push** as the code

### 4. After push

- Souls runs automatically if `GAME_STATUS.md` changed.
- Check DevelopmentOS **Inbox** for Souls’ summary.
- Confirm board cards and checklists match what you wrote.

### 5. If DevelopmentOS is out of date

Tell Souls explicitly, for example:

> “Sync checklists from GAME_STATUS for Swimming and Tree Chopping — several items are checked in the file but not in the app.”

Souls can:

- `tasks.checklist.complete` — mark items done
- `tasks.checklist.add` — add missing items
- `tasks.upsert` — create/update cards with checklists
- Move cards to the correct list/status when progress is clear

Souls **must not** edit `GAME_STATUS.md` in the game repo. Humans and coding AIs own that file.

---

## What Souls does on Git push

When `docs/GAME_STATUS.md` is included in a pushed commit:

1. Reads the file from GitHub at that commit.
2. Matches each `## Section` to a DevelopmentOS card by title.
3. Syncs `[ ]` / `[x]` / `[~]` lines to that card’s checklist (including unchecking).
4. Adds blockquote / `!comment` lines as **card comments**.
5. Updates checklist completion and dev-board status/list when appropriate.
6. Sends an **Inbox notification** (English) summarizing what was reviewed and what changed.
7. May suggest manual edits to `GAME_STATUS.md` in the notification — those are recommendations only.

If the board is still wrong after auto-sync, ask Souls in chat to repair it — she can move cards, fix colors, and align checklists manually.

Sync does **not** run if the file was not part of the push.

---

## Example: full feature entry

```markdown
## Campfire Building

**Status:** Playable. Placement ghost works; needs audio pass.

> 2026-07-24: Wired build confirmation flow. Tested placement ghost in fresh save. Next: build sound + save/load persistence test.

**Design:** See `docs/design/crafting-and-campfire.md`

**Implementation**
- [x] Campfire recipe unlocked at start
- [x] Placement preview ghost
- [x] Resource cost deducted on build
- [x] Campfire interactable for crafting submenu
- [~] Build VFX — placeholder particles only
- [ ] Build confirmation sound
- [ ] Save/load: built campfires persist

**Validation**
- [x] Build with full inventory of materials
- [x] Cannot build without materials
- [ ] Build near settlement hearth boundary
- [ ] Load game with multiple campfires placed

**Files:** `campfire_building.gd`, `settlement/building_ghost.gd`

**Follow-ups:** Polish card on Dev board — “Campfire build audio and VFX”
```

---

## Quick reference card

| Action | Where | Required? |
|--------|--------|-----------|
| Record what was built | `docs/GAME_STATUS.md` | Yes — every session with code changes |
| Status line per feature | `**Status:**` under `##` | Yes |
| Session comment per feature | `> …` blockquote under `##` | Yes |
| Track cards, lists, milestones | DevelopmentOS | Yes (via sync or Souls) |
| Mark sub-steps complete | Checklists in file + app | Yes when verified |
| Partial work | `[~]` + honest Status line | Yes when applicable |
| After push | Read Souls Inbox in DevelopmentOS |
| Fix app drift | Ask Souls to sync checklists from file |
| New feature | New card + checklist in DevelopmentOS **and** new section in file |

---

## For project leads

- Review `GAME_STATUS.md` every major session — same cadence as the “Update Game Status Document” dev card.
- Keep milestone focus visible at the top of the file.
- Treat missing checklists **or session comments** as a process failure: add them before more scope lands.
- One push with code + status update is always better than two pushes where the board lags behind reality.

---

*This guide lives in DevelopmentOS at `next-app/content/guides/game-status-guide.md`. Copy or link it from the game repo if helpful (e.g. `docs/GAME_STATUS_GUIDE.md`).*
