import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";

// One socket for the page's lifetime. The server owns the job and re-sends a full
// snapshot on every (re)connect, so a refresh or dropped connection just resyncs.
const socket = io({ transports: ["websocket", "polling"] });

export const useJob = () => {
  const [job, setJob] = useState(null);
  const [log, setLog] = useState([]);
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onSnapshot = (snap) => {
      setJob(snap?.job ?? null);
      setLog(snap?.log ?? []);
    };
    const onLog = (line) => setLog((prev) => [...prev.slice(-499), line]);
    const on = (ev, fn) => socket.on(ev, fn);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    on("job:snapshot", onSnapshot);
    on("job:update", setJob);
    on("job:log", onLog);
    on("connect", onConnect);
    on("disconnect", onDisconnect);
    return () => {
      socket.off("job:snapshot", onSnapshot);
      socket.off("job:update", setJob);
      socket.off("job:log", onLog);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  const start = useCallback(
    (params) =>
      new Promise((resolve) => {
        if (!socket.connected) return resolve({ ok: false, error: "Not connected to the server." });
        socket.timeout(15000).emit("job:start", params, (err, res) =>
          resolve(err ? { ok: false, error: "The server didn't respond." } : res)
        );
      }),
    []
  );
  const cancel = useCallback(() => socket.emit("job:cancel"), []);
  // forget a finished job on the server too, so a page refresh doesn't bring it back
  const dismiss = useCallback(() => {
    socket.emit("job:dismiss");
    setJob(null);
    setLog([]);
  }, []);

  return { job, log, connected, start, cancel, dismiss };
};
