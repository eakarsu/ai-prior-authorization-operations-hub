import { appendAuditEntry } from '@/lib/auditStore';
import { featureEntitiesBySlug, type FeatureEntitySet } from '@/lib/featureEntities';
import { sourceCustomFeatureEntitiesBySlug } from '@/lib/sourceCustomFeatures';
import { ensureKeyValueSeed, getPgKeyValue, setPgKeyValue } from '@/lib/postgres';

type EntityStateMap = Record<string, FeatureEntitySet>;

function cloneSet(set: FeatureEntitySet): FeatureEntitySet {
  return {
    title: set.title,
    columns: [...set.columns],
    rows: set.rows.map((row) => ({ ...row })),
  };
}

function backfillSeedRows(existing: FeatureEntitySet, seed: FeatureEntitySet): FeatureEntitySet {
  if (existing.rows.length >= seed.rows.length) return existing;
  const existingIds = new Set(existing.rows.map((row) => row.id));
  return {
    title: existing.title || seed.title,
    columns: existing.columns.length ? existing.columns : [...seed.columns],
    rows: [
      ...existing.rows.map((row) => ({ ...row })),
      ...seed.rows.filter((row) => !existingIds.has(row.id)).map((row) => ({ ...row })),
    ],
  };
}

function getSeedEntities(): EntityStateMap {
  return Object.fromEntries(
    Object.entries({ ...featureEntitiesBySlug, ...sourceCustomFeatureEntitiesBySlug }).map(([slug, set]) => [slug, cloneSet(set)]),
  );
}

async function ensureStore() {
  await ensureKeyValueSeed('entities', getSeedEntities(), 'entities.json');
}

export async function getEntitySet(slug: string): Promise<FeatureEntitySet | null> {
  await ensureStore();
  const existing = await getPgKeyValue<FeatureEntitySet>('entities', slug);
  const seed = featureEntitiesBySlug[slug] ?? sourceCustomFeatureEntitiesBySlug[slug];
  if (existing) {
    if (seed && existing.rows.length < seed.rows.length) {
      const backfilled = backfillSeedRows(existing, seed);
      await setPgKeyValue('entities', slug, backfilled);
      return backfilled;
    }
    return existing;
  }
  if (!seed) return null;
  const seeded = cloneSet(seed);
  await setPgKeyValue('entities', slug, seeded);
  return seeded;
}

export async function saveEntitySet(slug: string, set: FeatureEntitySet) {
  await ensureStore();
  await setPgKeyValue('entities', slug, set);
  await appendAuditEntry(slug, 'Entity records updated');
}

export async function resetEntitySet(slug: string): Promise<FeatureEntitySet | null> {
  const seed = featureEntitiesBySlug[slug] ?? sourceCustomFeatureEntitiesBySlug[slug];
  if (!seed) return null;
  await ensureStore();
  const reset = cloneSet(seed);
  await setPgKeyValue('entities', slug, reset);
  await appendAuditEntry(slug, 'Entity records reset');
  return reset;
}
