// Token storage + a fetch wrapper that adds the Authorization header to /api calls.
const KEY = "pp-token";

export const getToken = () => {
  try { return localStorage.getItem(KEY) || ""; } catch { return ""; }
};
export const setToken = (t) => {
  try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch {}
};

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

const rawFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const isApi = url.startsWith("/api/") && !url.startsWith("/api/login");
  if (isApi && getToken()) {
    init = { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${getToken()}` } };
  }
  const res = await rawFetch(input, init);
  if (isApi && res.status === 401) onUnauthorized();
  return res;
};

export async function login(username, password) {
  const res = await rawFetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    let msg = "Wrong ID or password";
    try { msg = (await res.json()).detail || msg; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  setToken(data.token);
  return data.username;
}

export const logout = () => setToken("");
