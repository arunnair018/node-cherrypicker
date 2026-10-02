// This tool drives your local git and a GitHub token, so only the browser tab served
// by this very process (localhost) may talk to it: blocks other websites and DNS rebinding.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export const isLocalHost = (host = "") => LOCAL_HOST.test(host);

export const isLocalOrigin = (origin) => {
  if (!origin) return true; // same-origin GETs and non-browser clients send none
  try {
    return isLocalHost(new URL(origin).host);
  } catch {
    return false;
  }
};

export const localOnly = (req, res, next) => {
  if (!isLocalHost(req.headers.host) || !isLocalOrigin(req.headers.origin)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};
