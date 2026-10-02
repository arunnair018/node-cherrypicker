import { useState } from "react";
import { Button, Input, Space } from "antd";
import { api } from "../lib/api";
import { parseServers } from "../lib/useSettings";
import { ChevronIcon, CherryLogo, XIcon, FolderIcon, GithubIcon, ServerIcon, Spinner } from "./icons";

const SOURCE_LABEL = { gh: "GitHub CLI", token: "access token", env: ".env token" };

// Initials until (and unless) the GitHub avatar loads, so there's never a broken-image icon.
const Avatar = ({ user }) => {
  const [loaded, setLoaded] = useState(false);
  const initials = (user.name || user.login || "?")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <span className="avatar" aria-hidden="true">
      <span className="avatar-initials">{initials}</span>
      {user.avatar && (
        <img
          src={user.avatar}
          alt=""
          className={loaded ? "is-loaded" : ""}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      )}
    </span>
  );
};

const Section = ({ icon, title, aside, children }) => (
  <section className="side-section">
    <h3>
      {icon}
      {title}
      {aside != null && <span className="side-aside">{aside}</span>}
    </h3>
    {children}
  </section>
);

const Account = ({ auth, onChange }) => {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const run = async (kind, fn) => {
    setBusy(kind);
    setError("");
    try {
      await fn();
      setToken("");
      await onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  if (!auth) return <Spinner />;

  if (auth.signedIn) {
    return (
      <div className="account">
        <Avatar user={auth.user} />
        <div className="account-meta">
          <strong>{auth.user.login}</strong>
          <span>via {SOURCE_LABEL[auth.source] || auth.source}</span>
        </div>
        <Button size="small" type="text" onClick={() => run("out", api.logout)}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="stack">
      <Button block loading={busy === "gh"} onClick={() => run("gh", api.authGh)}>
        Use GitHub CLI session
      </Button>
      <div className="or">or paste a token</div>
      <Input.Password
        placeholder="ghp_… (needs repo scope)"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        onPressEnter={() => token && run("token", () => api.authToken(token))}
        autoComplete="off"
      />
      <Button
        type="primary"
        block
        disabled={!token}
        loading={busy === "token"}
        onClick={() => run("token", () => api.authToken(token))}
      >
        Connect
      </Button>
      {error && <p className="field-error">{error}</p>}
      <p className="hint">The token stays in memory on your machine. It's never written to disk.</p>
    </div>
  );
};

const Repository = ({ settings, update, repo }) => {
  const [browsing, setBrowsing] = useState(false);
  const [browseError, setBrowseError] = useState("");

  const browse = async () => {
    setBrowsing(true);
    setBrowseError("");
    try {
      const { path } = await api.browseRepo();
      if (path) update({ repoPath: path });
    } catch (e) {
      setBrowseError(e.message);
    } finally {
      setBrowsing(false);
    }
  };

  return (
  <div className="stack">
    <Space.Compact block>
      <Input
        value={settings.repoPath}
        onChange={(e) => update({ repoPath: e.target.value })}
        placeholder="/path/to/your/clone"
        spellCheck={false}
        status={repo.status === "error" ? "error" : undefined}
        suffix={repo.status === "checking" ? <Spinner size={14} /> : null}
      />
      <Button icon={<FolderIcon size={14} />} loading={browsing} onClick={browse} title="Choose a folder">
        Browse
      </Button>
    </Space.Compact>
    {browseError && <p className="field-error">{browseError}</p>}
    {repo.status === "error" && <p className="field-error">{repo.error}</p>}
    {repo.status === "ok" && (
      <div className="repo-ok">
        <div className="repo-name">
          <GithubIcon size={14} />
          {repo.info.owner}/{repo.info.repo}
        </div>
        <div className="hint">
          default <code>{repo.info.defaultBranch}</code> · on <code>{repo.info.currentBranch}</code>
          {repo.info.dirty && " (has local changes)"}
        </div>
        <div className="hint">Runs in a temporary worktree, so your checkout and changes are never touched.</div>
      </div>
    )}
  </div>
  );
};

const Servers = ({ settings, update }) => {
  const servers = parseServers(settings.serversText);
  return (
    <div className="stack">
      <Input.TextArea
        rows={2}
        value={settings.serversText}
        onChange={(e) => update({ serversText: e.target.value })}
        placeholder="staging production release-1.2"
        spellCheck={false}
        autoSize={{ minRows: 2 }}
      />
      {!servers.length && <p className="hint">Separate branch names with spaces. They become one-click targets.</p>}
    </div>
  );
};

const Sidebar = ({ auth, refreshAuth, settings, update, repo, collapsed, onToggle, narrow, open }) => (
  <aside className={`sidebar ${collapsed ? "is-collapsed" : ""} ${open ? "is-open" : ""}`}>
    <div className="brand">
      <CherryLogo size={34} />
      <span className="brand-text">Cherrypicker</span>
      <button
        className="icon-btn collapse-btn"
        onClick={onToggle}
        aria-label={narrow ? "Close panel" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={narrow ? "Close" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {narrow ? <XIcon size={14} /> : <ChevronIcon size={14} direction={collapsed ? "right" : "left"} />}
      </button>
    </div>
    <div className="side-body">
      <Section icon={<GithubIcon />} title="GitHub">
        <Account auth={auth} onChange={refreshAuth} />
      </Section>
      <Section icon={<FolderIcon />} title="Repository">
        <Repository settings={settings} update={update} repo={repo} />
      </Section>
      <Section icon={<ServerIcon />} title="Servers" aside={parseServers(settings.serversText).length || null}>
        <Servers settings={settings} update={update} />
      </Section>
    </div>
  </aside>
);

export default Sidebar;
