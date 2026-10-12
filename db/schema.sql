-- Neon PostgreSQL schema (명세서 14장 데이터 모델) — for the upcoming account/sync phase.
-- The current MVP stores data on-device (localStorage); this schema mirrors that shape.
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text,
  timezone text NOT NULL DEFAULT 'Asia/Seoul',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE babies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  birth_date date NOT NULL,
  gender_optional text,
  usual_wake_time time,
  usual_bedtime time,
  daycare_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TYPE sleep_event_type AS ENUM ('WAKE_UP','NAP_START','NAP_END','NIGHT_SLEEP_START','NIGHT_WAKE','BACK_TO_SLEEP');
CREATE TYPE input_method AS ENUM ('BUTTON','VOICE','MANUAL','SYSTEM');
CREATE TABLE sleep_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id uuid NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  event_type sleep_event_type NOT NULL,
  event_time timestamptz NOT NULL,
  input_method input_method NOT NULL DEFAULT 'BUTTON',
  confidence real,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sleep_events_baby_time ON sleep_events (baby_id, event_time);
CREATE TABLE sleep_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id uuid NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  sleep_type text NOT NULL CHECK (sleep_type IN ('NAP','NIGHT')),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sleep_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id uuid NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  prediction_type text NOT NULL,
  predicted_start_min timestamptz NOT NULL,
  predicted_start_max timestamptz NOT NULL,
  confidence real,
  reason text,
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id uuid NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  user_message text NOT NULL,
  assistant_message text NOT NULL,
  context_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
