# Exercise library schema

One record per exercise in `src/data/exercises.js`. The generator only ever reads
these fields, so adding an exercise never requires touching generator code.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Stable slug. Used as the key for weight history — **never renumber it**, or users lose their progression on that lift. |
| `name` | `string` | Display name, as a lifter would say it. |
| `primary` | `string[]` | Muscle groups this exercise is selected *for*. The generator matches against this first. |
| `secondary` | `string[]` | Also worked. Used to fill a session out and to avoid stacking redundant work. |
| `equipment` | `string[]` | Which tiers this is available in: `gym`, `home`, `bodyweight`. An exercise listing `bodyweight` is available in all three tiers, so list every tier it works in. |
| `modality` | `string` | One of `weightlifting`, `calisthenics`, `hiit`, `cardio`, `pilates`. |
| `difficulty` | `1 \| 2 \| 3` | 1 beginner, 2 intermediate, 3 advanced. Gated by the user's activity level. |
| `loadType` | `string` | `barbell`, `dumbbell`, `machine`, `cable`, `bodyweight`, `banded`, `timed`. Decides whether we suggest a weight at all, and how we round it. |
| `compound` | `boolean` | Compound lifts get scheduled first in a session, while the user is fresh. |
| `estTimePerSet` | `number` | Seconds of *work* for one set, rest excluded. The time budget adds rest separately, because rest varies by goal. |
| `restSec` | `number` | Default rest between sets, before the goal modifier is applied. |
| `incrementStep` | `number` | lb to add per week under progressive overload. Small for isolation (2.5), larger for compound (5–10). `0` means the lift progresses by reps or time instead of load. |
| `startingLoadFactor` | `number \| null` | Fraction of bodyweight used to suggest a week-1 starting weight. `null` = unloaded. Deliberately conservative; the user can always override. |
| `homeAlternativeId` | `string \| null` | The substitute to swap in when the user has no gym. Resolved by `resolveForEquipment()`. |
| `cue` | `string` | One short form cue, shown on the logging screen. Keeps the user's eyes on the lift instead of a manual. |

## Sets and reps

`setsRepsFor(exercise, goal)` in `exercises.js` returns `{ sets, reps, restSec }`.
Rather than storing a 4×N table on every record, the goal applies a modifier to the
exercise's own defaults:

- **build muscle** — moderate reps, long rest, an extra set on compounds
- **lose fat** — higher reps, short rest, density over load
- **tone** — higher reps, moderate rest
- **general fitness** — middle of the road

## Adding an exercise

1. Give it a stable `id`.
2. List **every** equipment tier it works in, not just the lowest.
3. Set `incrementStep` honestly — a lateral raise that gains 5 lb a week will
   stall or hurt someone by week 4.
4. If it needs a gym, point `homeAlternativeId` at a real substitute that hits the
   same `primary` groups.
