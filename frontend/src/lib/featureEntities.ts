import { featureCatalog } from '@/lib/unifiedApp';

export type EntityRecord = { id: string; name: string; status: string; owner: string; amount?: string; dueDate?: string; priority?: string };
export type FeatureEntitySet = { title: string; columns: string[]; rows: EntityRecord[] };

const COLUMNS = ['Name', 'Status', 'Owner', 'Amount', 'Due Date', 'Priority'];
const STATUSES = ['Open', 'Review', 'Queued', 'In review', 'Approval pending', 'Urgent', 'Exception', 'Completed'];
const PRIORITIES = ['High', 'Medium', 'Low', 'Urgent', 'Medium'];

function slugFromHref(href: string) {
  return href.split('/').filter(Boolean).pop() ?? href.replace(/^\//, '');
}

function ownerFor(category: string) {
  if (category.includes('Clinical')) return 'Clinical Review Lead';
  if (category.includes('Evidence')) return 'Evidence Lead';
  if (category.includes('Integration')) return 'Integration Lead';
  if (category.includes('Revenue')) return 'Financial Clearance Lead';
  if (category.includes('Risk')) return 'Denial Prevention Lead';
  if (category.includes('Service')) return 'Service Line Lead';
  if (category.includes('Core')) return 'Platform Lead';
  return 'Prior Auth Operations Lead';
}

function namesFor(title: string) {
  return [
    `${title} intake review`,
    `${title} payer policy validation`,
    `${title} clinical evidence check`,
    `${title} missing documentation request`,
    `${title} provider approval`,
    `${title} payer portal follow-up`,
    `${title} SLA escalation`,
    `${title} denial risk review`,
    `${title} patient update task`,
    `${title} packet readiness check`,
    `${title} credential or connector blocker`,
    `${title} audit evidence packet`,
    `${title} financial clearance review`,
    `${title} manager signoff`,
    `${title} completed sample`,
  ];
}

function buildSet(slug: string, title: string, category: string): FeatureEntitySet {
  return {
    title: `${title} Records`,
    columns: COLUMNS,
    rows: namesFor(title).map((name, index) => ({
      id: `${slug}-${index + 1}`,
      name,
      status: STATUSES[index % STATUSES.length],
      owner: index % 5 === 0 ? ownerFor(category) : index % 3 === 0 ? 'Clinical Reviewer' : 'Authorization Specialist',
      amount: index % 4 === 0 ? `$${(1800 + index * 460).toLocaleString('en-US')}` : '$0',
      dueDate: `2026-06-${String(7 + index).padStart(2, '0')}`,
      priority: PRIORITIES[index % PRIORITIES.length],
    })),
  };
}

export const featureEntitiesBySlug: Record<string, FeatureEntitySet> = Object.fromEntries(
  featureCatalog.map((feature) => {
    const slug = slugFromHref(feature.href);
    return [slug, buildSet(slug, feature.title, feature.category)];
  }),
);
