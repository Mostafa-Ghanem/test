CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE sip_extension_seq START 1001;

-- SIP passwords are NOT stored: derived as HMAC(SIP_EXTENSION_SECRET, extension).
CREATE TABLE sip_extensions (
  id serial PRIMARY KEY,
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  extension text UNIQUE NOT NULL DEFAULT nextval('sip_extension_seq')::text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE usage_limits (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  max_concurrent_calls int NOT NULL DEFAULT 1 CHECK (max_concurrent_calls >= 0),
  daily_minute_limit int NOT NULL DEFAULT 60 CHECK (daily_minute_limit >= 0),
  daily_call_limit int NOT NULL DEFAULT 50 CHECK (daily_call_limit >= 0)
);

-- Non-secret provider metadata only. Upstream SIP password lives in env vars.
CREATE TABLE provider_accounts (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  adapter text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated','ringing','answered','completed','failed','busy','no_answer')),
  provider text NOT NULL,
  caller_identity_mode text NOT NULL DEFAULT 'private' CHECK (caller_identity_mode IN ('private','verified')),
  demo boolean NOT NULL DEFAULT false,
  dial_token text UNIQUE,
  dial_token_expires_at timestamptz,
  dial_token_used_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration int,
  billable_seconds int NOT NULL DEFAULT 0,
  cost numeric(12,4) NOT NULL DEFAULT 0
);
CREATE INDEX calls_user_started_idx ON calls (user_id, started_at DESC);
CREATE INDEX calls_started_idx ON calls (started_at DESC);

CREATE TABLE call_events (
  id bigserial PRIMARY KEY,
  call_id uuid REFERENCES calls(id) ON DELETE CASCADE,
  idempotency_key text UNIQUE NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target text,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
