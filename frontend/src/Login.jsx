import { useState } from "react";
import { login } from "./auth.js";

export default function Login({ onDone }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onDone(await login(username.trim(), password));
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Cannot reach the server." : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <img src="/logo.svg" alt="" className="login-logo" />
        <h1>Paan Ledger</h1>
        <p>Sign in to your sales &amp; expense manager</p>

        <label>
          <span>ID</span>
          <input
            autoFocus
            autoComplete="username"
            placeholder="Enter your ID"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label>
          <span>Password</span>
          <div className="pw">
            <input
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShow(!show)} tabIndex={-1}>
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {error && <div className="login-err">{error}</div>}

        <button className="btn primary login-btn" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
