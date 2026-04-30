import Dexie, { type Table } from 'dexie';
import type {
  Session,
  Exercise,
  SessionExercise,
  SetEntry,
  CardioLog,
  NutritionLog,
  Supplement,
  HealthCheckin,
  Goal,
  PromptRecord,
} from './types';

export class PhysicalHealthDB extends Dexie {
  sessions!: Table<Session, string>;
  exercises!: Table<Exercise, string>;
  session_exercises!: Table<SessionExercise, string>;
  sets!: Table<SetEntry, string>;
  cardio_logs!: Table<CardioLog, string>;
  nutrition_logs!: Table<NutritionLog, string>;
  supplements!: Table<Supplement, string>;
  health_checkins!: Table<HealthCheckin, string>;
  goals!: Table<Goal, string>;
  prompts!: Table<PromptRecord, string>;

  constructor() {
    super('physical_health_db');
    this.version(1).stores({
      sessions: 'id, user_id, type, date, created_at',
      exercises: 'id, user_id, name, muscle_group, last_used_at',
      session_exercises: 'id, session_id, exercise_id, order_index',
      sets: 'id, session_exercise_id, set_number, created_at',
      cardio_logs: 'id, user_id, session_id, created_at',
      nutrition_logs: 'id, user_id, date',
      supplements: 'id, user_id, active',
      health_checkins: 'id, user_id, type',
      goals: 'id, user_id, pillar, parent_goal_id',
      prompts: 'id, user_id, type, fired_at, dismissed_at',
    });

    // v2: add duration_seconds + set_type to sets so a set can represent
    // a timed effort (kettlebell swings, planks, sled push) instead of reps.
    // Indexes unchanged — new fields are non-indexed columns. Upgrade hook
    // backfills existing rows so consumer code can treat both as required.
    this.version(2)
      .stores({
        sessions: 'id, user_id, type, date, created_at',
        exercises: 'id, user_id, name, muscle_group, last_used_at',
        session_exercises: 'id, session_id, exercise_id, order_index',
        sets: 'id, session_exercise_id, set_number, created_at',
        cardio_logs: 'id, user_id, session_id, created_at',
        nutrition_logs: 'id, user_id, date',
        supplements: 'id, user_id, active',
        health_checkins: 'id, user_id, type',
        goals: 'id, user_id, pillar, parent_goal_id',
        prompts: 'id, user_id, type, fired_at, dismissed_at',
      })
      .upgrade(async (tx) => {
        await tx
          .table('sets')
          .toCollection()
          .modify((row: { set_type?: string; duration_seconds?: number | null }) => {
            if (row.set_type === undefined) row.set_type = 'reps';
            if (row.duration_seconds === undefined) row.duration_seconds = null;
          });
      });
  }
}

export const db = new PhysicalHealthDB();
