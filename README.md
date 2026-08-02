# Rung

A workout generator and tracker. Answer a few questions, get a session that fits your
equipment, your goal, and the minutes you actually have — then log it and let the app
walk the weight up week by week.

React + Vite. No backend. Deploys to Vercel as a web app; Capacitor is pre-configured
for iOS and Google Play later.

> **The name is a placeholder.** "Rung" ties to the load ladder, the app's core visual.
> To change it, edit `APP_NAME`-adjacent strings in `index.html`, `package.json`,
> `public/manifest.webmanifest`, `capacitor.config.json`, and the `<h1>` in
> `src/screens/Onboarding.jsx`.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/
npm run preview    # serve the production build
node scripts/smoke.mjs   # exercises the generator + progression logic
```

`scripts/smoke.mjs` has no dependencies. It runs the library through all 180
equipment × modality × goal × duration combinations and asserts the progression
engine never produces an unsafe jump. Run it after touching `src/data/exercises.js`
or either file in `src/lib/`.

---

## How it's put together

```
src/
  data/
    exercises.js      69 tagged exercises — the entire content layer
    SCHEMA.md         field contract for a record
  lib/
    generator.js      rule-based session assembly
    progression.js    starting weights, weekly steps, PR weeks
    storage.js        localStorage adapter
  state/
    AppContext.jsx    reducer + persistence + derived helpers
  components/         LoadLadder, RestTimer, TabBar, AppBar, Choice, Icons
  screens/            Onboarding, Today, Build, Plan, Session, History
  styles/
    tokens.css        the whole design system
    global.css        components
```

### The generator is rules, not a model

Four steps, all readable:

1. **Filter** the library by equipment tier, modality, and a difficulty ceiling
   derived from the user's activity level.
2. **Resolve** gym-only lifts to their home alternative by walking
   `homeAlternativeId`, so a "full gym" plan degrades to dumbbells or bodyweight
   instead of just disappearing.
3. **Rank** — compounds first, so the heavy work happens while you're fresh.
4. **Fill** round-robin across the requested muscle groups until the time budget
   runs out, capped at 3–8 movements and one exercise per *movement family*.

Movement families stop a back day from serving you lat pulldown *and* banded lat
pulldown, which is the same pattern twice. Families are inferred from the substitute
chain, except for cardio and HIIT records, which carry an explicit `family` because
"you could do this at home instead" doesn't mean "this is the same movement."

Adding an exercise is a data edit. The generator never special-cases anything.

### Progressive overload has rails

The suggestion logic is deliberately boring, because the failure mode is injury:

- **Week 1** suggests a starting weight from bodyweight × an exercise-specific factor,
  adjusted for training history and sex, then floored at the equipment's real
  minimum — a barbell lift never suggests less than the 45 lb empty bar.
- **Week 2+** adds one `incrementStep`. That field is per-exercise: 10 lb on a squat,
  5 lb on a bench, 2.5 lb on a lateral raise.
- **Isolation lifts step every other week.** Compounds can absorb load weekly;
  a 5 lb lateral raise gaining 2.5 lb every week is 22.5 lb by week 8, which is
  not a program. Isolation progresses on a 2-week cadence instead.
- **Gaps don't stack.** Miss 4+ weeks on a lift and it suggests the last weight you
  actually did, not four increments layered on top.
- **Week 4, 8, 12** flag the lift PR-eligible and *offer* a heavier single. It is
  always dismissible. Nothing in the app requires taking it.

`node scripts/smoke.mjs` prints the full 12-week progression for a bench press and a
lateral raise so you can eyeball whether the numbers look like a real program.

### Storage

Everything lives in `localStorage` under one versioned key, behind `load()` / `save()`
in `src/lib/storage.js`.

**On Supabase:** not worth it yet. v1 has no auth, no sharing, and no second device
to sync to, and adding it now means writing auth screens before the app does anything
useful. The seam is already there — swap the two functions in `storage.js` for async
versions and the components don't change. Revisit when you actually want
cross-device sync or a social feature, which is also roughly when the App Store
build makes it real.

---

## Design

The brief ruled out the two looks that AI-generated apps default to, so the palette
is lifted from somewhere real: **IWF competition plate colour coding**. In a gym,
colour already encodes load — red 25 kg, blue 20 kg, yellow 15 kg, green 10 kg. Rung
keeps that meaning rather than decorating with it:

| Token | Hex | Means |
|---|---|---|
| `--chalk` | `#F2F3F0` | surface — cool-neutral, gym-wall, not cream |
| `--rubber` | `#16181A` | app chrome — flooring, not pure black |
| `--plate-blue` | `#0E4FA3` | primary interactive, current week |
| `--plate-green` | `#1B7F4F` | logged, banked |
| `--plate-yellow` | `#F2C300` | PR-eligible, attention |
| `--plate-red` | `#C6262E` | max effort |

Type is three roles: **Archivo Black** for display (heavy, wide — plate stamping and
meet programs, not a high-contrast serif), **Hanken Grotesk** for body, **Martian
Mono** for every number, because weights and timers should be tabular and instrument-like.

**The signature element is the load ladder.** One rung per week of your plan; height is
that week's load relative to the plan's heaviest, colour is the week's state. Reading it
left to right is reading your progression, which is the entire thesis of the app. Every
other surface stays deliberately quiet so the ladder is the thing you remember.

On the clean-and-fast requirement: logging a set is **one tap**. The weight is
pre-filled by the progression engine, adjusting it is a stepper rather than a keyboard,
and the rest timer docks above the tab bar so it never covers what you're looking at.

---

## Deploying

Already configured: `vercel.json` (framework, SPA rewrite) and `base: './'` in
`vite.config.js`, so the same build works on Vercel *and* inside a Capacitor WebView.

```bash
git init
git add -A
git commit -m "Rung: scaffold, exercise library, generator, progression, UI"
git branch -M main
git remote add origin https://github.com/Ashlannichole/Workout.git
git push -u origin main
```

Then either connect the repo at [vercel.com/new](https://vercel.com/new) — it will
detect Vite and read `vercel.json` — or:

```bash
npx vercel@latest --prod
```

Pushes to `main` redeploy automatically once the repo is linked.

## Adding Capacitor later

`capacitor.config.json` is already written (app id `com.ashlan.rung`, `webDir: dist`).

```bash
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npm run cap:add:ios          # needs macOS + Xcode
npm run cap:ios              # build, sync, open Xcode
```

The CSS already reserves iOS safe areas via `env(safe-area-inset-*)`, and
`index.html` sets `viewport-fit=cover`, so the layout won't collide with the notch or
the home indicator. `/ios` and `/android` are gitignored — they're generated.

Worth adding at that point: `@capacitor/haptics` on set completion, and
`@capacitor/local-notifications` so the rest timer fires with the screen locked.

## Known gaps for v2

- A plan holds one training day. Multi-day splits (push/pull/legs) need
  `plan.days[]` populated with more than one entry — the data model already allows it,
  the Build screen just doesn't create them yet.
- Reps logged per set aren't fed back into the weight suggestion. The honest version of
  progressive overload raises load when you hit the top of the rep range; right now the
  cadence approximates that.
- Weights are lb only. `profile.units` exists but nothing reads it yet.
