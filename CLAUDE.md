# Connor Health OS — Claude Code Briefing

## What this is
A personal health dashboard PWA built as a **single HTML file** (`index.html`). No framework, no build step, vanilla JS + CSS. Deployed on Vercel. Built entirely for personal use by Connor (born 1997).

**Live goal:** Cut from 221 lbs → 185 lbs via 18:6 intermittent fasting, 190g protein/day, low carb (<80g), Push/Pull/Legs + Full Body gym split 5–6x/week, incline treadmill cardio 3.0mph / 15° / 30 min goal.

---

## Project Structure

```
index.html        — entire app (4700+ lines, CSS + HTML + JS in one file)
api/ai.js         — Vercel serverless proxy for Anthropic API calls
manifest.json     — PWA manifest
vercel.json       — Vercel config (cleanUrls: true)
CLAUDE.md         — this file
```

**Deployment:** Vercel free tier. Set `ANTHROPIC_API_KEY` env var in Vercel dashboard. Every `git push` to main auto-deploys.

**AI model used:** `claude-sonnet-4-20250514` via `/api/ai` proxy endpoint. All AI calls go through `aiCall()` which POSTs to the proxy. The proxy holds the API key — never exposed client-side.

---

## Architecture Decisions

### Single HTML file
Deliberate. No build tooling, no npm, no bundler. Everything is one file so it's easy to deploy, easy to edit, and works as a downloaded file. Do not split into separate files unless specifically asked.

### localStorage data layer
All persistence is `localStorage` with `hx2-` prefix. Two helper functions handle everything:
```js
function ld(key, default)  // load with fallback
function sv(key, value)    // save as JSON
```

**⚠️ Known risk:** iOS Safari evicts localStorage after 7 days of non-use. **Planned migration: Dexie.js (IndexedDB)** — this is the top priority next feature. When doing this migration, replace all `ld()`/`sv()` calls with Dexie async equivalents. All render functions will need to become async.

### Reactivity model
Simple pub/sub. `notify()` fires all subscribers, which re-renders the active tab.
```js
subscribe(() => renderTab(curTab));  // only re-renders visible tab
```
Water taps use targeted DOM updates instead of `notify()` to avoid full re-render.

### Dark theme
All dark screens use `#1c1c1e` background (Home, Meals, Train, Progress, Goals).
- Primary text: `#fff`
- Secondary text: `rgba(255,255,255,0.6–0.75)` — **never go below 0.5 opacity for readable text**
- Accent/red: `#e8341a`
- Card background: `#2c2c2e`
- Deep background: `#111` or `#1c1c1e`
- Typography: `Barlow Condensed` (weights 700–900) for headers/numbers, `Barlow` for body

---

## localStorage Keys Reference

| Key | Type | Description |
|-----|------|-------------|
| `hx2-goals` | Object | `{kcal, protein, carbs, fat, sugar, fastHours, waterGlasses}` |
| `hx2-weight` | Object | `{current, start, goal, history:[{w,date}]}` |
| `hx2-checks` | Object | `{dayKey-index: bool}` — exercise completion |
| `hx2-cardio` | Object | `{dayKey: minutes}` |
| `hx2-favs` | Array | `[{name,kcal,protein,carbs,fat,sugar}]` |
| `hx2-settings` | Object | `{notifs:bool, units:'lbs'}` |
| `hx2-faststart` | Number | Unix timestamp when fast began |
| `hx2-manual-ex` | Object | `{dayKey: [{n,s}]}` — manually added exercises |
| `hx2-wo-groups` | Array | `[{name, exercises:[{n,s}]}]` — saved workout templates |
| `hx2-wo-timer` | Object | `{dayKey: {start,elapsed,running}}` |
| `hx2-pb-log` | Object | `{exerciseName: [{entry,date,timestamp}]}` — personal bests |
| `hx2-log-{dateString}` | Array | `[{name,kcal,protein,carbs,fat,sugar}]` — daily food log |
| `hx2-water-{dateString}` | Number | glasses logged that day |
| `hx2-rest-checks-{dateString}` | Object | Sunday recovery checklist state |
| `hx2-hidden-ex-{dateString}` | Array | scheduled exercise indices hidden today |
| `hx2-edits-ex-{dateString}` | Object | `{index: {n,s}}` — today-only exercise edits |
| `hx2-notif-date` | String | last date notifications were scheduled |
| `hx2-proalert-date` | String | last date protein alert was scheduled |
| `hx2-checkin-date` | String | last date daily check-in was shown |
| `hx2-checkin-answers` | Object | last check-in responses |

**Cleanup:** `dailyReset()` runs on every app open and prunes `hx2-hidden-ex-*` and `hx2-edits-ex-*` keys older than 7 days.

---

## Tab Structure & Render Functions

