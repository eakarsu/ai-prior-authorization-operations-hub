BEGIN;

ALTER TABLE governed_prior_auth_cases
  ADD COLUMN IF NOT EXISTS service_line TEXT,
  ADD COLUMN IF NOT EXISTS facility_ref TEXT,
  ADD COLUMN IF NOT EXISTS requested_units INTEGER,
  ADD COLUMN IF NOT EXISTS authorized_units INTEGER,
  ADD COLUMN IF NOT EXISTS denial_category TEXT,
  ADD COLUMN IF NOT EXISTS appeal_outcome TEXT,
  ADD COLUMN IF NOT EXISTS decision_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS appeal_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_revenue_at_risk NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovered_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS care_delay_hours INTEGER NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE governed_prior_auth_cases ADD CONSTRAINT governed_prior_auth_service_line_check
    CHECK (service_line IS NULL OR service_line IN ('skilled_nursing','inpatient_rehab','home_health','long_term_acute_care','other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE governed_prior_auth_cases ADD CONSTRAINT governed_prior_auth_units_check
    CHECK ((requested_units IS NULL OR requested_units > 0) AND (authorized_units IS NULL OR authorized_units >= 0));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS prior_auth_case_outcomes (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id UUID NOT NULL REFERENCES governed_prior_auth_cases(id),
  outcome TEXT NOT NULL CHECK (outcome IN ('approved_initial','approved_appeal','partially_approved','upheld','withdrawn')),
  decision_stage TEXT NOT NULL CHECK (decision_stage IN ('initial','peer_to_peer','first_level_appeal','second_level_appeal','external_review')),
  denial_category TEXT,
  evidence_codes JSONB NOT NULL DEFAULT '[]',
  requested_units INTEGER NOT NULL CHECK (requested_units > 0),
  authorized_units INTEGER NOT NULL CHECK (authorized_units >= 0),
  turnaround_hours NUMERIC(10,2) NOT NULL CHECK (turnaround_hours >= 0),
  care_delay_hours INTEGER NOT NULL DEFAULT 0 CHECK (care_delay_hours >= 0),
  revenue_at_risk NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (revenue_at_risk >= 0),
  recovered_revenue NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (recovered_revenue >= 0),
  rationale TEXT NOT NULL,
  human_verified_by TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prior_auth_ai_reviews (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id UUID NOT NULL REFERENCES governed_prior_auth_cases(id),
  review_type TEXT NOT NULL CHECK (review_type IN ('evidence_gap','appeal_draft','peer_review_brief')),
  input_digest TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider = 'openrouter'),
  model TEXT NOT NULL,
  structured_output JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','accepted','rejected','superseded')),
  created_by TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prior_auth_appeal_artifacts (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id UUID NOT NULL REFERENCES governed_prior_auth_cases(id),
  appeal_level TEXT NOT NULL CHECK (appeal_level IN ('peer_to_peer','first_level','second_level','external_review')),
  deadline_at TIMESTAMPTZ NOT NULL,
  disputed_criteria JSONB NOT NULL DEFAULT '[]',
  evidence_codes JSONB NOT NULL DEFAULT '[]',
  rationale TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','submitted','decided')),
  source_ai_review_id UUID REFERENCES prior_auth_ai_reviews(id),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prior_auth_outcomes_case_idx
  ON prior_auth_case_outcomes(tenant_id, case_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS prior_auth_outcomes_learning_idx
  ON prior_auth_case_outcomes(tenant_id, denial_category, outcome, decided_at DESC);
CREATE INDEX IF NOT EXISTS prior_auth_ai_reviews_case_idx
  ON prior_auth_ai_reviews(tenant_id, case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS prior_auth_appeals_deadline_idx
  ON prior_auth_appeal_artifacts(tenant_id, status, deadline_at);
CREATE INDEX IF NOT EXISTS governed_prior_auth_post_acute_idx
  ON governed_prior_auth_cases(tenant_id, service_line, payer_ref, status, due_at);

DROP TRIGGER IF EXISTS prior_auth_outcomes_immutable ON prior_auth_case_outcomes;
CREATE TRIGGER prior_auth_outcomes_immutable
  BEFORE UPDATE OR DELETE ON prior_auth_case_outcomes
  FOR EACH ROW EXECUTE FUNCTION immutable_prior_auth_event();

CREATE OR REPLACE VIEW prior_auth_outcome_learning_summary AS
SELECT
  c.tenant_id,
  c.payer_ref,
  c.procedure_code,
  COALESCE(c.service_line, 'other') AS service_line,
  COALESCE(o.denial_category, 'none') AS denial_category,
  COUNT(*)::INTEGER AS decision_count,
  COUNT(*) FILTER (WHERE o.outcome IN ('approved_initial','approved_appeal','partially_approved'))::INTEGER AS approval_count,
  COUNT(*) FILTER (WHERE o.decision_stage <> 'initial')::INTEGER AS appeal_count,
  COUNT(*) FILTER (WHERE o.outcome = 'approved_appeal')::INTEGER AS overturned_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE o.outcome IN ('approved_initial','approved_appeal','partially_approved')) / NULLIF(COUNT(*), 0), 1) AS approval_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE o.outcome = 'approved_appeal') / NULLIF(COUNT(*) FILTER (WHERE o.decision_stage <> 'initial'), 0), 1) AS overturn_rate,
  ROUND(AVG(o.turnaround_hours), 1) AS average_turnaround_hours,
  ROUND(SUM(o.revenue_at_risk), 2) AS revenue_at_risk,
  ROUND(SUM(o.recovered_revenue), 2) AS recovered_revenue,
  ROUND(AVG(o.care_delay_hours), 1) AS average_care_delay_hours
FROM prior_auth_case_outcomes o
JOIN governed_prior_auth_cases c ON c.id = o.case_id AND c.tenant_id = o.tenant_id
GROUP BY c.tenant_id, c.payer_ref, c.procedure_code, COALESCE(c.service_line, 'other'), COALESCE(o.denial_category, 'none');

COMMIT;
