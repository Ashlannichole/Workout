/**
 * Birthday-based age advancement.
 *
 * We deliberately never ask for a birth year — just month/day — so age is
 * kept current by counting how many birthdays have passed since the last
 * confirmed value, not by computing it outright.
 */

/** How many birthdays fell strictly after `ageUpdatedAt`, up through `today`. */
export function birthdaysElapsed(ageUpdatedAt, birthMonth, birthDay, today = new Date()) {
  if (!ageUpdatedAt || !birthMonth || !birthDay) return 0
  const since = new Date(ageUpdatedAt)
  if (Number.isNaN(since.getTime())) return 0

  let count = 0
  for (let year = since.getFullYear(); year <= today.getFullYear(); year++) {
    const bday = new Date(year, birthMonth - 1, birthDay)
    if (bday > since && bday <= today) count++
  }
  return count
}
