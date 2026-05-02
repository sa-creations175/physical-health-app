import Dexie, { type Table } from 'dexie';
import { DEFAULT_CARDIO_THRESHOLD_MINUTES } from '../lib/defaults';
import type {
  Session,
  Exercise,
  SessionExercise,
  SetEntry,
  CardioType,
  CardioLog,
  NutritionLog,
  Supplement,
  HealthCheckin,
  Goal,
  PromptRecord,
  UserPreferences,
} from './types';

export class PhysicalHealthDB extends Dexie {
  sessions!: Table<Session, string>;
  exercises!: Table<Exercise, string>;
  session_exercises!: Table<SessionExercise, string>;
  sets!: Table<SetEntry, string>;
  cardio_types!: Table<CardioType, string>;
  cardio_logs!: Table<CardioLog, string>;
  nutrition_logs!: Table<NutritionLog, string>;
  supplements!: Table<Supplement, string>;
  health_checkins!: Table<HealthCheckin, string>;
  goals!: Table<Goal, string>;
  prompts!: Table<PromptRecord, string>;
  user_preferences!: Table<UserPreferences, string>;

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

    // v3: add user_preferences. The single row per user is lazy-created on
    // first read by getUserPreferences(); no upgrade hook needed — fresh
    // installs and v2-→-v3 upgrades both rely on the same lazy-create path
    // so there's a single source of seeding logic.
    this.version(3).stores({
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
      user_preferences: 'id, user_id',
    });

    // v4 (Build 2.1): cardio becomes first-class.
    // - cardio_types: new store, seeded with starter activities.
    // - cardio_logs: indexed on started_at (week queries) instead of
    //   session_id, since cardio doesn't always have a parent session.
    //   New columns (cardio_type_id, started_at, updated_at) are non-indexed
    //   for the most part; backfill below ensures consumer code can treat
    //   them as required even on rows that predate the migration.
    // - user_preferences: cardio_threshold_minutes backfilled on the
    //   existing single row.
    this.version(4)
      .stores({
        sessions: 'id, user_id, type, date, created_at',
        exercises: 'id, user_id, name, muscle_group, last_used_at',
        session_exercises: 'id, session_id, exercise_id, order_index',
        sets: 'id, session_exercise_id, set_number, created_at',
        cardio_types: 'id, user_id, last_used_at',
        cardio_logs: 'id, user_id, started_at, created_at',
        nutrition_logs: 'id, user_id, date',
        supplements: 'id, user_id, active',
        health_checkins: 'id, user_id, type',
        goals: 'id, user_id, pillar, parent_goal_id',
        prompts: 'id, user_id, type, fired_at, dismissed_at',
        user_preferences: 'id, user_id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('user_preferences')
          .toCollection()
          .modify((row: { cardio_threshold_minutes?: number }) => {
            if (row.cardio_threshold_minutes === undefined) {
              row.cardio_threshold_minutes = DEFAULT_CARDIO_THRESHOLD_MINUTES;
            }
          });

        // Defensive: no cardio_logs are written in Phase 1 (no logger UI),
        // so this loop is essentially a no-op. Kept as a safety net for
        // any rows injected during dev / testing — they'll get sane
        // timestamps and a placeholder cardio_type_id that the dashboard
        // filters out rather than rendering as a broken row.
        await tx
          .table('cardio_logs')
          .toCollection()
          .modify(
            (row: {
              cardio_type_id?: string;
              started_at?: string;
              updated_at?: string;
              notes?: string | null;
              session_id?: string | null;
              created_at?: string;
            }) => {
              if (row.cardio_type_id === undefined) row.cardio_type_id = '';
              if (row.started_at === undefined) {
                row.started_at = row.created_at ?? new Date().toISOString();
              }
              if (row.updated_at === undefined) {
                row.updated_at = row.created_at ?? new Date().toISOString();
              }
              if (row.notes === undefined) row.notes = null;
              if (row.session_id === undefined) row.session_id = null;
            },
          );
      });
  }
}

export const db = new PhysicalHealthDB();
