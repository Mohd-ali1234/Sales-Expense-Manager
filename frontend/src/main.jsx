import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Builder from "./Builder.jsx";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/hind-vadodara/400.css";
import "@fontsource/hind-vadodara/500.css";
import "@fontsource/hind-vadodara/600.css";
import "@fontsource/hind-vadodara/700.css";
import "./styles.css";
import "./builder.css";

function UpdateBar({ upd }) {
  const d = window.desktop;
  if (!upd || !["available", "downloading", "ready"].includes(upd.state)) return null;
  return (
    <div className={`update-bar ${upd.state}`}>
      {upd.state === "available" && (
        <>
          <span>
            🎉 <b>New version {upd.version}</b> of Paan Ledger is available.
          </span>
          <button onClick={() => d.downloadUpdate()}>Download update</button>
        </>
      )}
      {upd.state === "downloading" && (
        <>
          <span>Downloading update… {upd.percent}%</span>
          <div className="upd-prog">
            <i style={{ width: `${upd.percent}%` }} />
          </div>
        </>
      )}
      {upd.state === "ready" && (
        <>
          <span>✅ Version {upd.version} is ready to install.</span>
          <button onClick={() => d.installUpdate()}>Restart &amp; update</button>
        </>
      )}
    </div>
  );
}

const CHECK_LABEL = {
  checking: "Checking…",
  none: "Up to date ✓",
  dev: "Dev mode",
  error: "Check failed — retry",
};

function Shell() {
  const d = window.desktop;
  const [version, setVersion] = useState("");
  const [upd, setUpd] = useState(null);
  const [page, setPage] = useState(() => localStorage.getItem("pp-page") || "ledger");

  useEffect(() => {
    if (!d) return;
    d.getVersion().then(setVersion);
    return d.onUpdate(setUpd);
  }, []);

  const go = (p) => {
    setPage(p);
    try { localStorage.setItem("pp-page", p); } catch {}
  };

  return (
    <>
      <UpdateBar upd={upd} />
      <header className="navbar">
        <div className="navbar-in">
          <div className="nb-brand">
            <img className="nb-logo" src="/logo.svg" alt="" />
            <div>
              <b>Paan Ledger</b>
              <small>Sales &amp; expense manager</small>
            </div>
          </div>
          <nav className="nb-links">
            <button className={page === "ledger" ? "on" : ""} onClick={() => go("ledger")}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" /><path d="M8 8h6M8 12h6" /></svg>
              <span>Daily Ledger</span>
            </button>
            <button className={page === "builder" ? "on" : ""} onClick={() => go("builder")}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="8" r="2.5" /><circle cx="9" cy="18" r="2.5" /><path d="M8.3 7l7.4.6M7 8.3l1.3 7.4M16.6 10.3l-5.4 6" /></svg>
              <span>Calculation Builder</span>
            </button>
          </nav>
          {d && (
            <div className="nb-ver">
              <span>v{version}</span>
              <button
                onClick={() => d.checkUpdates()}
                disabled={upd?.state === "checking" || upd?.state === "downloading"}
              >
                {CHECK_LABEL[upd?.state] || "Check for updates"}
              </button>
            </div>
          )}
        </div>
      </header>
      {page === "ledger" ? <App /> : <Builder />}
    </>
  );
}

createRoot(document.getElementById("root")).render(<Shell />);
