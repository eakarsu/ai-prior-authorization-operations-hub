type PostAcuteLearning = {
  validateOutcome(input: unknown): Record<string, any>;
  validateReviewType(value: unknown): string;
  readiness(caseRecord: Record<string, any>, evidence: Array<Record<string, any>>): {
    requiredCount: number; presentCount: number; completeness: number; missingCodes: string[];
    hoursRemaining: number | null; deadlineRisk: string;
  };
};

export const postAcuteLearning = require('../../../governance/postAcuteLearning.cjs') as PostAcuteLearning;

export type AIReviewOutput = {
  headline: string;
  executiveSummary: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  confidence: number;
  metrics: Array<{ label: string; value: string }>;
  evidenceGaps: Array<{ criterion: string; status: string; rationale: string }>;
  recommendations: Array<{ action: string; owner: string; priority: string }>;
  rationale: string;
  limitations: string[];
};

const cleanText = (value: unknown, fallback: string, max = 4000) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;

export function normalizeAIReview(value: unknown): AIReviewOutput {
  const raw = value && typeof value === 'object' ? value as Record<string, any> : {};
  const risk = String(raw.riskLevel || raw.risk || 'moderate').toLowerCase();
  const confidenceValue = typeof raw.confidence === 'string' ? Number(raw.confidence.replace('%', '')) : Number(raw.confidence);
  return {
    headline: cleanText(raw.headline, 'Prior authorization review'),
    executiveSummary: cleanText(raw.executiveSummary, 'The model returned no executive summary.'),
    riskLevel: ['low', 'moderate', 'high', 'critical'].includes(risk) ? risk as AIReviewOutput['riskLevel'] : 'moderate',
    confidence: Math.max(0, Math.min(100, Number.isFinite(confidenceValue) ? confidenceValue : 0)),
    metrics: Array.isArray(raw.metrics) ? raw.metrics.slice(0, 8).map((item: any) => ({ label: cleanText(item?.label, 'Metric', 120), value: cleanText(item?.value, 'Not available', 240) })) : [],
    evidenceGaps: Array.isArray(raw.evidenceGaps) ? raw.evidenceGaps.slice(0, 12).map((item: any) => ({ criterion: cleanText(item?.criterion, 'Unspecified criterion', 160), status: cleanText(item?.status, 'review', 80), rationale: cleanText(item?.rationale, 'Human validation required.', 700) })) : [],
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations.slice(0, 12).map((item: any) => ({ action: cleanText(item?.action, 'Review the source record.', 500), owner: cleanText(item?.owner, 'Clinical reviewer', 120), priority: cleanText(item?.priority, 'normal', 40) })) : [],
    rationale: cleanText(raw.rationale, 'No additional rationale was returned.'),
    limitations: Array.isArray(raw.limitations) ? raw.limitations.slice(0, 8).map((item: any) => cleanText(item, 'Human validation required.', 500)) : ['AI output is decision support and requires human validation.'],
  };
}
