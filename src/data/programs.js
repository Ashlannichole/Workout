/**
 * Named, curated programs. Each is still built by the same generator Build.jsx
 * uses — personalized to the user's own equipment — so this file only ever
 * carries goal/modality/split metadata, never actual exercises. See
 * `startProgram()` in `src/state/AppContext.jsx` for how one gets instantiated.
 *
 * `frequency` is stored explicitly rather than derived from `split.length`:
 * a daily repeating routine (Morning Mobility, Wind Down) has one day-template
 * scheduled every day, so frequency and split length deliberately differ.
 */
export const PROGRAMS = [
  {
    id: 'push-pull-legs',
    name: 'Push / Pull / Legs',
    tagline: 'The classic 3-day split for building size.',
    goal: 'muscle',
    modality: 'weightlifting',
    weeks: 8,
    frequency: 3,
    durationMin: 45,
    split: [
      { name: 'Push', muscleGroups: ['chest', 'shoulders', 'triceps'] },
      { name: 'Pull', muscleGroups: ['back', 'biceps'] },
      { name: 'Legs', muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'] },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    tagline: 'Four days a week, split top and bottom.',
    goal: 'muscle',
    modality: 'weightlifting',
    weeks: 8,
    frequency: 4,
    durationMin: 45,
    split: [
      { name: 'Upper A', muscleGroups: ['chest', 'back', 'shoulders'] },
      { name: 'Lower A', muscleGroups: ['quads', 'hamstrings', 'glutes'] },
      { name: 'Upper B', muscleGroups: ['shoulders', 'biceps', 'triceps'] },
      { name: 'Lower B', muscleGroups: ['glutes', 'hamstrings', 'calves'] },
    ],
  },
  {
    id: 'full-body',
    name: 'Full Body',
    tagline: 'Three balanced sessions a week. A solid place to start.',
    goal: 'general',
    modality: 'weightlifting',
    weeks: 6,
    frequency: 3,
    durationMin: 45,
    split: [
      { name: 'Full Body A', muscleGroups: ['chest', 'back', 'quads'] },
      { name: 'Full Body B', muscleGroups: ['shoulders', 'hamstrings', 'core'] },
      { name: 'Full Body C', muscleGroups: ['glutes', 'biceps', 'triceps'] },
    ],
  },
  {
    id: 'bro-split',
    name: 'Bro Split',
    tagline: 'One muscle group a day, five days a week.',
    goal: 'muscle',
    modality: 'weightlifting',
    weeks: 12,
    frequency: 5,
    durationMin: 60,
    split: [
      { name: 'Chest', muscleGroups: ['chest'] },
      { name: 'Back', muscleGroups: ['back'] },
      { name: 'Shoulders', muscleGroups: ['shoulders'] },
      { name: 'Legs', muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'] },
      { name: 'Arms', muscleGroups: ['biceps', 'triceps'] },
    ],
  },
  {
    id: 'metabolic-circuit',
    name: 'Metabolic Circuit',
    tagline: 'Short, hard intervals, four days a week.',
    goal: 'fat_loss',
    modality: 'hiit',
    weeks: 6,
    frequency: 4,
    durationMin: 30,
    split: [
      { name: 'Circuit A', muscleGroups: ['full_body'] },
      { name: 'Circuit B', muscleGroups: ['full_body'] },
      { name: 'Circuit C', muscleGroups: ['full_body'] },
      { name: 'Circuit D', muscleGroups: ['full_body'] },
    ],
  },
  {
    id: 'morning-mobility',
    name: 'Morning Mobility',
    tagline: 'A short daily routine to start the day loose.',
    goal: 'general',
    modality: 'stretching',
    weeks: 4,
    frequency: 7,
    durationMin: 10,
    split: [{ name: 'Morning Mobility', muscleGroups: ['full_body', 'back', 'shoulders'] }],
  },
  {
    id: 'posture-reset',
    name: 'Posture Reset',
    tagline: 'A few minutes for the neck, shoulders, and back. Good for desk days.',
    goal: 'general',
    modality: 'stretching',
    weeks: 4,
    frequency: 3,
    durationMin: 10,
    split: [{ name: 'Posture Reset', muscleGroups: ['shoulders', 'back'] }],
  },
  {
    id: 'wind-down',
    name: 'Wind Down',
    tagline: 'Long, slow holds before bed.',
    goal: 'general',
    modality: 'stretching',
    weeks: 4,
    frequency: 7,
    durationMin: 10,
    split: [{ name: 'Wind Down', muscleGroups: ['hamstrings', 'back', 'glutes'] }],
  },
]
