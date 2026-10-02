import { useEffect, useMemo, useState } from "react";
import { Button, Input, Select, Switch } from "antd";
import { api } from "../lib/api";
import { ArrowRightIcon, BranchIcon, CheckIcon, CherryLogo, SparkleIcon, Spinner } from "./icons";

const PrPreview = ({ pr }) => (
  <div className={`pr-preview ${pr.error ? "is-error" : ""}`}>
    <span className="pr-num">#{pr.number}</span>
    {pr.error ? (
      <span className="pr-title">{pr.error}</span>
    ) : (
      <>
        <span className="pr-title">{pr.title}</span>
        <span className={`badge badge-${pr.state}`}>{pr.state}</span>
        <span className="pr-meta">
          {pr.commits} commit{pr.commits === 1 ? "" : "s"} · {pr.author}
        </span>
      </>
    )}
  </div>
);

const FREQUENT_MAX = 6;

const PickerForm = ({ auth, repo, servers, usage, running, onStart }) => {
  const [prIds, setPrIds] = useState([]);
  const [selected, setSelected] = useState([]);
  const [custom, setCustom] = useState([]); // extra branches typed as tags (not added to the server list)
  const [draft, setDraft] = useState(false);
  const [previews, setPreviews] = useState({});
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const repoOk = repo.status === "ok";
  const signedIn = !!auth?.signedIn;
  const targets = servers;
  const frequent = useMemo(
    () =>
      targets
        .filter((t) => usage[t] > 0)
        .sort((a, b) => usage[b] - usage[a] || a.localeCompare(b))
        .slice(0, FREQUENT_MAX),
    [targets, usage]
  );
  const others = targets.filter((t) => !frequent.includes(t));
  const othersSelected = others.filter((t) => selected.includes(t)).length;
  // drop selections whose chip no longer exists (e.g. the sidebar list was edited)
  const envs = [...new Set([...targets.filter((t) => selected.includes(t)), ...custom])];

  useEffect(() => {
    if (!repoOk || !signedIn || !prIds.length) return;
    const missing = prIds.filter((id) => !previews[`${repo.info.owner}/${repo.info.repo}#${id}`]);
    if (!missing.length) return;
    let live = true;
    api
      .prs(repo.info.owner, repo.info.repo, missing)
      .then((rows) => {
        if (!live) return;
        setPreviews((prev) => {
          const next = { ...prev };
          rows.forEach((r) => (next[`${repo.info.owner}/${repo.info.repo}#${r.number}`] = r));
          return next;
        });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [prIds, repoOk, signedIn, repo.info, previews]);

  const toggle = (env) =>
    setSelected((s) => (s.includes(env) ? s.filter((x) => x !== env) : [...s, env]));

  const blocker = !signedIn
    ? "Connect GitHub in the sidebar"
    : !repoOk
      ? "Choose a valid repository in the sidebar"
      : !prIds.length
        ? "Add at least one PR number"
        : !envs.length
          ? "Select at least one target branch"
          : running
            ? "A run is in progress"
            : "";

  const submit = async () => {
    if (blocker || starting) return;
    setError("");
    setStarting(true);
    const res = await onStart({ repoPath: repo.info.root, prIds, envs, draft });
    if (!res.ok) {
      setStarting(false);
      setError(res.error);
      return;
    }
    // success: stay frozen; the run view replaces this card
    // run started: the form stays frozen while it fades out; it resets when the run view replaces it
  };

  const renderChip = (t) => (
    <button
      type="button"
      key={t}
      className={`chip ${selected.includes(t) ? "is-on" : ""}`}
      aria-pressed={selected.includes(t)}
      onClick={() => toggle(t)}
    >
      {selected.includes(t) ? <CheckIcon size={12} /> : <BranchIcon size={12} />}
      {t}
    </button>
  );

  const rows = prIds.map(
    (id) => previews[`${repo.info?.owner}/${repo.info?.repo}#${id}`] || { number: id, loading: true }
  );

  return (
    <div
      className={`card card-fill ${starting ? "is-frozen" : ""}`}
      inert={starting ? "" : undefined}
      onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit()}>
      <div className="card-hero">
        <span className="hero-icon">
          <SparkleIcon />
        </span>
        <div>
          <h2>Pull requests to cherry-pick</h2>
          <p>Select PRs, choose target branches, and let Cherrypicker handle the rest.</p>
        </div>
      </div>

      <div className="card-body">
      <div className="field">
        <Select
          mode="tags"
          value={prIds}
          onChange={(vals) =>
            setPrIds([...new Set(vals.flatMap((v) => String(v).split(/[\s,#]+/)).filter((v) => /^\d+$/.test(v)))])
          }
          tokenSeparators={[",", " "]}
          open={false}
          suffixIcon={null}
          placeholder="Type PR numbers, press Enter. Paste a comma separated list too."
          style={{ width: "100%" }}
        />
        {rows.length > 0 && (
          <div className="pr-list">
            {rows.map((pr) =>
              pr.loading ? (
                <div className="pr-preview" key={pr.number}>
                  <span className="pr-num">#{pr.number}</span>
                  <Spinner size={12} />
                </div>
              ) : (
                <PrPreview pr={pr} key={pr.number} />
              )
            )}
          </div>
        )}
      </div>

      <div className="field">
        <label>
          Target branches
          {envs.length > 0 && <span className="count">{envs.length} selected</span>}
        </label>
        {frequent.length > 0 && (
          <>
            <span className="subhead">Frequently used</span>
            <div className="chips">{frequent.map(renderChip)}</div>
          </>
        )}
        {others.length > 0 &&
          (frequent.length > 0 ? (
            <details className="others" open>
              <summary>
                All other branches ({others.length})
                {othersSelected > 0 && <span className="count"> · {othersSelected} selected</span>}
              </summary>
              <div className="chips chips-scroll">{others.map(renderChip)}</div>
            </details>
          ) : (
            <div className="chips chips-scroll">{others.map(renderChip)}</div>
          ))}
        {!targets.length && (
          <span className="hint">Add servers in the sidebar, or type branches below.</span>
        )}
        <Select
          mode="tags"
          className="custom-input"
          value={custom}
          onChange={(vals) =>
            setCustom([...new Set(vals.flatMap((v) => String(v).split(/[\s,]+/)).filter(Boolean))])
          }
          tokenSeparators={[",", " "]}
          open={false}
          suffixIcon={null}
          placeholder="Other branches, e.g. a snapshot. Type a name and press Enter."
          style={{ width: "100%" }}
        />
      </div>

      {error && <p className="field-error">{error}</p>}

      </div>

      <div className="card-foot">
      <div className="actions">
        <span className="hint">{blocker || "⌘/Ctrl + Enter"}</span>
        <label className="switch-row">
          <Switch checked={draft} onChange={setDraft} size="small" />
          <span>Draft PRs</span>
        </label>
        <Button
          type="primary"
          size="large"
          className="pick-btn"
          disabled={!!blocker}
          loading={starting}
          onClick={submit}
        >
          <CherryLogo size={20} mono />
          {prIds.length ? `Cherry-pick ${prIds.length} PR${prIds.length > 1 ? "s" : ""}` : "Cherry-pick"}
          <ArrowRightIcon size={16} />
        </Button>
      </div>
      </div>
    </div>
  );
};

export default PickerForm;
