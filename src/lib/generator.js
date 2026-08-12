/**
 * Rule-based workout generator.
 *
 * No model calls. The library is tagged well enough that filtering plus a
 * time-budget fill produces a coherent session, and a rule you can read is a
 * rule you can debug when a session comes out wrong.
 *
 * Pipeline:
 *   1. filter    — equipment tier, modality, difficulty ceiling
 *   2. resolve   — swap gym-only lifts for their home alternative when needed
 *   3. rank      — compounds first, then by how well they cover the request
 *   4. fill      — round-robin across the requested muscle groups until the
 *                  time budget runs out
 */

import {
  EXERCISES,
  EXERCISE_BY_ID,
  ACTIVITY_LEVELS,
  timeCostOf,
  setsRepsFor,
} from '../data/exercises.js'

/* Small seeded PRNG so a plan regenerates identically, but two taps of
   "Regenerate" give genuinely different sessions. */
function makeRng(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s >>>= 0
    s ^= s >> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
}

function shuffle(arr, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function maxDifficultyFor(activityLevel) {
  return ACTIVITY_LEVELS.find((l) => l.id === activityLevel)?.maxDifficulty ?? 2
}

/**
 * Return the exercise the user can actually do at this equipment tier,
 * walking the homeAlternativeId chain. Returns null if nothing works.
 */
export function resolveForEquipment(exercise, equipment, seen = new Set()) {
  if (!exercise || seen.has(exercise.id)) return null
  if (exercise.equipment.includes(equipment)) return exercise
  seen.add(exercise.id)
  const alt = exercise.homeAlternativeId ? EXERCISE_BY_ID[exercise.homeAlternativeId] : null
  return alt ? resolveForEquipment(alt, equipment, seen) : null
}

/**
 * Same, but usable if the exercise resolves under ANY of the user's
 * equipment tiers — someone with both a gym and a home setup should see
 * exercises from either, not just whichever tier happened to match first.
 */
export function resolveForAnyEquipment(exercise, tiers) {
  for (const tier of tiers) {
    const usable = resolveForEquipment(exercise, tier)
    if (usable) return usable
  }
  return null
}

/** Warm-up and cool-down are real minutes. Reserve them off the top. */
function reservedSeconds(durationMin) {
  if (durationMin <= 20) return 120
  if (durationMin <= 40) return 240
  return 330
}

/**
 * Two exercises are the same movement family if they resolve to the same
 * terminal substitute. Lat pulldown and banded lat pulldown are one pattern;
 * a session should pick one of them, not both.
 *
 * The substitute chain approximates this well for resistance work, but not for
 * cardio and HIIT, where `homeAlternativeId` only means "something else you can
 * do at home" — rowing and cycling are not the same movement. Those records
 * carry an explicit `family`, which always wins.
 */
export function movementFamily(exercise, seen = new Set()) {
  if (exercise?.family) return exercise.family
  let cur = exercise
  while (cur?.homeAlternativeId && !seen.has(cur.id)) {
    seen.add(cur.id)
    const next = EXERCISE_BY_ID[cur.homeAlternativeId]
    if (!next) break
    cur = next
  }
  return cur?.id ?? exercise.id
}

/** Real sessions run 3–8 movements regardless of how much time is on the clock. */
function exerciseCap(durationMin) {
  return Math.min(8, Math.max(3, Math.round(durationMin / 10)))
}

function candidatesFor({ equipment, modality, activityLevel }) {
  const ceiling = maxDifficultyFor(activityLevel)
  const tiers = Array.isArray(equipment) ? equipment : [equipment]
  const out = []
  for (const ex of EXERCISES) {
    if (ex.modality !== modality) continue
    if (ex.difficulty > ceiling) continue
    const usable = resolveForAnyEquipment(ex, tiers)
    if (!usable) continue
    if (usable.difficulty > ceiling) continue
    if (!out.some((e) => e.id === usable.id)) out.push(usable)
  }
  return out
}

/**
 * Generate one session.
 *
 * @returns {{ exercises: Array, totalSeconds: number, notes: string[] }}
 */
export function generateSession({
  equipment = 'gym',
  modality = 'weightlifting',
  goal = 'general',
  muscleGroups = ['full_body'],
  durationMin = 45,
  activityLevel = 'regular',
  seed = Date.now(),
} = {}) {
  const rng = makeRng(seed)
  const notes = []

  let pool = candidatesFor({ equipment, modality, activityLevel })

  // A narrow combination (bodyweight + weightlifting + calves) can empty the
  // pool. Widen along the least important axis first rather than failing.
  if (pool.length === 0) {
    pool = candidatesFor({ equipment, modality: 'calisthenics', activityLevel })
    if (pool.length) notes.push('Not much fits that modality with your equipment — pulled in calisthenics.')
  }
  if (pool.length === 0) {
    pool = candidatesFor({ equipment, modality, activityLevel: 'athlete' })
    if (pool.length) notes.push('Included some harder movements — scale them down as needed.')
  }
  if (pool.length === 0) return { exercises: [], totalSeconds: 0, notes: ['No exercises match that combination yet.'] }

  const targets = muscleGroups.length ? muscleGroups : ['full_body']

  // Bucket by requested group. Primary match is worth more than secondary.
  const buckets = new Map(targets.map((g) => [g, []]))
  const spillover = []

  for (const ex of pool) {
    let placed = false
    for (const g of targets) {
      if (ex.primary.includes(g)) {
        buckets.get(g).push({ ex, score: 2 })
        placed = true
      }
    }
    if (!placed) {
      for (const g of targets) {
        if (ex.secondary.includes(g)) {
          buckets.get(g).push({ ex, score: 1 })
          placed = true
        }
      }
    }
    if (!placed) spillover.push({ ex, score: 0 })
  }

  // Within each bucket: shuffle for variety, then compounds to the front so
  // the heavy work happens while the user is fresh.
  for (const [g, list] of buckets) {
    const shuffled = shuffle(list, rng)
    shuffled.sort((a, b) => {
      if (a.ex.compound !== b.ex.compound) return a.ex.compound ? -1 : 1
      return b.score - a.score
    })
    buckets.set(g, shuffled)
  }

  const budget = durationMin * 60 - reservedSeconds(durationMin)
  const cap = exerciseCap(durationMin)
  const picked = []
  const usedIds = new Set()
  const usedFamilies = new Set()
  let spent = 0

  // Round-robin across the requested groups so a three-group session doesn't
  // turn into six chest movements.
  let exhausted = false
  while (!exhausted && spent < budget && picked.length < cap) {
    exhausted = true
    for (const g of targets) {
      const list = buckets.get(g)
      const next = list.find(
        (c) => !usedIds.has(c.ex.id) && !usedFamilies.has(movementFamily(c.ex)),
      )
      if (!next) continue
      exhausted = false

      const cost = timeCostOf(next.ex, goal)
      if (spent + cost > budget) {
        // Too big to fit — mark it used so we move past it, but keep scanning
        // in case a shorter movement still fits.
        usedIds.add(next.ex.id)
        continue
      }
      usedIds.add(next.ex.id)
      usedFamilies.add(movementFamily(next.ex))
      picked.push(next.ex)
      spent += cost
      if (spent >= budget || picked.length >= cap) break
    }
  }

  // Short session? Top up from spillover rather than handing back a two-lift day.
  // Still thin? Top up from spillover, and let the family rule go — a second
  // rowing variation beats handing back a two-lift day.
  if (picked.length < 3) {
    const relaxed = [...shuffle(spillover, rng), ...[...buckets.values()].flat()]
    for (const entry of relaxed) {
      const ex = entry.ex ?? entry
      if (usedIds.has(ex.id)) continue
      const cost = timeCostOf(ex, goal)
      if (spent + cost > budget) continue
      usedIds.add(ex.id)
      picked.push(ex)
      spent += cost
      if (picked.length >= Math.min(4, cap)) break
    }
  }

  // Final ordering: compounds first, then everything else in pick order.
  picked.sort((a, b) => (a.compound === b.compound ? 0 : a.compound ? -1 : 1))

  if (picked.length === 0) {
    notes.push('That duration is too short for anything in this filter. Try adding 10 minutes.')
  } else if (picked.length < cap && budget - spent > 8 * 60) {
    notes.push(
      'Ran out of matching exercises before filling the time. Add a muscle group for a fuller session.',
    )
  }

  const exercises = picked.map((ex) => ({
    exerciseId: ex.id,
    ...setsRepsFor(ex, goal),
  }))

  return { exercises, totalSeconds: spent + reservedSeconds(durationMin), notes }
}

/** Human-readable estimate for a built session. */
export function estimateMinutes(exercises, goal) {
  const secs = exercises.reduce((t, item) => {
    const ex = EXERCISE_BY_ID[item.exerciseId]
    return ex ? t + timeCostOf(ex, goal) : t
  }, 0)
  return Math.round(secs / 60)
}
