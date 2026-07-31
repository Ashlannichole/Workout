/**
 * Manual exercise substitution.
 *
 * Reuses the generator's own building blocks rather than re-filtering the
 * library from scratch: resolveForEquipment/movementFamily already know how
 * to find an equipment-compatible variant and how to group same-pattern
 * exercises. A same-family swap is already handled automatically by
 * equipment resolution, so this picker only offers genuinely different
 * movement patterns.
 */

import { EXERCISES, EXERCISE_BY_ID, ACTIVITY_LEVELS, setsRepsFor } from '../data/exercises.js'
import { resolveForEquipment, movementFamily } from './generator.js'

const MAX_CANDIDATES = 6

function maxDifficultyFor(activityLevel) {
  return ACTIVITY_LEVELS.find((l) => l.id === activityLevel)?.maxDifficulty ?? 2
}

/** Alternatives for one exercise, ranked by muscle-group overlap, capped. */
export function findSubstitutes({ originalExerciseId, equipment, activityLevel, excludeExerciseIds = [] }) {
  const original = EXERCISE_BY_ID[originalExerciseId]
  if (!original) return []
  const ceiling = maxDifficultyFor(activityLevel)
  const originalFamily = movementFamily(original)
  const exclude = new Set([originalExerciseId, ...excludeExerciseIds])

  const candidates = []
  for (const ex of EXERCISES) {
    if (ex.modality !== original.modality) continue
    if (ex.difficulty > ceiling) continue
    const usable = resolveForEquipment(ex, equipment)
    if (!usable || usable.difficulty > ceiling) continue
    if (exclude.has(usable.id)) continue
    if (movementFamily(usable) === originalFamily) continue
    if (candidates.some((c) => c.id === usable.id)) continue
    candidates.push(usable)
  }

  // Primary-to-primary overlap is the real "same muscle" signal — secondary
  // lists are full of incidental stabilizers (nearly every compound lift
  // lists "core"), so secondary-only overlap would let unrelated exercises
  // (a squat "matching" a row on shared core engagement) through. Secondary
  // overlap only breaks ties among exercises that already share a primary.
  const primaryOverlap = (ex) => ex.primary.filter((m) => original.primary.includes(m)).length
  const overlapScore = (ex) =>
    primaryOverlap(ex) * 2 +
    ex.secondary.filter((m) => original.primary.includes(m) || original.secondary.includes(m)).length

  return candidates
    .filter((ex) => primaryOverlap(ex) > 0)
    .sort((a, b) => overlapScore(b) - overlapScore(a))
    .slice(0, MAX_CANDIDATES)
}

/** Build a session item the same way the generator does. */
export function buildItemFor(exerciseId, goal) {
  const ex = EXERCISE_BY_ID[exerciseId]
  return { exerciseId, ...setsRepsFor(ex, goal) }
}

export function overrideKey(planId, dayId, week) {
  return `${planId}::${dayId}::w${week}`
}

/**
 * A day's exercise list for one specific week, with any per-instance
 * overrides applied. Falls back to the day-template's exercises untouched
 * when nothing has been swapped for that instance. A substituted item
 * carries `originalExerciseId` so callers can offer a revert control and
 * exclude the right ids from a fresh candidate search, without a second
 * lookup against the template.
 */
export function effectiveExercises(day, overridesMap, planId, week, goal) {
  const entry = overridesMap?.[overrideKey(planId, day.id, week)]
  if (!entry) return day.exercises
  return day.exercises.map((item) => {
    const replacement = entry[item.exerciseId]
    return replacement
      ? { ...buildItemFor(replacement, goal), originalExerciseId: item.exerciseId }
      : item
  })
}