| Tab | Screen ID | Render Function | Notes |
|-----|-----------|-----------------|-------|
| Home | `screen-overview` | `renderOverview()` | Dark. Sunday = rest day mode with checklist |
| Meals | `screen-meals` | `renderMeals()` | Dark. AI food lookup + local DB fallback |
| Train | `screen-workouts` | `renderWorkouts()` | Dark. Swipe-to-edit cards, PB badges |
| Log | `screen-log` | `renderLog()` | Light cards. Meal timing heatmap |
| Progress | `screen-progress` | `renderProgress()` | Dark. Body recomp score, weekly debrief |
| Goals | `screen-goals` | `renderGoals()` | Dark. Input fields |
| Settings | `screen-settings` | `renderSettings()` | Light. Notifications, data management |

Navigation order is defined in `TAB_ORDER` array. Slide animations use CSS classes `enter-right`, `enter-left`, `exit-right`, `exit-left`.

---

## Workout Schedule

```js
const WO_PLAN = {
  0: Push  (Mon) — Bench, Incline DB, OHP, Lateral Raises, Tricep Pushdowns, Cable Flyes
  1: Pull  (Tue) — Rows, Lat Pulldowns, Seated Cable Row, Face Pulls, Hammer Curls, Rear Delt
  2: Legs  (Wed) — Squat, RDL, Leg Press, Leg Curls, Bulgarian Split, Calf Raises
  3: Push  (Thu) — DB Bench, Cable Flyes, Arnold Press, Lateral Raises, Skull Crushers, Dips
  4: Pull  (Fri) — Deadlift, Pull-Ups, Single Arm Row, Reverse Flyes, Barbell Curls, Shrugs
  5: Full  (Sat) — Goblet Squat, DB Bench, DB Row, OHP, RDL, Plank
  6: null  (Sun) — Rest day
}
```

Exercise check keys: `{todayKey()}-{index}` for scheduled, `{todayKey()}-man-{index}` for manual.

---

## Key Features Built

### Home Tab
- Full-bleed red fasting hero with live timer + progress bar (updates every second via `setInterval`)
- Macro grid (4 columns: KCAL/PROTEIN/CARBS/FAT) with % indicators
- 3-stat row (Glasses / Sets Done / Pro Left)
- Water bar (tap segments, targeted DOM update — no full re-render)
- Hydration velocity: shows pace status during eating window
- Weight sparkline (7-day, shows if you have 2+ weigh-ins)
- Quick-log chips (top 4 saved meals, one-tap log)
- **Sunday rest day mode:** entire home changes to recovery checklist

### Meals Tab
- AI food lookup via `lookupFoodServings()` → local DB first, API fallback
- Local food DB (`FOOD_DB`) covers 30+ common foods, works offline
- Serving picker (3 options returned)
- Star to favorite, one-tap re-log from favorites
- Protein pace indicator (how much protein at current pace by 7PM)
- AI protein suggestions when 20g+ short

### Train Tab
- Day label + workout type header
- Duration timer (start/pause/reset, persists across sessions)
- Incline cardio tracker (3.0mph / 15° / minutes, goal 30min)
- Swipe-left on exercise cards → reveal Edit (blue) + Delete (red)
- Edit sheet: works for both scheduled and manual exercises
- Scheduled exercise edits are today-only overrides (base program unchanged)
- Delete scheduled = hidden today only; delete manual = permanent
- Personal best (PB) log button on each scheduled card
- PB sheet: logs entry, detects PR if new number > previous, fires confetti
- Workout groups: save/load/delete named exercise templates
- `+ Add Exercise` button opens sheet (name + sets + notes)

### Log Tab
- Meal timing heatmap: visual bar showing meals across 1PM–7PM window
- Timeline of all day's events (meals, cardio, fasting, water)
- Day summary card

### Progress Tab
- Body recomp score (0–100): Fasting streak + Protein rate + Workout completion + Weight trend
- Grade label: Starting / Building / Solid / Strong / Elite
- Weekly debrief card: workouts, weight delta, avg protein, streak, bar charts
- Weight hero: current weight, progress bar, milestones (25/50/75/100%)
- Weight trend SVG chart (last 10 entries)
- Weekly calorie bar chart
- 30-day streak grid (tap any day for snapshot)

### Check-in Flow (once per day on first open)
- 5 questions: workload / energy / appetite / training plan / mood
- Ingredient picker grid
- AI generates 3-meal plan based on answers + ingredients
- Accept logs all 3 meals; Skip goes straight to quote
- Scorsese/Tarantino/PTA quote screen before entering app

### Notifications
- Browser push (requires permission)
- Scheduled daily: 1PM (window open), 6:45PM (15 min warning), 7PM (window closed)
- Protein alert at 6:45PM if 50g+ protein still needed
- All scheduled once per day via `scheduleNotifs()`

---

## Patterns & Conventions

