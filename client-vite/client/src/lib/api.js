const request = async (method, url, body) => {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
};

export const api = {
  config: () => request("GET", "/api/config"),
  auth: () => request("GET", "/api/auth"),
  authGh: () => request("POST", "/api/auth/gh"),
  authToken: (token) => request("POST", "/api/auth/token", { token }),
  logout: () => request("POST", "/api/auth/logout"),
  browseRepo: () => request("POST", "/api/repo/browse"),
  inspectRepo: (path) => request("POST", "/api/repo/inspect", { path }),
  prs: (owner, repo, ids) => request("POST", "/api/prs", { owner, repo, ids }),
};
