# loredoc.md — How Coding AIs Should Use It

**File location (game repo):** `docs/loredoc.md`  
**Purpose:** Single canonical lore reference for world-building, narrative, factions, regions, characters, and design context — so coding AIs do not invent conflicting canon.

This guide is written for **developers and AI coding assistants** working on the game. The file is **maintained by Souls** from the DevelopmentOS lore library. You read it; you do not own it.

---

## Required every session (when lore matters)

**Before you write or change anything that depends on world canon, read `docs/loredoc.md`.**

That includes:

- Dialogue, quest text, item descriptions, UI flavor text
- Region names, faction names, character names, place names
- Settlement layout, culture, religion, politics, history
- Enemy factions, creature behavior tied to lore, environmental storytelling
- Magic systems, relics, artifacts, and anything labeled "Rekindled" or similar canon terms
- NPC roles, relationships, and motivations

**If you changed game code only** (refactors, bugs, performance) and did not touch narrative or world-facing content, you do not need to re-read the full lore doc — but skim relevant sections if you are unsure.

---

## What this file is for

| Use `loredoc.md` for | Examples |
|----------------------|----------|
| **What the world is** | Regions, settlements, factions, history |
| **Who people are** | Characters, roles, relationships |
| **Why things exist** | Lore reasons for mechanics, items, enemies |
| **Tone and constraints** | What fits Everwood; what would break canon |
| **Naming** | Correct spelling and established terms |

`loredoc.md` is the **story bible export** for the repo. Treat entries marked **canon** as binding unless the team explicitly overrides them in chat.

---

## What this file is NOT for

| Do NOT use `loredoc.md` for | Use instead |
|-----------------------------|-------------|
| Implementation progress | `docs/GAME_STATUS.md` |
| Checklists, task status, "what is built" | `docs/GAME_STATUS.md` |
| Session notes about code you wrote | `docs/GAME_STATUS.md` comments |
| Technical system design (HUD, save format, etc.) | Relevant `docs/*_PLAN.md` or code |
| Creating new permanent canon on your own | DevelopmentOS lore (via team / Souls) |

**Rule:** `GAME_STATUS.md` = *what we built and what is left to build.*  
`loredoc.md` = *what the world is and what is true in it.*

---

## How to read the file

1. **Start at the top** — Souls adds a sync timestamp; stale lore may mean a sync is pending.
2. **Find the entry type** — regions, characters, factions, systems, etc.
3. **Read summary first**, then section headings (`### Overview`, geography, history, …).
4. **Respect canon status** — `draft` may change; treat `canon` as stable unless told otherwise.
5. **Cross-check `GAME_STATUS.md`** — lore tells you *what*; status tells you *whether it is implemented yet*.

If lore says a feature exists in the world but `GAME_STATUS.md` shows it unbuilt, **do not implement from lore alone** — follow the status doc and current milestone unless the user directs otherwise.

---

## What you must NOT do

1. **Do not edit `loredoc.md` to add new canon** during a coding session.  
   New lore belongs in DevelopmentOS. Souls exports it here.

2. **Do not delete or rewrite Souls-maintained sections** to "clean up" — your edit will be overwritten on the next sync.

3. **Do not invent names, factions, or history** when `loredoc.md` already defines them. Use what is written.

4. **Do not copy implementation checklists into lore** or lore prose into `GAME_STATUS.md`.

### If you discover missing lore

While coding, you may find gaps ("What is this settlement called?", "Who leads this faction?").

**Do this:**

1. Note the gap in your `GAME_STATUS.md` session comment or ask the user.
2. **Do not guess** a permanent answer in shipped content.
3. Use a clearly temporary placeholder only if blocked (e.g. `TODO_LORE: faction name`) and flag it.
4. The team adds canon in DevelopmentOS; Souls syncs to `loredoc.md`.

### If you find a lore error in code vs `loredoc.md`

Prefer **loredoc + team confirmation** over old comments in code. Fix code to match canon, or ask the user to update lore in DevelopmentOS first.

---

## Relationship to other docs

```
DevelopmentOS (lore library)  ──Souls export──►  docs/loredoc.md   ← you READ (world truth)
Humans / coding AI            ──edit on push──►  docs/GAME_STATUS.md ← you READ + WRITE (build truth)
```

| Document | Owner | Your job |
|----------|--------|----------|
| `docs/loredoc.md` | Souls (from DevelopmentOS) | Read before narrative/world work |
| `docs/GAME_STATUS.md` | Humans + coding AI | Read every session; update before push |
| `docs/loredoc-guide.md` | Team | Read once; this file |
| `docs/game-status-guide.md` | Team | Read once; rules for status doc |
| Other `docs/*_PLAN.md` | Team | Read when working that system |

---

## Workflow for AI coding assistants

### 1. Start of session

- [ ] Read `docs/GAME_STATUS.md` (always)
- [ ] If the task touches story, names, regions, factions, or player-facing flavor → read relevant sections of `docs/loredoc.md`

### 2. While implementing

- Align names and facts with `loredoc.md`
- If lore is silent, ask or use temporary placeholders — do not invent canon
- Keep world prose out of `GAME_STATUS.md` except brief design notes

### 3. Before push

- [ ] Update `docs/GAME_STATUS.md` (mandatory when code changed)
- [ ] Do **not** commit changes to `loredoc.md` unless the user explicitly asked you to (Souls owns the export)

### 4. After Souls sync

When the team runs **Sync loredoc + GAME_STATUS** in DevelopmentOS, `loredoc.md` updates in Git. Pull before your next lore-heavy session.

---

## Quick reference

| Question | Answer |
|----------|--------|
| Where is world lore? | `docs/loredoc.md` |
| Where is build progress? | `docs/GAME_STATUS.md` |
| Can I edit loredoc? | No — read only (unless user explicitly says otherwise) |
| Missing lore? | Ask / flag — do not invent canon |
| New lore from design chat? | Team adds in DevelopmentOS → Souls syncs here |
| Draft vs canon? | Prefer canon; treat draft as tentative |

---

## For project leads

- Keep DevelopmentOS lore up to date so `loredoc.md` stays trustworthy.
- Run **Sync loredoc + GAME_STATUS** after major lore sessions.
- Copy this guide to the game repo as `docs/loredoc-guide.md` if not already present.

---

*This guide lives in DevelopmentOS at `next-app/content/guides/loredoc-guide.md`. Copy or link it from the game repo (e.g. `docs/loredoc-guide.md`).*
