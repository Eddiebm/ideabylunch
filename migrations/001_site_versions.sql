-- Site versions: durable storage for approved, purchased website HTML
-- Never expires. Required before any paid delivery can proceed.

CREATE TABLE IF NOT EXISTS site_versions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  html                  TEXT NOT NULL,
  content_hash          CHAR(64) NOT NULL,                           -- SHA-256 of html
  customer_email        TEXT,                                        -- nullable for guest sessions
  session_token_hash    CHAR(64) NOT NULL,                          -- SHA-256 of client session token
  brief                 JSONB NOT NULL DEFAULT '{}',
  selected_style        TEXT NOT NULL DEFAULT 'default',
  generation_model      TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  generation_config     JSONB NOT NULL DEFAULT '{}',
  approval_timestamp    TIMESTAMPTZ NOT NULL DEFAULT now(),
  checkout_session_id   TEXT,                                        -- Stripe session ID or Paystack reference
  payment_intent_id     TEXT,                                        -- populated on delivery claim
  delivery_status       TEXT NOT NULL DEFAULT 'pending',
  delivery_deployment_id TEXT,
  delivery_timestamp    TIMESTAMPTZ,
  delivery_error        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT delivery_status_check CHECK (
    delivery_status IN ('pending', 'claiming', 'delivered', 'failed', 'manual_review')
  )
);

CREATE INDEX IF NOT EXISTS idx_site_versions_checkout  ON site_versions (checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_site_versions_payment   ON site_versions (payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_site_versions_status    ON site_versions (delivery_status);
CREATE INDEX IF NOT EXISTS idx_site_versions_created   ON site_versions (created_at DESC);
