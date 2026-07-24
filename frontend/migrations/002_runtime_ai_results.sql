BEGIN;
CREATE TABLE IF NOT EXISTS prior_auth_runtime_ai_results (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  content TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider = 'openrouter'),
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS prior_auth_runtime_ai_lookup_idx
  ON prior_auth_runtime_ai_results(tenant_id, actor_id, created_at DESC);
COMMIT;
