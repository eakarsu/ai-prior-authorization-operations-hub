import { NextResponse } from 'next/server';
import { dashboardMetrics, dashboardModules, healthMetrics, sourceSystems, workflowHighlights } from '@/lib/suiteData';
import { featureFamilies, featureCatalog } from '@/lib/unifiedApp';

export async function GET() {
  return NextResponse.json({
    metrics: dashboardMetrics,
    healthMetrics,
    modules: dashboardModules,
    featureFamilies,
    featureCatalog,
    sourceSystems,
    workflowHighlights,
  });
}
