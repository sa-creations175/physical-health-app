import type { MuscleGroup } from './types';

export interface StarterExercise {
  name: string;
  muscle_group: MuscleGroup;
  is_compound: boolean;
}

// Seeded on first launch. User can edit, add, or remove from the Library.
export const STARTER_EXERCISES: StarterExercise[] = [
  // Lower body
  { name: 'Back Squat', muscle_group: 'quads', is_compound: true },
  { name: 'Front Squat', muscle_group: 'quads', is_compound: true },
  { name: 'Goblet Squat', muscle_group: 'quads', is_compound: true },
  { name: 'Romanian Deadlift', muscle_group: 'hamstrings', is_compound: true },
  { name: 'Conventional Deadlift', muscle_group: 'full_body', is_compound: true },
  { name: 'Hip Thrust', muscle_group: 'glutes', is_compound: true },
  { name: 'Leg Press', muscle_group: 'quads', is_compound: true },
  { name: 'Bulgarian Split Squat', muscle_group: 'quads', is_compound: true },
  { name: 'Walking Lunge', muscle_group: 'quads', is_compound: true },
  { name: 'Calf Raise', muscle_group: 'calves', is_compound: false },

  // Upper body
  { name: 'Bench Press', muscle_group: 'chest', is_compound: true },
  { name: 'Incline Dumbbell Press', muscle_group: 'chest', is_compound: true },
  { name: 'Overhead Press', muscle_group: 'shoulders', is_compound: true },
  { name: 'Lateral Raise', muscle_group: 'shoulders', is_compound: false },
  { name: 'Cable Lateral Raise', muscle_group: 'shoulders', is_compound: false },
  { name: 'Face Pull', muscle_group: 'shoulders', is_compound: false },
  { name: 'Pull-up', muscle_group: 'back', is_compound: true },
  { name: 'Barbell Row', muscle_group: 'back', is_compound: true },
  { name: 'Dumbbell Row', muscle_group: 'back', is_compound: true },
  { name: 'Lat Pulldown', muscle_group: 'back', is_compound: false },
  { name: 'Seated Cable Row', muscle_group: 'back', is_compound: false },
  { name: 'Bicep Curl', muscle_group: 'biceps', is_compound: false },
  { name: 'Tricep Pushdown', muscle_group: 'triceps', is_compound: false },

  // Core
  { name: 'Plank', muscle_group: 'core', is_compound: false },
  { name: 'Hanging Leg Raise', muscle_group: 'core', is_compound: false },
  { name: 'Ab Wheel', muscle_group: 'core', is_compound: false },
];
