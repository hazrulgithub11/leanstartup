import { statusTone } from "../theme";

export function StatusPill({ status }: { status: string }) {
  const tone = statusTone(status);
  return (
    <span className="status-pill" style={{ background: tone.fill, color: tone.ink, borderColor: tone.stroke }}>
      {status}
    </span>
  );
}

export function LockIcon() {
  return (
    <svg className="lock" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function EvidenceLadder({ level }: { level: string }) {
  const levels = ["Opinion", "Research", "Said", "Did"];
  return (
    <ol className="ladder" aria-label="Evidence strength">
      {levels.map((item) => (
        <li key={item} className={item === level ? "is-on" : ""}>
          {item}
        </li>
      ))}
    </ol>
  );
}

export function ScoreBar({ value, total, target }: { value: number; total: number; target?: number }) {
  const width = Math.max(4, Math.min(100, (value / total) * 100));
  const mark = target == null ? undefined : Math.max(0, Math.min(100, (target / total) * 100));
  return (
    <div className="bar" aria-hidden="true">
      <span style={{ width: `${width}%` }} />
      {mark != null && <i style={{ left: `${mark}%` }} />}
    </div>
  );
}
