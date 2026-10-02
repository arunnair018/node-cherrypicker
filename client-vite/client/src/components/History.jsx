import { CheckIcon, ChevronIcon, ExternalIcon, HistoryIcon, MinusIcon, XIcon } from "./icons";

const when = (t) =>
  new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const Row = ({ entry }) => (
  <li className="history-row">
    <div className="history-main">
      <div className="history-title">
        <span className={`status-ico s-${entry.status === "done" ? "done" : entry.status === "failed" ? "failed" : ""}`}>
          {entry.status === "done" ? <CheckIcon size={13} /> : entry.status === "failed" ? <XIcon size={13} /> : <MinusIcon size={13} />}
        </span>
        <strong>{entry.prIds.map((n) => `#${n}`).join(", ")}</strong>
      </div>
      <span className="hint">
        {entry.repo} · {when(entry.at)}
      </span>
      <div className="history-targets">
        {entry.targets.map((t) =>
          t.prUrl ? (
            <a key={t.env} className="pill pill-ok" href={t.prUrl} target="_blank" rel="noreferrer">
              {t.env} <ExternalIcon size={11} />
            </a>
          ) : (
            <span key={t.env} className={`pill ${t.status === "failed" ? "pill-bad" : ""}`}>
              {t.env}
            </span>
          )
        )}
      </div>
    </div>
  </li>
);

/** Right-hand panel: same collapse behaviour as the left sidebar; a drawer on narrow screens. */
const History = ({ history, onClear, collapsed, onToggle, narrow, open }) => (
  <aside className={`history-panel ${collapsed ? "is-collapsed" : ""} ${open ? "is-open" : ""}`}>
    <div className="panel-head">
      <button
        className="icon-btn collapse-btn"
        onClick={onToggle}
        aria-label={narrow ? "Close panel" : collapsed ? "Expand recent picks" : "Collapse recent picks"}
        title={narrow ? "Close" : collapsed ? "Expand recent picks" : "Collapse recent picks"}
      >
        {narrow ? <XIcon size={14} /> : <ChevronIcon size={14} direction={collapsed ? "left" : "right"} />}
      </button>
      <h2 className="panel-title">
        <HistoryIcon size={16} />
        <span className="panel-title-text">Recent picks</span>
      </h2>
      {history.length > 0 && (
        <button className="link-btn panel-clear" onClick={onClear}>
          Clear
        </button>
      )}
    </div>
    {collapsed && history.length > 0 && <span className="rail-count">{history.length}</span>}
    <div className="panel-body">
      {history.length ? (
        <ul className="history">
          {history.map((h) => (
            <Row key={h.id} entry={h} />
          ))}
        </ul>
      ) : (
        <p className="hint">Your last 10 picks will show up here.</p>
      )}
    </div>
  </aside>
);

export default History;