### Adding a new feature
1. Add CSS near related styles (dark card styles are grouped together)
2. Add HTML if needed (sheets go before `<script>` tag, above other modals)
3. Add JS functions near related functions
4. Call `notify()` after any data mutation, or do targeted DOM update for performance
5. If adding a new localStorage key, add it to the keys reference above and to `confirmClearAll()`

### Template literals in renderX functions
All render functions build HTML as template literal strings and set `innerHTML`. Inline event handlers use `onclick="functionName()"`. Keep template literals on single lines where possible to avoid escaping issues.

### Apostrophe rule
**Never use apostrophes inside JS template literal strings.** This was a recurring crash bug. Use `&apos;` in HTML or restructure the string. The QUOTES array uses regular strings (not template literals) so apostrophes are fine there.

### Targeted DOM updates vs notify()
- `notify()` → full re-render of active tab. Fine for most things.
- Targeted update → directly mutate specific DOM nodes. Use for: water taps, cardio +/- buttons, any interaction that fires rapidly.

---

## AI Integration

```js
async function aiCall(prompt, maxTokens = 400)
// POSTs to /api/ai (Vercel serverless)
// Returns text content string
// Throws on HTTP error

function pj(text)
// Parses JSON from AI response, strips markdown code fences
// Use after aiCall() when expecting JSON
```

**AI is used for:**
- Food lookup (when not in local DB)
- Protein suggestions
- Daily check-in meal plan generation
- Protein alert notification content

**Always returns JSON** for structured data. System prompt instructs "ONLY valid JSON" with no preamble.

---

## Planned Features (Next Up)

### Priority 1 — Dexie.js Migration
Replace all `localStorage` with IndexedDB via Dexie.js to prevent iOS Safari 7-day eviction.
- Install: `<script src="https://unpkg.com/dexie/dist/dexie.js"></script>`
- Define schema covering all current hx2- keys
- Replace `ld()`/`sv()` with Dexie async calls
- All `renderX()` functions need to become `async`
- Test on iOS Safari specifically

### Priority 2 — Voice Logging
Add mic button to Meals tab food input. Use Web Speech API (no API key needed, built into iOS Safari 15+ and Chrome).
```js
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.onresult = (e) => {
  document.getElementById('food-inp').value = e.results[0][0].transcript;
  addFood();
};
```
Show mic icon next to the Add button. Disable if `!window.SpeechRecognition && !window.webkitSpeechRecognition`.

### Priority 3 — Workout Progression Algorithm
Read PB log entries, parse weight×reps format, suggest next session.
- Parse: `"225×8"` → `{weight: 225, reps: 8}`
- Rule: hit all reps → add 5 lbs. Missed by 1–2 → hold. Missed by 3+ → deload 10%.
- Show suggestion on exercise card: `"Try 230×8 →"`
- Store suggestions in `hx2-progression` key, update after each PB log

### Priority 4 — Service Worker
Cache app shell for true offline support. Queue failed AI calls for retry.
- Cache: `index.html`, fonts, any static assets
- Network-first for `/api/ai`, cache-first for everything else
- Show offline indicator in status bar when no connection

---

## Known Bugs / Watch Out For

- **fast-ring-fill:** old SVG ring element referenced in early clockTick — has been removed/replaced with `fast-progress-fill` bar. If you see `fast-ring-fill` in code, it's dead.
- **Double render on init:** guarded with `_initDone` flag + 50ms timeout. Don't remove this.
- **woTimerInterval:** two `setInterval(tickWoTimer)` calls exist — one in `startWoTimer()` and one IIFE for resuming on load. Both are intentional and safe (IIFE only runs once).
- **done-card opacity:** uses `::after` overlay pseudo-element instead of `opacity` on the card itself. Don't revert to `opacity: 0.55` — it makes exercise cards see-through.
- **Apostrophes in template literals** will silently break the app on iOS Safari. Always escape or restructure.
- **adjCardio()** does targeted DOM update — it looks for `.cm2-val` and `.prog-fill2` directly. If you restructure the cardio card HTML, update these selectors.

---

## Connor's Personal Context

- **Age:** Born 1997
- **Current weight:** 221 lbs → **Goal: 185 lbs**
- **Protocol:** 18:6 IF (eating window 1PM–7PM), ~2200 kcal/day, 190g protein, <80g carbs, <15g sugar
- **Training:** Push/Pull/Legs/Push/Pull/Full Body (Mon–Sat), rest Sunday
- **Cardio:** Incline walk 3.0mph / 15° / goal 30 min every gym day
- **Gym:** Barry's Bootcamp
- **Other projects:** Real estate Meta Ads lead gen, Ravosto (Italian Mediterranean BBQ brand), private chef training, Figma/design work
- **Stack:** Deployed on Vercel, edited via Claude Code or Claude.ai chat
