import os
import sqlite3
import sys
from contextlib import contextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Where the SQLite file lives. The desktop app points this at the user data folder.
DATA_DIR = Path(os.environ.get("PP_DATA_DIR", Path(__file__).parent))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "pan_parlour.db"

app = FastAPI(title="Pan Parlour API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MONEY_FIELDS = ["kimat_vechan", "kimat_padtar", "paan_vechan", "kharch", "rokda", "gpay"]


@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


with db() as conn:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            kimat_vechan REAL NOT NULL DEFAULT 0,
            kimat_padtar REAL NOT NULL DEFAULT 0,
            paan_vechan REAL NOT NULL DEFAULT 0,
            kharch REAL NOT NULL DEFAULT 0,
            rokda REAL NOT NULL DEFAULT 0,
            gpay REAL NOT NULL DEFAULT 0,
            kharch_note TEXT NOT NULL DEFAULT ''
        )
        """
    )
    cols = [r["name"] for r in conn.execute("PRAGMA table_info(entries)")]
    if "kharch_note" not in cols:
        conn.execute("ALTER TABLE entries ADD COLUMN kharch_note TEXT NOT NULL DEFAULT ''")


class EntryIn(BaseModel):
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    kimat_vechan: float = Field(0, ge=0)
    kimat_padtar: float = Field(0, ge=0)
    paan_vechan: float = Field(0, ge=0)
    kharch: float = Field(0, ge=0)
    rokda: float = Field(0, ge=0)
    gpay: float = Field(0, ge=0)
    kharch_note: str = Field("", max_length=300)


def to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    # Vaapar is always derived: G.Pay + Rokda + Kharch
    d["vaapar"] = d["gpay"] + d["rokda"] + d["kharch"]
    return d


def totals(rows: list[dict]) -> dict:
    return {f: sum(r[f] for r in rows) for f in MONEY_FIELDS + ["vaapar"]}


@app.get("/api/entries")
def list_entries(month: str = Query(pattern=r"^\d{4}-\d{2}$")):
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM entries WHERE date LIKE ? ORDER BY date", (month + "-%",)
        ).fetchall()
    items = [to_dict(r) for r in rows]
    return {"entries": items, "totals": totals(items)}


@app.post("/api/entries")
def save_entry(entry: EntryIn):
    """Create or overwrite the entry for a date (one entry per day)."""
    with db() as conn:
        conn.execute(
            """
            INSERT INTO entries (date, kimat_vechan, kimat_padtar, paan_vechan, kharch, rokda, gpay, kharch_note)
            VALUES (:date, :kimat_vechan, :kimat_padtar, :paan_vechan, :kharch, :rokda, :gpay, :kharch_note)
            ON CONFLICT(date) DO UPDATE SET
                kimat_vechan=excluded.kimat_vechan,
                kimat_padtar=excluded.kimat_padtar,
                paan_vechan=excluded.paan_vechan,
                kharch=excluded.kharch,
                rokda=excluded.rokda,
                gpay=excluded.gpay,
                kharch_note=excluded.kharch_note
            """,
            entry.model_dump(),
        )
        row = conn.execute("SELECT * FROM entries WHERE date = ?", (entry.date,)).fetchone()
    return to_dict(row)


@app.delete("/api/entries/{entry_id}")
def delete_entry(entry_id: int):
    with db() as conn:
        cur = conn.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
    if cur.rowcount == 0:
        raise HTTPException(404, "Entry not found")
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"ok": True}


def _static_dir():
    """Built React app: bundled next to the exe, or frontend/dist in a source checkout."""
    bundled = Path(getattr(sys, "_MEIPASS", Path(__file__).parent)) / "static"
    source = Path(__file__).parent.parent / "frontend" / "dist"
    for p in (bundled, source):
        if (p / "index.html").exists():
            return p
    return None


# Must stay last so the /api routes above win.
_static = _static_dir()
if _static:
    app.mount("/", StaticFiles(directory=_static, html=True), name="static")
