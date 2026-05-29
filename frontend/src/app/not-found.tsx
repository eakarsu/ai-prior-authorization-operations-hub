import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="pill">Agent Ops</div>
        <h1 style={{ marginBottom: 8 }}>Page not found</h1>
        <div className="muted">
          This route is not part of the ai agent ops suite feature map.
        </div>
        <div className="button-row" style={{ marginTop: 20 }}>
          <Link className="button primary" href="/dashboard">Open Dashboard</Link>
          <Link className="button" href="/features">View Features</Link>
        </div>
      </div>
    </div>
  );
}
