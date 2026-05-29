import { getAuditEntries } from '@/lib/auditStore';

export default async function AuditPanel() {
  const entries = await getAuditEntries();

  return (
    <div className="card">
      <h3>Audit Log</h3>
      <div className="activity-log">
        {entries.slice(0, 8).map((item) => (
          <div key={item.id} className="activity-row">
            <div className="muted" style={{ fontSize: 12 }}>{item.at}</div>
            <div><strong>{item.area}</strong> · {item.action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
