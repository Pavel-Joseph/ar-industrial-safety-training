# Localization Sheet — AR Industrial Safety Training

Tracks translation keys across supported languages and documents the process for adding new ones.

## Supported languages

| Language | Code | File | Status |
|---|---|---|---|
| English | `en` | `localisation/en.json` | ✅ Complete (baseline) |
| Hindi | `hi` | `localisation/hi.json` | ✅ Complete, visually checked in VS Code |
| Santali | `sa` | `localisation/sa.json` | ⏳ Script decided, translations not started |

## Key naming convention

Keys are namespaced by section, using `section.key_name` in lowercase snake_case:

- `app.*` — app-level strings (title, etc.)
- `menu.*` — navigation/menu items
- `safety.*` — safety warnings and PPE instructions
- `training.*` — training session outcomes

## Current translation keys

| Key | English (`en`) | Hindi (`hi`) | Santali (`sa`) |
|---|---|---|---|
| `app.title` | Industrial Safety Training | औद्योगिक सुरक्षा प्रशिक्षण | — |
| `menu.start_training` | Start Training | प्रशिक्षण शुरू करें | — |
| `menu.settings` | Settings | सेटिंग्स | — |
| `safety.warning` | Warning | चेतावनी | — |
| `safety.danger` | Danger | खतरा | — |
| `safety.stop` | Stop | रुकें | — |
| `safety.wear_helmet` | Wear a safety helmet | सुरक्षा हेलमेट पहनें | — |
| `safety.wear_gloves` | Wear safety gloves | सुरक्षा दस्ताने पहनें | — |
| `safety.wear_goggles` | Wear safety goggles | सुरक्षा चश्मा पहनें | — |
| `training.complete` | Training Complete | प्रशिक्षण पूरा हुआ | — |
| `training.score` | Your Score | आपका स्कोर | — |
| `training.try_again` | Try Again | फिर से प्रयास करें | — |

*(Upcoming: Fire and Gas module-specific strings, per Day 2/Day 4 deliverables — add rows here as those keys are created.)*

## Process for adding a new key

1. Add the key to `en.json` first (English is the source of truth).
2. Add the same key to `hi.json` with the Hindi translation.
3. Update this sheet's table with the new row.
4. Leave the `sa` column as `—` until Santali translations are actually written (see below).
5. Keep keys namespaced consistently — new module strings should use a new section prefix, e.g. `fire.*`, `gas.*`.

## Santali — decision status

**Script: Latin-script transliteration** — decided due to project timeline. Ol Chiki would have required font/glyph rendering setup in Unity that hasn't been tested and there isn't time to validate now.

**Important:** choosing transliteration does not remove the need for a Santali speaker. Safety-warning text still must be written/reviewed by someone who actually speaks Santali — not guessed or machine-translated — since incorrect phonetic spelling in a safety instruction is a real risk. `sa.json` work has **not started** and stays on hold until a reviewer is confirmed.

- Script chosen: **Latin-script transliteration** ✅ (confirmed with team)
- Reviewer/translator: _TBD — still needed_
- Target completion: _TBD (plan originally targeted Day 2 initial strings, Day 5 full review — both now at risk without a reviewer)_