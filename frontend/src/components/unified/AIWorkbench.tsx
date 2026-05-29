'use client';

import { useMemo, useState } from 'react';
import { aiTools, type AIToolDefinition } from '@/lib/aiTools';
import { sourceAIToolFieldsByToolId, type SourceAIToolField } from '@/lib/sourceAIToolFields';

type AIWorkbenchProps = {
  mode?: 'assistant' | 'tools';
};

type AIResult = {
  tool: AIToolDefinition;
  input: string;
  response: string;
  provider: string;
  createdAt: string;
};

type PresetDefinition = {
  id: string;
  label: string;
  description: string;
  buildPrompt: (tool: AIToolDefinition) => string;
};

type ParsedSection = {
  title: string;
  paragraphs: string[];
  bullets: string[];
};

const promptPresets: PresetDefinition[] = [
  {
    id: 'executive-summary',
    label: 'Executive Summary',
    description: 'Summarize status, risks, and recommended leadership actions.',
    buildPrompt: (tool) =>
      'Create an executive-ready summary for ' + tool.title + '. Include current status, key risks, priority decisions, and owner follow-up. Context: ' + tool.defaultPrompt,
  },
  {
    id: 'risk-review',
    label: 'Risk Review',
    description: 'Focus the AI response on risks, gaps, controls, and escalation points.',
    buildPrompt: (tool) =>
      'Review ' + tool.title + ' for operational risks, missing data, compliance gaps, weak controls, and escalation points. Return severity, evidence needed, and next action. Context: ' + tool.defaultPrompt,
  },
  {
    id: 'next-actions',
    label: 'Next Actions',
    description: 'Generate a practical owner-by-owner action plan.',
    buildPrompt: (tool) =>
      'Turn this ' + tool.title + ' context into a concrete action plan. Group actions by owner, priority, due date, blocker, and expected output. Context: ' + tool.defaultPrompt,
  },
  {
    id: 'implementation-plan',
    label: 'Implementation Plan',
    description: 'Convert the feature into workflow, data, API, and QA steps.',
    buildPrompt: (tool) =>
      'Create an implementation plan for ' + tool.title + '. Include workflow steps, required data, APIs or integrations, permissions, empty states, audit logging, and validation tests. Context: ' + tool.defaultPrompt,
  },
];

function buildFieldValues(fields: SourceAIToolField[]) {
  return Object.fromEntries(fields.map((field) => [field.name, field.defaultValue || '']));
}

function sampleForField(field: SourceAIToolField, tool: AIToolDefinition) {
  if (field.options.length) return field.options[0];
  const lower = field.name.toLowerCase();
  if (lower.includes('name')) return tool.title.replace(/ AI Tools| Source Workflow| Copilot/g, '');
  if (lower.includes('language')) return 'English';
  if (lower.includes('voice')) return 'Professional';
  if (lower.includes('industry')) return 'General Business';
  if (lower.includes('duration')) return '300';
  if (lower.includes('phone') || lower.includes('number') || lower.includes('transfer')) return '+1 555 010 0100';
  if (lower.includes('query')) return 'What is the best next response for this customer?';
  if (lower.includes('context')) return 'Customer is asking for help and needs a concise, professional answer.';
  if (lower.includes('greeting')) return 'Hello, thank you for calling. How can I help you today?';
  if (lower.includes('prompt') || lower.includes('script')) return 'You are a professional assistant. Be concise, accurate, helpful, and compliant.';
  return field.defaultValue || 'Sample value';
}

function formatInput(prompt: string, fields: SourceAIToolField[], values: Record<string, string>) {
  const structured = fields
    .map((field) => ({ label: field.label, value: values[field.name] }))
    .filter((item) => String(item.value || '').trim())
    .map((item) => item.label + ': ' + item.value)
    .join('\n');
  return structured ? prompt + '\n\nStructured fields:\n' + structured : prompt;
}

