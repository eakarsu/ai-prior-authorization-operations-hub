import Link from 'next/link';
import UnifiedShell from '@/components/unified/UnifiedShell';
import { featureCatalog, featureFamilies } from '@/lib/unifiedApp';
import { sourceCustomFeatureCatalog, sourceCustomFeatureFamilies } from '@/lib/sourceCustomFeatures';

export default function FeaturesPage() {
  const mergedFamilies = [...featureFamilies, ...sourceCustomFeatureFamilies];
  const mergedCatalog = [...featureCatalog, ...sourceCustomFeatureCatalog];

  return (
    <UnifiedShell
      eyebrow="Feature Map"
      title="All AI Agent Ops Features"
      subtitle="Feature-first navigation collected from source applications and normalized into one suite."
    >
      <div className="grid columns-3" style={{ marginBottom: 16 }}>
        {mergedFamilies.map((family) => (
          <div className="card stack" key={family.name}>
            <div className="pill">{family.name}</div>
            <div className="muted">{family.features.join(' · ')}</div>
          </div>
        ))}
      </div>

      <div className="grid columns-3">
        {mergedCatalog.map((feature) => (
          <div className="card stack" key={feature.title}>
            <div className="pill">{feature.category}</div>
            <h3>{feature.title}</h3>
            <div className="muted">{feature.summary}</div>
            <ul className="feature-list">
              {feature.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <Link className="button" href={feature.href}>Open Feature</Link>
          </div>
        ))}
      </div>
    </UnifiedShell>
  );
}
