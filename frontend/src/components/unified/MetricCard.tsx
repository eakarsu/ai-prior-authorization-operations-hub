type MetricCardProps = {
  label: string;
  value: string;
  note: string;
};

export default function MetricCard({ label, value, note }: MetricCardProps) {
  return (
    <div className="card">
      <div className="pill">{label}</div>
      <div className="metric">{value}</div>
      <div className="muted">{note}</div>
    </div>
  );
}
