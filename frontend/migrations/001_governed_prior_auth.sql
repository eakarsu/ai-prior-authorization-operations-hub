BEGIN;

CREATE TABLE IF NOT EXISTS prior_auth_identities (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','manager','analyst','clinician')),
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS prior_auth_policy_rules (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payer_ref TEXT NOT NULL,
  procedure_code TEXT NOT NULL,
  version TEXT NOT NULL,
  source_uri TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  rules JSONB NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, payer_ref, procedure_code, version)
);

CREATE TABLE IF NOT EXISTS governed_prior_auth_cases (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  member_ref_token TEXT NOT NULL,
  payer_ref TEXT NOT NULL,
  procedure_code TEXT NOT NULL,
  diagnosis_code TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  clinical_reviewer_id TEXT,
  status TEXT NOT NULL DEFAULT 'intake' CHECK (status IN ('intake','evidence_review','needs_information','clinical_review','submission_ready','submission_queued','submitted','payer_error','denied','appeal_review','appeal_ready','appeal_queued','appealed','approved','denied_internal','cancelled','closed')),
  version INTEGER NOT NULL DEFAULT 1,
  urgency TEXT NOT NULL CHECK (urgency IN ('standard','urgent')),
  due_at TIMESTAMPTZ NOT NULL,
  acceptance_criteria JSONB NOT NULL,
  payload_encrypted JSONB NOT NULL,
  encryption_key_version TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_digest TEXT NOT NULL,
  policy_version TEXT,
  payer_receipt TEXT,
  last_provider_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS prior_auth_evidence (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id UUID NOT NULL REFERENCES governed_prior_auth_cases(id),
  evidence_type TEXT NOT NULL,
  evidence_code TEXT NOT NULL,
  source_system TEXT NOT NULL CHECK (source_system IN ('fhir','document_store')),
  source_version TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  content_digest TEXT NOT NULL,
  source_encrypted JSONB NOT NULL,
  encryption_key_version TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, source_system, content_digest)
);

CREATE TABLE IF NOT EXISTS prior_auth_workflow_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id UUID NOT NULL REFERENCES governed_prior_auth_cases(id),
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  reason TEXT,
  correlation_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prior_auth_access_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id UUID,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION immutable_prior_auth_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'prior authorization event is append-only'; END
$$;
DROP TRIGGER IF EXISTS prior_auth_events_immutable ON prior_auth_workflow_events;
CREATE TRIGGER prior_auth_events_immutable BEFORE UPDATE OR DELETE ON prior_auth_workflow_events FOR EACH ROW EXECUTE FUNCTION immutable_prior_auth_event();
DROP TRIGGER IF EXISTS prior_auth_access_immutable ON prior_auth_access_events;
CREATE TRIGGER prior_auth_access_immutable BEFORE UPDATE OR DELETE ON prior_auth_access_events FOR EACH ROW EXECUTE FUNCTION immutable_prior_auth_event();

CREATE TABLE IF NOT EXISTS prior_auth_provider_outbox (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id UUID REFERENCES governed_prior_auth_cases(id),
  provider TEXT NOT NULL CHECK (provider IN ('payer_api','fhir','document_store','messaging')),
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_digest TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','leased','retry','delivered','dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_until TIMESTAMPTZ,
  provider_receipt TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, idempotency_key)
);

CREATE TABLE IF NOT EXISTS prior_auth_provider_events (
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  case_id UUID NOT NULL,
  event_at TIMESTAMPTZ NOT NULL,
  payload_digest TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  outcome TEXT,
  PRIMARY KEY (provider, event_id)
);

CREATE INDEX IF NOT EXISTS prior_auth_identity_login_idx ON prior_auth_identities (tenant_id, lower(email)) WHERE disabled_at IS NULL;
CREATE INDEX IF NOT EXISTS prior_auth_policy_lookup_idx ON prior_auth_policy_rules (tenant_id, payer_ref, procedure_code, effective_at DESC);
CREATE INDEX IF NOT EXISTS governed_prior_auth_queue_idx ON governed_prior_auth_cases (tenant_id, status, due_at, updated_at);
CREATE INDEX IF NOT EXISTS prior_auth_evidence_case_idx ON prior_auth_evidence (tenant_id, case_id, created_at);
CREATE INDEX IF NOT EXISTS prior_auth_provider_claim_idx ON prior_auth_provider_outbox (status, available_at) WHERE status IN ('pending','retry');
CREATE INDEX IF NOT EXISTS prior_auth_provider_events_case_idx ON prior_auth_provider_events (tenant_id, case_id, event_at);
CREATE INDEX IF NOT EXISTS prior_auth_access_lookup_idx ON prior_auth_access_events (tenant_id, case_id, occurred_at DESC);

COMMIT;