function parseAIResponse(response: string): ParsedSection[] {
  const lines = response
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: ParsedSection[] = [];
  let current: ParsedSection = { title: 'AI Analysis', paragraphs: [], bullets: [] };

  const pushCurrent = () => {
    if (current.paragraphs.length || current.bullets.length || current.title !== 'AI Analysis') {
      sections.push(current);
    }
  };

  for (const line of lines) {
    const markdownHeading = line.match(/^#{1,6}\s+(.+)$/);
    const plainHeading = !markdownHeading && line.length <= 72 && /:$/.test(line) && !/^https?:\/\//i.test(line);
    if (markdownHeading || plainHeading) {
      pushCurrent();
      current = {
        title: (markdownHeading ? markdownHeading[1] : line.replace(/:$/, '')).replace(/\*\*/g, ''),
        paragraphs: [],
        bullets: [],
      };
      continue;
    }

    const bullet = line.match(/^([-*•]|\d+[.)])\s+(.+)$/);
    if (bullet) current.bullets.push(bullet[2].replace(/\*\*/g, ''));
    else current.paragraphs.push(line.replace(/\*\*/g, ''));
  }

  pushCurrent();
  return sections.length ? sections : [{ title: 'AI Analysis', paragraphs: [response], bullets: [] }];
}

function classifySection(title: string) {
  const lower = title.toLowerCase();
  if (/risk|gap|issue|exception|concern/.test(lower)) return 'risk';
  if (/action|next|recommend|owner|task|follow/.test(lower)) return 'action';
  if (/audit|control|evidence|compliance|validation|review/.test(lower)) return 'audit';
  if (/summary|overview|analysis|finding|status/.test(lower)) return 'summary';
  return 'detail';
}

function plainResult(result: AIResult, sections: ParsedSection[]) {
  return [
    '# ' + result.tool.title,
    '',
    'Provider: ' + result.provider,
    'Generated: ' + new Date(result.createdAt).toLocaleString(),
    '',
    '## Request',
    result.input,
    '',
    ...sections.flatMap((section) => [
      '## ' + section.title,
      ...section.paragraphs,
      ...section.bullets.map((bullet) => '- ' + bullet),
      '',
    ]),
  ].join('\n');
}

type FieldSnapshot = {
  label: string;
  value: string;
  source: string;
  required?: boolean;
};

function buildFieldSnapshot(fields: SourceAIToolField[], values: Record<string, string>): FieldSnapshot[] {
  return fields
    .map((field) => ({
      label: field.label,
      value: values[field.name] || '',
      source: field.source,
      required: field.required,
    }))
    .filter((field) => String(field.value || '').trim())
    .slice(0, 18);
}

