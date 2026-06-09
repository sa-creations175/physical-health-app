import Dexie, { type Table } from 'dexie';
import {
  DEFAULT_CARDIO_THRESHOLD_MINUTES,
  DEFAULT_BUNDLE_CONFIG,
  DEFAULT_DAILY_ACTIVITY_TARGETS,
  DEFAULT_MOBILITY_LINKS_JSON,
  DASHBOARD_SECTION_KEYS,
  DEFAULT_DASHBOARD_SECTION_CONFIG,
  DEFAULT_FITNESS_CARD_CONFIG,
} from '../lib/defaults';
import type {
  Session,
  Exercise,
  SessionExercise,
  SetEntry,
  CardioType,
  CardioLog,
  DeliveryDay,
  BundleLog,
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
  delivery_days!: Table<DeliveryDay, string>;
  bundle_logs!: Table<BundleLog, string>;
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
    //
    // ⚠ NOTE FOR FUTURE READERS: v4's cardio_types index list omitted
    // `name`, which broke the LogCardio picker's `orderBy('name')` query
    // with SchemaError on first paint. Fix landed in v5 (below) — that
    // version is index-only, so no upgrade callback is needed. Leaving
    // this v4 declaration unchanged so any client that briefly opened
    // the app between the v4 release and the v5 fix still walks a clean
    // ladder. Newer code should treat v5 as the floor.
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

    // v5 (Build 2.1 hotfix): add `name` to the cardio_types index list
    // so the LogCardio picker's `orderBy('name')` query resolves.
    // Index-only change — Dexie auto-rebuilds the indexes on upgrade,
    // no callback needed. All other stores stay byte-identical to v4.
    this.version(5).stores({
      sessions: 'id, user_id, type, date, created_at',
      exercises: 'id, user_id, name, muscle_group, last_used_at',
      session_exercises: 'id, session_id, exercise_id, order_index',
      sets: 'id, session_exercise_id, set_number, created_at',
      cardio_types: 'id, user_id, name, last_used_at',
      cardio_logs: 'id, user_id, started_at, created_at',
      nutrition_logs: 'id, user_id, date',
      supplements: 'id, user_id, active',
      health_checkins: 'id, user_id, type',
      goals: 'id, user_id, pillar, parent_goal_id',
      prompts: 'id, user_id, type, fired_at, dismissed_at',
      user_preferences: 'id, user_id',
    });

    // v6: add cardio_logs.distance_miles for distance-eligible cardio
    // types (Run / Bike / Walk / Hike / Row). Non-indexed column;
    // backfill on upgrade so consumer code can treat the field as
    // always-present, with null meaning "not measured."
    this.version(6)
      .stores({
        sessions: 'id, user_id, type, date, created_at',
        exercises: 'id, user_id, name, muscle_group, last_used_at',
        session_exercises: 'id, session_id, exercise_id, order_index',
        sets: 'id, session_exercise_id, set_number, created_at',
        cardio_types: 'id, user_id, name, last_used_at',
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
          .table('cardio_logs')
          .toCollection()
          .modify((row: { distance_miles?: number | null }) => {
            if (row.distance_miles === undefined) row.distance_miles = null;
          });
      });

    // v7 (Build 2.2): add `notes` to session_exercises so each exercise
    // inside an active session can carry a free-form note (e.g. form
    // cue, equipment swap). Non-indexed column; backfill to null on
    // upgrade so consumer code can treat the field as always-present,
    // with null meaning "no note." Index list unchanged.
    this.version(7)
      .stores({
        sessions: 'id, user_id, type, date, created_at',
        exercises: 'id, user_id, name, muscle_group, last_used_at',
        session_exercises: 'id, session_id, exercise_id, order_index',
        sets: 'id, session_exercise_id, set_number, created_at',
        cardio_types: 'id, user_id, name, last_used_at',
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
          .table('session_exercises')
          .toCollection()
          .modify((row: { notes?: string | null }) => {
            if (row.notes === undefined) row.notes = null;
          });
      });

    // v8 (Build 2.3): new `delivery_days` store powering the
    // "no-delivery streak" dashboard card. One row per user per day,
    // present only when the user has actively marked the day. Absence
    // of a row = unmarked. Indexed on user_id + date so weekly + streak
    // queries don't scan. New store has no rows on upgrade, so no
    // backfill hook is needed — every other store stays byte-identical.
    this.version(8).stores({
      sessions: 'id, user_id, type, date, created_at',
      exercises: 'id, user_id, name, muscle_group, last_used_at',
      session_exercises: 'id, session_id, exercise_id, order_index',
      sets: 'id, session_exercise_id, set_number, created_at',
      cardio_types: 'id, user_id, name, last_used_at',
      cardio_logs: 'id, user_id, started_at, created_at',
      delivery_days: 'id, user_id, date',
      nutrition_logs: 'id, user_id, date',
      supplements: 'id, user_id, active',
      health_checkins: 'id, user_id, type',
      goals: 'id, user_id, pillar, parent_goal_id',
      prompts: 'id, user_id, type, fired_at, dismissed_at',
      user_preferences: 'id, user_id',
    });

    // v9 (Build 2.4): daily bundle (calisthenics) tracker.
    // - bundle_logs: new store, one row per user per day, created lazily the
    //   first time any of the three exercises is logged that date. Indexed on
    //   user_id + date so the week query + streak scan don't table-scan. New
    //   store has no rows on upgrade, so it needs no backfill — but the
    //   user_preferences six new bundle_* fields DO, so this version carries
    //   an upgrade hook that seeds them on the existing single prefs row.
    this.version(9)
      .stores({
        sessions: 'id, user_id, type, date, created_at',
        exercises: 'id, user_id, name, muscle_group, last_used_at',
        session_exercises: 'id, session_id, exercise_id, order_index',
        sets: 'id, session_exercise_id, set_number, created_at',
        cardio_types: 'id, user_id, name, last_used_at',
        cardio_logs: 'id, user_id, started_at, created_at',
        delivery_days: 'id, user_id, date',
        bundle_logs: 'id, user_id, date',
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
          .modify(
            (row: {
              bundle_pushup_target?: number;
              bundle_abroll_target?: number;
              bundle_calfraise_target?: number;
              bundle_pushup_increment?: number;
              bundle_abroll_increment?: number;
              bundle_calfraise_increment?: number;
            }) => {
              if (row.bundle_pushup_target === undefined) {
                row.bundle_pushup_target = DEFAULT_BUNDLE_CONFIG.pushup_target;
              }
              if (row.bundle_abroll_target === undefined) {
                row.bundle_abroll_target = DEFAULT_BUNDLE_CONFIG.abroll_target;
              }
              if (row.bundle_calfraise_target === undefined) {
                row.bundle_calfraise_target =
                  DEFAULT_BUNDLE_CONFIG.calfraise_target;
              }
              if (row.bundle_pushup_increment === undefined) {
                row.bundle_pushup_increment =
                  DEFAULT_BUNDLE_CONFIG.pushup_increment;
              }
              if (row.bundle_abroll_increment === undefined) {
                row.bundle_abroll_increment =
                  DEFAULT_BUNDLE_CONFIG.abroll_increment;
              }
              if (row.bundle_calfraise_increment === undefined) {
                row.bundle_calfraise_increment =
                  DEFAULT_BUNDLE_CONFIG.calfraise_increment;
              }
            },
          );
      });

    // v10 (Build 2.5): dashboard reorder + section customization. Two new
    // user_preferences columns store the section display order and per-section
    // { label, visible } config as JSON strings (Dexie columns are scalar).
    // Index list unchanged; upgrade hook seeds the two strings on the existing
    // single prefs row. Fresh installs get them via buildDefaultPreferences.
    this.version(10)
      .stores({
        sessions: 'id, user_id, type, date, created_at',
        exercises: 'id, user_id, name, muscle_group, last_used_at',
        session_exercises: 'id, session_id, exercise_id, order_index',
        sets: 'id, session_exercise_id, set_number, created_at',
        cardio_types: 'id, user_id, name, last_used_at',
        cardio_logs: 'id, user_id, started_at, created_at',
        delivery_days: 'id, user_id, date',
        bundle_logs: 'id, user_id, date',
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
          .modify(
            (row: {
              dashboard_section_order?: string;
              dashboard_section_config?: string;
            }) => {
              if (row.dashboard_section_order === undefined) {
                row.dashboard_section_order = JSON.stringify(DASHBOARD_SECTION_KEYS);
              }
              if (row.dashboard_section_config === undefined) {
                row.dashboard_section_config = JSON.stringify(
                  DEFAULT_DASHBOARD_SECTION_CONFIG,
                );
              }
            },
          );
      });

    // v11 (Build 2.6): mobility / flexibility tracking. user_preferences gains
    // three fields (weekly day target, qualifying-minute threshold, saved
    // links JSON); bundle_logs gains mobility_minutes (null = not logged).
    // Index list unchanged; upgrade hook backfills both tables on their
    // existing rows. Fresh installs seed prefs via buildDefaultPreferences and
    // create bundle rows with mobility_minutes already present.
    this.version(11)
      .stores({
        sessions: 'id, user_id, type, date, created_at',
        exercises: 'id, user_id, name, muscle_group, last_used_at',
        session_exercises: 'id, session_id, exercise_id, order_index',
        sets: 'id, session_exercise_id, set_number, created_at',
        cardio_types: 'id, user_id, name, last_used_at',
        cardio_logs: 'id, user_id, started_at, created_at',
        delivery_days: 'id, user_id, date',
        bundle_logs: 'id, user_id, date',
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
          .modify(
            (row: {
              bundle_mobility_target?: number;
              bundle_mobility_min_minutes?: number;
              bundle_mobility_youtube_links?: string;
            }) => {
              if (row.bundle_mobility_target === undefined) {
                row.bundle_mobility_target = DEFAULT_BUNDLE_CONFIG.mobility_target;
              }
              if (row.bundle_mobility_min_minutes === undefined) {
                row.bundle_mobility_min_minutes =
                  DEFAULT_BUNDLE_CONFIG.mobility_min_minutes;
              }
              if (row.bundle_mobility_youtube_links === undefined) {
                row.bundle_mobility_youtube_links = DEFAULT_MOBILITY_LINKS_JSON;
              }
            },
          );
        await tx
          .table('bundle_logs')
          .toCollection()
          .modify((row: { mobility_minutes?: number | null }) => {
            if (row.mobility_minutes === undefined) row.mobility_minutes = null;
          });
      });

    // v12 (Build 2.7): promote the bundle's weekly qualifying-day target from a
    // hardcoded constant to an editable pref (bundle_target). Single new
    // user_preferences field, backfilled to the default on the existing row.
    // Index list unchanged.
    this.version(12)
      .stores({
        sessions: 'id, user_id, type, date, created_at',
        exercises: 'id, user_id, name, muscle_group, last_used_at',
        session_exercises: 'id, session_id, exercise_id, order_index',
        sets: 'id, session_exercise_id, set_number, created_at',
        cardio_types: 'id, user_id, name, last_used_at',
        cardio_logs: 'id, user_id, started_at, created_at',
        delivery_days: 'id, user_id, date',
        bundle_logs: 'id, user_id, date',
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
          .modify((row: { bundle_target?: number }) => {
            if (row.bundle_target === undefined) {
              row.bundle_target = DEFAULT_BUNDLE_CONFIG.weekly_target;
            }
          });
      });

    // v13 (Build 2.9): Apple Watch workout auto-import. Adds a `source`
    // ('manual' | 'watch' | null) provenance column to cardio_logs, sessions,
    // and bundle_logs, plus `watch_duration_minutes` on bundle_logs for Watch
    // strength workouts that map to the bundle without manual reps. All new
    // columns are non-indexed, so the index lists are byte-identical to v12;
    // the upgrade hook backfills existing rows to null so consumer code can
    // treat the fields as always-present.
    this.version(13)
      .stores({
        sessions: 'id, user_id, type, date, created_at',
        exercises: 'id, user_id, name, muscle_group, last_used_at',
        session_exercises: 'id, session_id, exercise_id, order_index',
        sets: 'id, session_exercise_id, set_number, created_at',
        cardio_types: 'id, user_id, name, last_used_at',
        cardio_logs: 'id, user_id, started_at, created_at',
        delivery_days: 'id, user_id, date',
        bundle_logs: 'id, user_id, date',
        nutrition_logs: 'id, user_id, date',
        supplements: 'id, user_id, active',
        health_checkins: 'id, user_id, type',
        goals: 'id, user_id, pillar, parent_goal_id',
        prompts: 'id, user_id, type, fired_at, dismissed_at',
        user_preferences: 'id, user_id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('sessions')
          .toCollection()
          .modify((row: { source?: 'manual' | 'watch' | null }) => {
            if (row.source === undefined) row.source = null;
          });
        await tx
          .table('cardio_logs')
          .toCollection()
          .modify((row: { source?: 'manual' | 'watch' | null }) => {
            if (row.source === undefined) row.source = null;
          });
        await tx
          .table('bundle_logs')
          .toCollection()
          .modify(
            (row: {
              source?: 'manual' | 'watch' | null;
              watch_duration_minutes?: number | null;
            }) => {
              if (row.source === undefined) row.source = null;
              if (row.watch_duration_minutes === undefined) {
                row.watch_duration_minutes = null;
              }
            },
          );
      });

    // v14 (Build 2.11): Fitness Score on Home. Adds three daily activity
    // targets to user_preferences — daily_steps_target, daily_calories_target,
    // daily_exercise_minutes_target. Steps + calories were previously hardcoded
    // in the Apple Watch card; the score now reads all three live. Non-indexed
    // scalar columns, so the index lists are identical to v13; the upgrade hook
    // backfills the existing row with the defaults.
    this.version(14)
      .stores({
        sessions: 'id, user_id, type, date, created_at',
        exercises: 'id, user_id, name, muscle_group, last_used_at',
        session_exercises: 'id, session_id, exercise_id, order_index',
        sets: 'id, session_exercise_id, set_number, created_at',
        cardio_types: 'id, user_id, name, last_used_at',
        cardio_logs: 'id, user_id, started_at, created_at',
        delivery_days: 'id, user_id, date',
        bundle_logs: 'id, user_id, date',
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
          .modify(
            (row: {
              daily_steps_target?: number;
              daily_calories_target?: number;
              daily_exercise_minutes_target?: number;
            }) => {
              if (row.daily_steps_target === undefined) {
                row.daily_steps_target = DEFAULT_DAILY_ACTIVITY_TARGETS.steps;
              }
              if (row.daily_calories_target === undefined) {
                row.daily_calories_target =
                  DEFAULT_DAILY_ACTIVITY_TARGETS.calories;
              }
              if (row.daily_exercise_minutes_target === undefined) {
                row.daily_exercise_minutes_target =
                  DEFAULT_DAILY_ACTIVITY_TARGETS.exercise_minutes;
              }
            },
          );
      });

    // v15 (Build 2.12): Fitness page card show/hide. One new user_preferences
    // column (fitness_card_config) stores per-card { label, visible } as a JSON
    // string (Dexie columns are scalar). Index list unchanged; the upgrade hook
    // seeds the string on the existing single prefs row. Fresh installs get it
    // via buildDefaultPreferences. Full Body is hidden by default.
    this.version(15)
      .stores({
        sessions: 'id, user_id, type, date, created_at',
        exercises: 'id, user_id, name, muscle_group, last_used_at',
        session_exercises: 'id, session_id, exercise_id, order_index',
        sets: 'id, session_exercise_id, set_number, created_at',
        cardio_types: 'id, user_id, name, last_used_at',
        cardio_logs: 'id, user_id, started_at, created_at',
        delivery_days: 'id, user_id, date',
        bundle_logs: 'id, user_id, date',
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
          .modify((row: { fitness_card_config?: string }) => {
            if (row.fitness_card_config === undefined) {
              row.fitness_card_config = JSON.stringify(
                DEFAULT_FITNESS_CARD_CONFIG,
              );
            }
          });
      });
  }
}

export const db = new PhysicalHealthDB();
