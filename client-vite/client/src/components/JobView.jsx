import { useEffect, useState } from "react";
import { Button } from "antd";
import { CheckIcon, CopyIcon, ExternalIcon, MinusIcon, Spinner, XIcon } from "./icons";

const useNow = (active) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
};

const fmt = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
};

const StatusIcon = ({ status, size = 14 }) => {
  if (status === "running") return <Spinner size={size} />;
  if (status === "done") return <CheckIcon size={size} />;
  if (status === "failed") return <XIcon size={size} />;
  if (status === "skipped" || status === "cancelled") return <MinusIcon size={size} />;
  return <span className="dot" />;
};

// Plain text, one bullet per branch with the full PR link. Slack auto-links URLs on paste.
const slackMessage = (created) => created.map((t) => `• ${t.env}: ${t.prUrl}`).join("\n");

const useCopy = () => {
  const [copied, setCopied] = useState("");
  const copy = async (text, key = text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return [copied, copy];
};

const Target = ({ target, copied, copy }) => {
  const picks = target.picks || [];
  const open = target.status === "failed" || target.status === "running";
  return (
    <div className={`target is-${target.status}`}>
      <div className="target-head">
        <span className={`status-ico s-${target.status}`}>
          <StatusIcon status={target.status} size={16} />
        </span>
        <strong className="target-name">{target.env}</strong>
        <span className="target-note">{target.note}</span>
        {target.prUrl && (
          <span className="target-links">
            <a className="btn-link" href={target.prUrl} target="_blank" rel="noreferrer">
              Open PR <ExternalIcon size={13} />
            </a>
            <button className="icon-btn" title="Copy link" onClick={() => copy(target.prUrl)}>
              {copied === target.prUrl ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            </button>
          </span>
        )}
      </div>

      <ol className="steps">
        {target.steps.map((s) => (
          <li key={s.id} className={`step s-${s.status}`} title={s.detail}>
            <span className={`dot dot-${s.status}`} />
            {s.label}
            {s.status === "done" && s.detail && <em>{s.detail}</em>}
          </li>
        ))}
      </ol>

      {target.error && <div className="error-box">{target.error}</div>}

      {picks.length > 0 && target.status !== "pending" && (
        <details className="commits" open={open}>
          <summary>
            {picks.length} commit{picks.length > 1 ? "s" : ""}
          </summary>
          <ul>
            {picks.map((p) => (
              <li key={p.sha} className={`s-${p.status}`}>
                <StatusIcon status={p.status} size={12} />
                <code>{p.sha.slice(0, 7)}</code>
                <span className="commit-subject">{p.subject}</span>
                {p.message && <em>{p.message}</em>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

const JobView = ({ job, log, onCancel, onDismiss }) => {
  const running = job.status === "running";
  const [cancelling, setCancelling] = useState(false);
  const now = useNow(running);
  const [copied, copy] = useCopy();
  const total = job.targets.length;
  const finished = job.targets.filter((t) => !["pending", "running"].includes(t.status)).length;
  const created = job.targets.filter((t) => t.prUrl);
  const failed = job.targets.filter((t) => t.status === "failed").length;

  const headline = running
    ? job.stage
    : job.status === "done"
      ? `Done: ${created.length} pull request${created.length === 1 ? "" : "s"} ready`
      : job.status === "cancelled"
        ? "Cancelled"
        : failed
          ? `Finished with ${failed} failure${failed > 1 ? "s" : ""}`
          : "Failed";

  const slack = slackMessage(created);

  return (
    <div className="card card-fill job">
      <div className="job-top">
      <div className="job-head">
        <div>
          <div className={`job-title s-${job.status}`}>
            <StatusIcon status={job.status === "done" ? "done" : job.status} size={16} />
            {headline}
          </div>
          <div className="hint">
            {job.repo.owner}/{job.repo.repo} · {job.params.prIds.map((n) => `#${n}`).join(", ")} ·{" "}
            {fmt((job.finishedAt || now) - job.startedAt)}
          </div>
        </div>
        {running ? (
          <Button
            disabled={cancelling}
            onClick={() => {
              setCancelling(true);
              onCancel();
            }}
          >
            {cancelling ? "Cancelling…" : "Cancel"}
          </Button>
        ) : (
          <Button onClick={onDismiss}>Dismiss</Button>
        )}
      </div>

      <ul className="job-prs">
        {job.prs.map((pr) => (
          <li key={pr.number}>
            <a href={pr.url} target="_blank" rel="noreferrer">
              #{pr.number}
            </a>
            <span>{pr.title}</span>
          </li>
        ))}
      </ul>

      <div className="progress" aria-hidden="true">
        <div style={{ width: `${(finished / total) * 100}%` }} className={failed ? "bad" : job.status === "done" ? "ok" : ""} />
      </div>

      {job.error && <div className="error-box">{job.error}</div>}
      </div>

      <div className="card-body">
      <div className="targets">
        {job.targets.map((t) => (
          <Target key={t.env} target={t} copied={copied} copy={copy} />
        ))}
      </div>

      {log.length > 0 && (
        <details className="log">
          <summary>Activity log</summary>
          <pre>
            {log.map((l, i) => (
              <div key={i} className={`log-${l.level}`}>
                {new Date(l.t).toLocaleTimeString()}  {l.message}
              </div>
            ))}
          </pre>
        </details>
      )}
      </div>

      {!running && created.length > 0 && (
        <div className="card-foot">
          <Button icon={<CopyIcon size={14} />} onClick={() => copy(slack, "all")}>
            {copied === "all" ? "Copied!" : "Copy for Slack"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default JobView;