function AIResultReport({
  result,
  fields,
  fieldValues,
}: {
  result: AIResult;
  fields: SourceAIToolField[];
  fieldValues: Record<string, string>;
}) {
  const sections = parseAIResponse(result.response);
  const createdAt = new Date(result.createdAt).toLocaleString();
  const fieldSnapshot = buildFieldSnapshot(fields, fieldValues);
  const riskCount = sections.filter((section) => classifySection(section.title) === 'risk').length;
  const actionCount = sections.reduce((sum, section) => sum + (classifySection(section.title) === 'action' ? Math.max(section.bullets.length, 1) : 0), 0);
  const auditCount = sections.filter((section) => classifySection(section.title) === 'audit').length;
  const copyText = plainResult(result, sections);

  const copyReport = async () => {
    await navigator.clipboard?.writeText(copyText);
  };

  const downloadReport = () => {
    const blob = new Blob([copyText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.tool.id + '-ai-report.md';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ai-report pro">
      <div className="ai-report-header pro">
        <div>
          <div className="pill">AI Result Report</div>
          <h4>{result.tool.title}</h4>
          <div className="muted">Provider: {result.provider} · {createdAt}</div>
        </div>
        <div className="ai-report-actions">
          <div className="ai-report-badge">{result.tool.category}</div>
          <button className="button subtle" type="button" onClick={copyReport}>Copy</button>
          <button className="button subtle" type="button" onClick={downloadReport}>Export MD</button>
        </div>
      </div>

      <div className="ai-report-scoregrid">
        <div>
          <span>Sections</span>
          <strong>{sections.length}</strong>
          <em>Structured response blocks</em>
        </div>
        <div>
          <span>Risks</span>
          <strong>{riskCount}</strong>
          <em>Risk-oriented sections</em>
        </div>
        <div>
          <span>Actions</span>
          <strong>{actionCount || sections.reduce((sum, section) => sum + section.bullets.length, 0)}</strong>
          <em>Action bullets detected</em>
        </div>
        <div>
          <span>Audit</span>
          <strong>{auditCount}</strong>
          <em>Evidence/control sections</em>
        </div>
      </div>

      {fieldSnapshot.length ? (
        <div className="ai-report-field-recap">
          <div className="section-head compact">
            <div>
              <h4>Source Field Recap</h4>
              <div className="muted">Values submitted from the donor AI feature schema.</div>
            </div>
          </div>
          <div className="ai-field-recap-grid">
            {fieldSnapshot.map((field) => (
              <div key={field.label + field.source} className="ai-field-recap-item">
                <span>{field.label}{field.required ? ' *' : ''}</span>
                <strong>{field.value}</strong>
                <em>{field.source}</em>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <details className="ai-report-request pro">
        <summary>Request sent to AI</summary>
        <p>{result.input}</p>
      </details>

      <div className="ai-report-sections pro">
        {sections.map((section, index) => {
          const kind = classifySection(section.title);
          return (
            <section key={section.title + index} className={'ai-report-section pro ' + kind}>
              <div className="ai-section-label">{kind}</div>
              <h5>{section.title}</h5>
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>{paragraph}</p>
              ))}
              {section.bullets.length ? (
                <ul>
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
function DynamicField({
  field,
  value,
  onChange,
}: {
  field: SourceAIToolField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === 'select' && field.options.length) {
    return (
      <label className="ai-dynamic-field">
        <span>{field.label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {field.options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'textarea') {
    return (
      <label className="ai-dynamic-field">
        <span>{field.label}</span>
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} placeholder={field.placeholder} />
      </label>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className="ai-dynamic-field check-row">
        <input type="checkbox" checked={value === 'true'} onChange={(event) => onChange(String(event.target.checked))} />
        <span>{field.label}</span>
      </label>
    );
  }

  return (
    <label className="ai-dynamic-field">
      <span>{field.label}</span>
      <input type={field.type === 'file' ? 'text' : field.type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} />
    </label>
  );
}

export default function AIWorkbench({ mode = 'tools' }: AIWorkbenchProps) {
  const initialTool = mode === 'assistant' ? aiTools[0] : aiTools.find((tool) => tool.id !== 'suite-assistant') || aiTools[0];
  const [selectedToolId, setSelectedToolId] = useState(initialTool.id);
  const selectedTool = useMemo(() => aiTools.find((tool) => tool.id === selectedToolId) || aiTools[0], [selectedToolId]);
  const selectedFields = useMemo(() => sourceAIToolFieldsByToolId[selectedTool.id] || [], [selectedTool.id]);
  const [input, setInput] = useState(selectedTool.defaultPrompt);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => buildFieldValues(sourceAIToolFieldsByToolId[initialTool.id] || []));
  const [result, setResult] = useState<AIResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const selectTool = (tool: AIToolDefinition) => {
    setSelectedToolId(tool.id);
    setInput(tool.defaultPrompt);
    setFieldValues(buildFieldValues(sourceAIToolFieldsByToolId[tool.id] || []));
    setResult(null);
    setError('');
  };

  const applyPreset = (preset: PresetDefinition) => {
    setInput(preset.buildPrompt(selectedTool));
    setResult(null);
    setError('');
  };

  const applySignal = (signal: string) => {
    setInput(
      selectedTool.defaultPrompt +
        '\n\nFocus area: ' +
        signal +
        '\n\nReturn a professional result with summary, risks, recommended next actions, owners, and validation checks.',
    );
    setResult(null);
    setError('');
  };

  const fillDefaults = () => setFieldValues(buildFieldValues(selectedFields));
  const fillSamples = () => setFieldValues(Object.fromEntries(selectedFields.map((field) => [field.name, sampleForField(field, selectedTool)])));
  const clearFields = () => setFieldValues(Object.fromEntries(selectedFields.map((field) => [field.name, ''])));

  const updateField = (name: string, value: string) => {
    setFieldValues((current) => ({ ...current, [name]: value }));
    setResult(null);
    setError('');
  };

  const runTool = async () => {
    const requestInput = formatInput(input, selectedFields, fieldValues);
    setRunning(true);
    setError('');
    try {
      const response = await fetch('/api/ai-tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId: selectedTool.id, input: requestInput, fields: fieldValues }),
      });
      if (!response.ok) throw new Error('AI tool failed with ' + response.status);
      setResult(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI tool failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="card stack ai-workbench">
      <div className="section-head">
        <div>
          <div className="pill">AI Workbench</div>
          <h3>{mode === 'assistant' ? 'Suite AI Assistant' : 'Suite AI Tools'}</h3>
          <div className="muted">Cards are generated from this suite&apos;s merged capabilities, source systems, and extracted donor AI fields.</div>
        </div>
        <button className="button primary" type="button" onClick={runTool} disabled={running}>
          {running ? 'Sending...' : 'Send AI Request'}
        </button>
      </div>

      <div className="ai-tool-grid">
        {aiTools.map((tool) => (
          <button key={tool.id} type="button" className={tool.id === selectedTool.id ? 'ai-tool-card active' : 'ai-tool-card'} onClick={() => selectTool(tool)}>
            <span className="ai-tool-category">{tool.category}</span>
            <strong>{tool.title}</strong>
            <span>{tool.description}</span>
            <span className="ai-tool-signals">{tool.signals.slice(0, 3).join(' / ')}</span>
          </button>
        ))}
      </div>

      <div className="grid columns-2 ai-run-panel">
        <div className="stack">
          <span className="muted" style={{ fontWeight: 700 }}>{selectedTool.inputLabel}</span>
          <div className="ai-preset-panel">
            <div className="ai-preset-grid">
              {promptPresets.map((preset) => (
                <button key={preset.id} className="ai-preset-button" type="button" onClick={() => applyPreset(preset)}>
                  <strong>{preset.label}</strong>
                  <span>{preset.description}</span>
                </button>
              ))}
            </div>
            {selectedTool.signals.length ? (
              <div className="ai-signal-row">
                {selectedTool.signals.slice(0, 8).map((signal) => (
                  <button key={signal} className="tag-link" type="button" onClick={() => applySignal(signal)}>
                    {signal}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {selectedFields.length ? (
            <div className="ai-dynamic-fields">
              <div className="section-head compact">
                <div>
                  <h4>Extracted AI Fields</h4>
                  <div className="muted">{selectedFields.length} donor fields mapped for this tool.</div>
                </div>
                <div className="inline-links">
                  <button className="button subtle" type="button" onClick={fillDefaults}>Defaults</button>
                  <button className="button subtle" type="button" onClick={fillSamples}>Fill Samples</button>
                  <button className="button subtle" type="button" onClick={clearFields}>Clear</button>
                </div>
              </div>
              <div className="ai-dynamic-field-grid">
                {selectedFields.map((field) => (
                  <DynamicField key={field.name} field={field} value={fieldValues[field.name] || ''} onChange={(value) => updateField(field.name, value)} />
                ))}
              </div>
            </div>
          ) : null}

          <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={10} />
          <button className="button primary ai-send-button" type="button" onClick={runTool} disabled={running}>
            {running ? 'Sending...' : 'Send AI Request'}
          </button>
        </div>
        <div className="stack">
          <div className="muted" style={{ fontWeight: 700 }}>{selectedTool.outputLabel}</div>
          <div className="ai-response-box">
            {error ? <div className="error-text">{error}</div> : null}
            {result ? (
              <AIResultReport result={result} fields={selectedFields} fieldValues={fieldValues} />
            ) : (
              <div className="ai-empty-result">
                <div className="pill">Ready</div>
                <h4>Professional AI result preview</h4>
                <p>Select presets, fill extracted source fields, review the request, then send it to generate a structured report.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
