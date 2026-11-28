-- Observatory: generation registry for quality monitoring
-- Stores every generation that enters the Observatory (Galileo runs, production, internal)

CREATE TABLE IF NOT EXISTS observatory_generations (
  id                TEXT PRIMARY KEY,
  source            TEXT NOT NULL,            -- 'galileo', 'production', 'free-preview', 'internal'
  comparison_set    TEXT,                     -- e.g. 'galileo-ws2'
  candidate_id      TEXT,                     -- 'A', 'B', etc.
  candidate_label   TEXT,                     -- 'Baseline (Gemini 2.5 Flash)'
  run_number        TEXT,                     -- '1', '2'
  product_name      TEXT,
  brief_text        TEXT,
  model             TEXT NOT NULL,
  temperature       FLOAT,
  input_tokens      INTEGER,
  output_tokens     INTEGER,
  cost_usd          FLOAT,
  elapsed_ms        INTEGER,
  html_bytes        INTEGER,
  html_content      TEXT NOT NULL,            -- full HTML
  generated_at      TIMESTAMPTZ NOT NULL,
  approval_status   TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  approval_reason   TEXT,
  approved_at       TIMESTAMPTZ,
  approved_by       TEXT,
  quality_score     INTEGER,                  -- 0-100 human score
  quality_notes     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT approval_status_check CHECK (
    approval_status IN ('pending', 'approved', 'rejected')
  )
);

CREATE INDEX IF NOT EXISTS idx_obs_gen_source      ON observatory_generations (source);
CREATE INDEX IF NOT EXISTS idx_obs_gen_set         ON observatory_generations (comparison_set);
CREATE INDEX IF NOT EXISTS idx_obs_gen_model       ON observatory_generations (model);
CREATE INDEX IF NOT EXISTS idx_obs_gen_status      ON observatory_generations (approval_status);
CREATE INDEX IF NOT EXISTS idx_obs_gen_created     ON observatory_generations (generated_at DESC);
