import type { FeatureContext, FeatureDefinition, PageDefinition } from '@/lib/unifiedApp';
import type { FeatureEntitySet } from '@/lib/featureEntities';
import type { FeatureSurface } from '@/lib/featureSurfaces';

export const sourceCustomFeatureCatalog: FeatureDefinition[] = [];

export const sourceCustomFeatureFamilies: Array<{ name: string; features: string[] }> = [];

export const sourceCustomPageRegistry: Record<string, PageDefinition> = {};

export const sourceCustomFeatureContexts: Record<string, FeatureContext> = {};

export const sourceCustomFeatureSurfaceBySlug: Record<string, FeatureSurface> = {};

export const sourceCustomFeatureEntitiesBySlug: Record<string, FeatureEntitySet> = {};

export const sourceCustomFeatureLinksByProject: Record<string, string> = {};
