import { appendAuditEntry } from '@/lib/auditStore';
import { featureSurfaceBySlug, type FeatureSurface } from '@/lib/featureSurfaces';
import { sourceCustomFeatureSurfaceBySlug } from '@/lib/sourceCustomFeatures';
import { ensureKeyValueSeed, getPgKeyValue, setPgKeyValue } from '@/lib/postgres';

type FeatureStateMap = Record<string, FeatureSurface>;

function cloneSurface(surface: FeatureSurface): FeatureSurface {
  return {
    workItems: surface.workItems.map((item) => ({ ...item })),
    quickActions: [...surface.quickActions],
    controlChecks: surface.controlChecks.map((item) => ({ ...item })),
    activityLog: surface.activityLog.map((item) => ({ ...item })),
  };
}

function getSeedState(): FeatureStateMap {
  return Object.fromEntries(
    Object.entries({ ...featureSurfaceBySlug, ...sourceCustomFeatureSurfaceBySlug }).map(([slug, surface]) => [slug, cloneSurface(surface)]),
  );
}

async function ensureStore() {
  await ensureKeyValueSeed('feature_states', getSeedState(), 'feature-state.json');
}

export async function getFeatureState(slug: string): Promise<FeatureSurface | null> {
  await ensureStore();
  const existing = await getPgKeyValue<FeatureSurface>('feature_states', slug);
  if (existing) return existing;
  const seed = featureSurfaceBySlug[slug] ?? sourceCustomFeatureSurfaceBySlug[slug];
  if (!seed) return null;
  const seeded = cloneSurface(seed);
  await setPgKeyValue('feature_states', slug, seeded);
  return seeded;
}

export async function saveFeatureState(slug: string, surface: FeatureSurface) {
  await ensureStore();
  await setPgKeyValue('feature_states', slug, surface);
  await appendAuditEntry(slug, 'Feature surface updated');
}

export async function resetFeatureState(slug: string): Promise<FeatureSurface | null> {
  const seed = featureSurfaceBySlug[slug] ?? sourceCustomFeatureSurfaceBySlug[slug];
  if (!seed) {
    return null;
  }
  await ensureStore();
  const reset = cloneSurface(seed);
  await setPgKeyValue('feature_states', slug, reset);
  await appendAuditEntry(slug, 'Feature surface reset');
  return reset;
}
