import { featureCatalog, featureFamilies } from '@/lib/unifiedApp';
import { sourceSystems } from '@/lib/suiteData';
import { sourceProjectTools } from '@/lib/sourceProjectTools';

export type AIToolDefinition = {
  id: string;
  title: string;
  category: string;
  description: string;
  defaultPrompt: string;
  inputLabel: string;
  outputLabel: string;
  signals: string[];
};

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const operationalFeatures = featureCatalog.filter((feature) => {
  const title = feature.title.toLowerCase();
  const category = feature.category.toLowerCase();
  return !['ai assistant', 'ai tools'].includes(title) && !category.includes('core platform');
});

const featureTools = operationalFeatures.map((feature): AIToolDefinition => ({
  id: slugify(feature.title),
  title: feature.title + ' Copilot',
  category: feature.category,
  description: feature.summary,
  defaultPrompt: 'Review the current ' + feature.title + ' workload. Identify risks, next actions, missing data, and the best owner follow-up.',
  inputLabel: feature.title + ' context',
  outputLabel: feature.title + ' AI response',
  signals: feature.bullets,
}));

const sourceTools = sourceSystems.slice(0, 4).map((source): AIToolDefinition => ({
  id: slugify(source.name),
  title: source.name + ' Source Analyzer',
  category: 'Source Systems',
  description: source.ownership,
  defaultPrompt: 'Analyze source-system coverage for ' + source.name + '. Summarize useful capabilities, gaps, and merge risks.',
  inputLabel: 'Source-system context',
  outputLabel: 'Source analysis',
  signals: source.coverage,
}));

export const aiTools: AIToolDefinition[] = [
  {
    id: 'suite-assistant',
    title: 'Suite Assistant',
    category: 'AI Assistant',
    description: 'General assistant for this merged suite across dashboard, records, documents, approvals, and audit trail.',
    defaultPrompt: 'Summarize the current suite priorities, risks, next actions, and recommended owner follow-up.',
    inputLabel: 'Question or task',
    outputLabel: 'Assistant response',
    signals: featureFamilies.flatMap((family) => family.features).slice(0, 8),
  },
  {
    id: 'document-intelligence',
    title: 'Document Intelligence',
    category: 'AI Tools',
    description: 'Extract, summarize, classify, compare, and review uploaded documents and operating evidence.',
    defaultPrompt: 'Extract key facts, obligations, dates, risks, and recommended next actions from this document context.',
    inputLabel: 'Document text or evidence notes',
    outputLabel: 'Document AI response',
    signals: ['Extraction', 'Classification', 'Summary', 'Risk review'],
  },
  ...featureTools,
  ...sourceTools,
  ...sourceProjectTools,
];

export function getAITool(toolId: string) {
  return aiTools.find((tool) => tool.id === toolId) ?? aiTools[0];
}
