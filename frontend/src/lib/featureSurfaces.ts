import { featureCatalog } from '@/lib/unifiedApp';

export type FeatureSurfaceRow = { id: string; item: string; status: string; owner: string; nextStep: string };
export type FeatureSurface = {
  workItems: FeatureSurfaceRow[];
  quickActions: string[];
  controlChecks: Array<{ id: string; label: string; done: boolean }>;
  activityLog: Array<{ id: string; message: string; at: string }>;
};

function slugFromHref(href: string) {
  return href.split('/').filter(Boolean).pop() ?? href.replace(/^\//, '');
}

function ownerFor(category: string) {
  if (category.includes('Clinical')) return 'Clinical Review Lead';
  if (category.includes('Integration')) return 'Integration Lead';
  if (category.includes('Revenue')) return 'Financial Clearance Lead';
  if (category.includes('Risk')) return 'Denial Prevention Lead';
  if (category.includes('Service')) return 'Service Line Lead';
  return 'Prior Auth Operations Lead';
}

function buildSurface(slug: string, title: string, category: string): FeatureSurface {
  const owner = ownerFor(category);
  return {
    workItems: [
      { id: `${slug}-surface-1`, item: `${title} intake queue`, status: 'Open', owner, nextStep: 'Validate source request and assign owner' },
      { id: `${slug}-surface-2`, item: `${title} clinical evidence review`, status: 'Review', owner: 'Clinical Reviewer', nextStep: 'Confirm medical necessity and missing proof' },
      { id: `${slug}-surface-3`, item: `${title} payer follow-up`, status: 'Needs attention', owner: 'Payer Liaison', nextStep: 'Check status, portal notes, and next payer action' },
      { id: `${slug}-surface-4`, item: `${title} SLA escalation`, status: 'Urgent', owner: 'Operations Lead', nextStep: 'Escalate overdue or service-date-sensitive case' },
      { id: `${slug}-surface-5`, item: `${title} audit closeout`, status: 'In progress', owner: 'Team Lead', nextStep: 'Capture decision, packet evidence, and patient update' },
    ],
    quickActions: [`Create ${title} record`, `Export ${title} list`, `Review ${title} exceptions`, `Assign ${title} owner`],
    controlChecks: [
      { id: `${slug}-check-1`, label: `${title} owner assigned`, done: true },
      { id: `${slug}-check-2`, label: `${title} payer rule and evidence reviewed`, done: false },
      { id: `${slug}-check-3`, label: `${title} PHI-safe audit trail current`, done: true },
      { id: `${slug}-check-4`, label: `${title} patient or provider update logged`, done: false },
    ],
    activityLog: [
      { id: `${slug}-log-1`, message: `${title} queue refreshed`, at: '2026-06-06 09:00' },
      { id: `${slug}-log-2`, message: `${title} exception assigned`, at: '2026-06-06 11:30' },
      { id: `${slug}-log-3`, message: `${title} controls reviewed`, at: '2026-06-06 14:15' },
    ],
  };
}

export const featureSurfaceBySlug: Record<string, FeatureSurface> = Object.fromEntries(
  featureCatalog.map((feature) => {
    const slug = slugFromHref(feature.href);
    return [slug, buildSurface(slug, feature.title, feature.category)];
  }),
);
export const featureSurfaces: Record<string, FeatureSurface> = Object.fromEntries(
  featureCatalog.map((feature) => [feature.title, featureSurfaceBySlug[slugFromHref(feature.href)]]),
);
