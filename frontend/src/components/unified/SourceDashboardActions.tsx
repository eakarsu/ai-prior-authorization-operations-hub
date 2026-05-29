import Link from 'next/link';
import { sourceDashboardActions } from '@/lib/sourceDashboardActions';
import { sourceCustomFeatureLinksByProject } from '@/lib/sourceCustomFeatures';

export default function SourceDashboardActions() {
  if (!sourceDashboardActions.length) return null;

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h3>Source-Derived Dashboard Actions</h3>
          <div className="muted">Optimized from donor project dashboard buttons, routes, APIs, and AI tool signals.</div>
        </div>
      </div>
      <div className="grid columns-3">
        {sourceDashboardActions.map((action) => (
          <div key={action.id} className="card stack source-action-card">
            <div className="pill">{action.count} source projects</div>
            <h4>{action.label}</h4>
            <div className="muted">{action.description}</div>
            <div className="source-action-examples">
              {action.examples.slice(0, 3).map((item) => (
                <span key={item} className="tag-link">{item}</span>
              ))}
            </div>
            <div className="inline-links">
              {action.sourceProjects.slice(0, 4).map((project) => {
                const href = sourceCustomFeatureLinksByProject[project];
                return href ? (
                  <Link key={project} className="tag-link" href={href}>{project}</Link>
                ) : (
                  <span key={project} className="tag-link">{project}</span>
                );
              })}
            </div>
            <Link className="button" href={action.href}>Open Action Group</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
