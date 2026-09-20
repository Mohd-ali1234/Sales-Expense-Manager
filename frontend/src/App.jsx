import { useCallback, useEffect, useMemo, useState } from "react";

const COLUMNS = [
  { key: "kimat_vechan", gu: "કિંમત વેચાણ", en: "Sales Value" },
  { key: "kimat_padtar", gu: "કિંમત પડતર", en: "Cost" },
  { key: "paan_vechan", gu: "પાન વેચાણ", en: "Paan Sales" },
  { key: "kharch", gu: "ખર્ચ", en: "Expenses" },
  { key: "rokda", gu: "રોકડા", en: "Cash" },
  { key: "gpay", gu: "G.Pay", en: "UPI" },
];

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({
  date: today(),
  ...Object.fromEntries(COLUMNS.map((c) => [c.key, ""])),
  kharch_note: "",
});

const inr = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const fmtDate = (iso) => {
  const [y, m, d] = iso.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    weekday: "short",
  });
};

export default function App() {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [form, setForm] = useState(emptyForm());
  const [data, setData] = useState({ entries: [], totals: {} });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/entries?month=${month}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
      setError("");
    } catch {
      setError("Cannot reach the server. Is the FastAPI backend running?");
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const liveVaapar = useMemo(
    () => (+form.gpay || 0) + (+form.rokda || 0) + (+form.kharch || 0),
    [form.gpay, form.rokda, form.kharch]
  );

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const body = { date: form.date };
    COLUMNS.forEach((c) => (body[c.key] = +form[c.key] || 0));
    body.kharch_note = form.kharch_note.trim();
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      if (form.date.slice(0, 7) !== month) setMonth(form.date.slice(0, 7));
      else await load();
      flash("Entry saved");
      setForm(emptyForm());
    } catch {
      setError("Could not save the entry.");
    } finally {
      setSaving(false);
    }
  }

  function edit(row) {
    setForm({
      date: row.date,
      ...Object.fromEntries(COLUMNS.map((c) => [c.key, row[c.key] || ""])),
      kharch_note: row.kharch_note || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(row) {
    if (!confirm(`Delete entry for ${row.date}?`)) return;
    await fetch(`/api/entries/${row.id}`, { method: "DELETE" });
    flash("Entry deleted");
    load();
  }

  const t = data.totals;

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1>Daily Ledger</h1>
          <p>Daily sales &amp; expense entries</p>
        </div>
        <div className="top-actions">
          <input
            type="month"
            className="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <button className="btn dark" onClick={() => window.print()}>
            ⬇ PDF
          </button>
        </div>
      </header>
      <div className="print-title">
        Paan Ledger — {new Date(month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
      </div>

      {error && <div className="alert">{error}</div>}

      <section className="card entry-card">
        <form onSubmit={submit}>
          <div className="entry-head">
            <h2>New Entry</h2>
            <label className="date-pill">
              <span>Date</span>
              <input type="date" value={form.date} onChange={set("date")} required />
            </label>
          </div>
          <div className="row6">
            {COLUMNS.map((c) => (
              <MoneyField
                key={c.key}
                col={c}
                value={form[c.key]}
                onChange={set(c.key)}
                note={c.key === "kharch" ? form.kharch_note : undefined}
                onNote={c.key === "kharch" ? set("kharch_note") : undefined}
              />
            ))}
          </div>
          <div className="entry-foot">
            <div className="vaapar-chip">
              <span><b className="gu">વપરાશ</b> Rokda + G.Pay + Kharch</span>
              <strong>{inr(liveVaapar)}</strong>
            </div>
            <div className="actions">
              <button type="button" className="btn ghost" onClick={() => setForm(emptyForm())}>
                Clear
              </button>
              <button className="btn primary" disabled={saving}>
                {saving ? "Saving…" : "Save Entry"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Saved Entries</h2>
            <p>
              {data.entries.length} record{data.entries.length !== 1 && "s"} for selected month
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="num">
                    <span className="gu">{c.gu}</span>
                    <small>{c.en}</small>
                  </th>
                ))}
                <th className="num vaapar-col">
                  <span className="gu">વપરાશ</span>
                  <small>Vaapar</small>
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.entries.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 3} className="empty">
                    No entries this month yet.
                  </td>
                </tr>
              )}
              {data.entries.map((r) => (
                <tr key={r.id}>
                  <td className="date">{fmtDate(r.date)}</td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className={`num ${c.key === "kharch" ? "kharch-cell" : ""}`}>
                      {inr(r[c.key])}
                      {c.key === "kharch" && r.kharch_note && (
                        <span className="cell-note" title={r.kharch_note}>📝 {r.kharch_note}</span>
                      )}
                    </td>
                  ))}
                  <td className="num vaapar-col">{inr(r.vaapar)}</td>
                  <td className="row-actions">
                    <button className="link" onClick={() => edit(r)}>
                      Edit
                    </button>
                    <button className="link danger" onClick={() => remove(r)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="num">
                    {inr(t[c.key])}
                  </td>
                ))}
                <td className="num vaapar-col">{inr(t.vaapar)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}


function MoneyField({ col, value, onChange, note, onNote }) {
  const [open, setOpen] = useState(false);
  const hasNote = onNote && note;
  return (
    <div className="mf">
      <span className="mf-l">
        <b className="gu">{col.gu}</b>
        <small>{col.en}</small>
        {onNote && (
          <button
            type="button"
            className={`note-btn ${hasNote ? "has" : ""}`}
            title="Add a note about this expense"
            onClick={() => setOpen(!open)}
          >
            {hasNote ? `📝 ${note.trim().slice(0, 6)}${note.trim().length > 6 ? "…" : ""}` : "+ Note"}
          </button>
        )}
      </span>
      {open && (
        <div className="note-pop">
          <b>What was this expense for?</b>
          <textarea
            autoFocus
            rows={3}
            maxLength={300}
            placeholder="e.g. Electricity bill, tea for staff…"
            value={note}
            onChange={onNote}
          />
          <div>
            <button type="button" className="b-btn" onClick={() => onNote({ target: { value: "" } })}>Clear</button>
            <button type="button" className="b-btn primary" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
      <div className="mf-in">
        <em>₹</em>
        <input type="number" min="0" step="any" inputMode="decimal" placeholder="0" value={value} onChange={onChange} />
      </div>
    </div>
  );
}

