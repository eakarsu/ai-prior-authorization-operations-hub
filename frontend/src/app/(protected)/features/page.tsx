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
      title="All Prior Authorization Features"
      subtitle="Feature-first navigation for intake, rules, evidence, packet generation, appeals, SLA, analytics, documents, and AI."
    >
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Feature Families</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Family</th>
                <th>Features</th>
              </tr>
            </thead>
            <tbody>
              {mergedFamilies.map((family) => (
                <tr key={family.name}>
                  <td><span className="status-chip">{family.name}</span></td>
                  <td>{family.features.join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Feature Catalog</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Category</th>
                <th>Summary</th>
                <th>Workloads</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {mergedCatalog.map((feature) => (
                <tr key={feature.title}>
                  <td><strong>{feature.title}</strong></td>
                  <td><span className="status-chip">{feature.category}</span></td>
                  <td>{feature.summary}</td>
                  <td>{feature.bullets.join(' · ')}</td>
                  <td><Link className="button" href={feature.href}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </UnifiedShell>
  );
}
