import { useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import { parseServers, useSettings } from "./lib/useSettings";
import { useJob } from "./lib/useJob";
import Sidebar from "./components/Sidebar";
import PickerForm from "./components/PickerForm";
import JobView from "./components/JobView";
import History from "./components/History";
import SwapCard from "./components/SwapCard";
import BrandName from "./components/BrandName";
import { useMediaQuery } from "./lib/useMediaQuery";
import { CherryLogo, HistoryIcon, MenuIcon } from "./components/icons";
import { useHistory } from "./lib/useHistory";

const useRepo = (path) => {
  const [repo, setRepo] = useState({ status: "idle", info: null, error: "" });
  useEffect(() => {
    if (!path.trim()) {
      setRepo({ status: "idle", info: null, error: "" });
      return;
    }
    setRepo((r) => ({ ...r, status: "checking", error: "" }));
    let live = true;
    const t = setTimeout(() => {
      api
        .inspectRepo(path)
        .then((info) => live && setRepo({ status: "ok", info, error: "" }))
        .catch((e) => live && setRepo({ status: "error", info: null, error: e.message }));
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [path]);
  return repo;
};

const App = () => {
  const [defaults, setDefaults] = useState(null);
  const [auth, setAuth] = useState(null);
  const [settings, update] = useSettings(defaults);
  const repo = useRepo(settings.repoPath);
  const { job, log, connected, start, cancel, dismiss } = useJob();
  const { history, usage, clearHistory } = useHistory(job);
  const narrow = useMediaQuery("(max-width: 1100px)");
  const [drawer, setDrawer] = useState(null); // narrow screens: "left" | "right" | null
  const persisted = (key) => {
    try {
      return localStorage.getItem(key) === "collapsed";
    } catch {
      return false;
    }
  };
  const [leftCollapsed, setLeftCollapsed] = useState(() => persisted("cherrypicker.sidebar"));
  const [rightCollapsed, setRightCollapsed] = useState(() => persisted("cherrypicker.history"));
  const flip = (setter, key) => () =>
    setter((c) => {
      try {
        localStorage.setItem(key, c ? "open" : "collapsed");
      } catch {
        /* ignore */
      }
      return !c;
    });
  const toggleLeft = narrow ? () => setDrawer(null) : flip(setLeftCollapsed, "cherrypicker.sidebar");
  const toggleRight = narrow ? () => setDrawer(null) : flip(setRightCollapsed, "cherrypicker.history");

  useEffect(() => {
    if (!narrow) setDrawer(null);
  }, [narrow]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setDrawer(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const servers = useMemo(() => parseServers(settings.serversText), [settings.serversText]);

  const refreshAuth = () => api.auth().then(setAuth).catch(() => setAuth({ signedIn: false }));
  useEffect(() => {
    api.config().then(setDefaults).catch(() => setDefaults({}));
    refreshAuth();
  }, []);

  const running = job?.status === "running";

  return (
    <div className={`layout ${leftCollapsed ? "left-collapsed" : ""} ${rightCollapsed ? "right-collapsed" : ""}`}>
      <header className="topbar">
        <button className="icon-btn" onClick={() => setDrawer("left")} aria-label="Open settings">
          <MenuIcon size={18} />
        </button>
        <span className="topbar-brand">
          <CherryLogo size={26} />
          <BrandName />
        </span>
        <button className="icon-btn" onClick={() => setDrawer("right")} aria-label="Open recent picks">
          <HistoryIcon size={18} />
        </button>
      </header>
      <div className={`scrim ${drawer ? "is-on" : ""}`} onClick={() => setDrawer(null)} />

      <Sidebar
        auth={auth}
        refreshAuth={refreshAuth}
        settings={settings}
        update={update}
        repo={repo}
        collapsed={leftCollapsed}
        onToggle={toggleLeft}
        narrow={narrow}
        open={drawer === "left"}
      />
      <main className="main">
        {!connected && <div className="banner">Lost connection to the local server. Reconnecting…</div>}
        <SwapCard
          side={job ? "back" : "front"}
          front={
            <PickerForm
              auth={auth}
              repo={repo}
              servers={servers}
              usage={usage}
              running={running}
              onStart={start}
            />
          }
          back={job && <JobView job={job} log={log} onCancel={cancel} onDismiss={dismiss} />}
        />
      </main>
      <History
        history={history}
        onClear={clearHistory}
        collapsed={rightCollapsed}
        onToggle={toggleRight}
        narrow={narrow}
        open={drawer === "right"}
      />
    </div>
  );
};

export default App;
