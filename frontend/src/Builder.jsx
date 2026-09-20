import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  ConnectionMode,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const ITEMS = [
  { id: "kimat_padtar", gu: "કિંમત પડતર", en: "Cost", icon: "🛒", tone: "red" },
  { id: "kimat_vechan", gu: "કિંમત વેચાણ", en: "Sales Value", icon: "📊", tone: "blue" },
  { id: "paan_vechan", gu: "પાન વેચાણ", en: "Paan Sales", icon: "🌿", tone: "purple" },
  { id: "kharch", gu: "ખર્ચ", en: "Expenses", icon: "👛", tone: "amber" },
  { id: "rokda", gu: "રોકડા", en: "Cash", icon: "💵", tone: "green" },
  { id: "gpay", gu: "G.Pay", en: "Google Pay", icon: "📱", tone: "teal" },
  { id: "vaapar", gu: "વપરાશ", en: "Usage", icon: "📦", tone: "slate" },
];
const OPS = {
  sum: { name: "Add all (A + B + …)", sym: "+" },
  sub: { name: "Subtract (first − others)", sym: "−" },
  avg: { name: "Average", sym: "avg" },
};
const STORE = "pp-builder-v1";
const PATTERNS = "pp-patterns-v1";

const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const thisMonth = () => new Date().toISOString().slice(0, 7);
const shiftMonth = (m, d) => {
  const [y, mo] = m.split("-").map(Number);
  const dt = new Date(y, mo - 1 + d, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

/* ---------- custom nodes ---------- */
function Handles() {
  return (
    <>
      {[Position.Top, Position.Right, Position.Bottom, Position.Left].map((p) => (
        <Handle key={p} id={p} type="source" position={p} className="hdl" />
      ))}
    </>
  );
}

function CloseBtn({ id }) {
  const { deleteElements } = useReactFlow();
  return (
    <button className="node-x nodrag" title="Remove from canvas" onClick={() => deleteElements({ nodes: [{ id }] })}>
      ×
    </button>
  );
}

function ValueNode({ id, data }) {
  return (
    <div className={`vnode tone-${data.tone}`}>
      <Handles />
      <CloseBtn id={id} />
      <div className="vnode-ic">{data.icon}</div>
      <div className="vnode-tx">
        <b className="gu">{data.gu}</b>
        <small>{data.en}</small>
        <strong>{inr(data.amount)}</strong>
      </div>
    </div>
  );
}

function ResultNode({ id, data }) {
  const { updateNodeData } = useReactFlow();
  return (
    <div className="rnode">
      <Handles />
      <CloseBtn id={id} />
      <div className="rnode-top">
        <span>∑</span>
        <input
          className="nodrag"
          value={data.title}
          onChange={(e) => updateNodeData(id, { title: e.target.value })}
          placeholder="Name this result"
        />
      </div>
      <select className="nodrag" value={data.op} onChange={(e) => updateNodeData(id, { op: e.target.value })}>
        {Object.entries(OPS).map(([k, o]) => (
          <option key={k} value={k}>{o.name}</option>
        ))}
      </select>
      <strong className="rnode-val">{inr(data.value)}</strong>
      <small>{data.count ? `from ${data.count} connected value${data.count > 1 ? "s" : ""}` : "Connect values to me"}</small>
    </div>
  );
}

function RatioEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd }) {
  const [path, lx, ly] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const { deleteElements } = useReactFlow();
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ stroke: "#5b7bd5", strokeWidth: 2 }} />
      <EdgeLabelRenderer>
        <div className="edge-label nodrag nopan" style={{ transform: `translate(-50%,-50%) translate(${lx}px,${ly}px)` }}>
          {data?.label}
          <button title="Remove link" onClick={() => deleteElements({ edges: [{ id }] })}>×</button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { value: ValueNode, result: ResultNode };
const edgeTypes = { ratio: RatioEdge };

/* ---------- calculation ---------- */
function calculate(nodes, edges, totals) {
  const amt = {};
  nodes.forEach((n) => {
    if (n.type === "value") amt[n.id] = n.data.key ? totals[n.data.key] || 0 : n.data.amount || 0;
  });
  const res = {};
  nodes.filter((n) => n.type === "result").forEach((n) => {
    const ids = [
      ...new Set(
        edges
          .filter((e) => e.source === n.id || e.target === n.id)
          .map((e) => (e.source === n.id ? e.target : e.source))
          .filter((o) => o in amt)
      ),
    ];
    const vals = ids.map((i) => amt[i]);
    let v = 0;
    if (n.data.op === "sub") v = vals.length ? vals[0] - vals.slice(1).reduce((a, b) => a + b, 0) : 0;
    else if (n.data.op === "avg") v = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    else v = vals.reduce((a, b) => a + b, 0);
    amt[n.id] = v;
    res[n.id] = { ids, count: vals.length };
  });
  return { amt, res };
}

/* ---------- page ---------- */
function BuilderInner() {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [month, setMonth] = useState(thisMonth());
  const [totals, setTotals] = useState({});
  const [error, setError] = useState("");
  const saved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
  }, []);
  const [nodes, setNodes] = useState(saved.nodes || []);
  const [edges, setEdges] = useState(saved.edges || []);
  const [customs, setCustoms] = useState(saved.customs || []);
  const [cName, setCName] = useState("");
  const [cAmt, setCAmt] = useState("");
  const [pop, setPop] = useState("");
  const [pName, setPName] = useState("");
  const [toast, setToast] = useState("");
  const [patterns, setPatterns] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PATTERNS)) || []; } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(PATTERNS, JSON.stringify(patterns)); } catch {}
  }, [patterns]);

  const flash = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2200);
  };

  function savePattern(e) {
    e.preventDefault();
    const name = pName.trim() || `Pattern ${patterns.length + 1}`;
    const usedCustoms = customs.filter((c) => nodes.some((n) => n.id === c.id));
    setPatterns((p) => [
      { id: `p_${Date.now()}`, name, nodes, edges, customs: usedCustoms },
      ...p.filter((x) => x.name !== name),
    ]);
    setPop("");
    flash(`Saved “${name}”`);
  }

  function loadPattern(p) {
    setNodes(p.nodes);
    setEdges(p.edges);
    setCustoms((c) => [...c, ...p.customs.filter((x) => !c.some((y) => y.id === x.id))]);
    setPop("");
    flash(`Loaded “${p.name}”`);
  }

  const deletePattern = (id) => confirm("Delete this saved pattern?") && setPatterns((p) => p.filter((x) => x.id !== id));

  useEffect(() => {
    fetch(`/api/entries?month=${month}`)
      .then((r) => r.json())
      .then((d) => { setTotals(d.totals || {}); setError(""); })
      .catch(() => setError("Cannot reach the server."));
  }, [month]);

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify({ nodes, edges, customs })); } catch {}
  }, [nodes, edges, customs]);

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.25, minZoom: 0.7, maxZoom: 1.2, duration: 300 }), 50);
    return () => clearTimeout(t);
  }, [nodes.length, fitView]);

  const { amt, res } = useMemo(() => calculate(nodes, edges, totals), [nodes, edges, totals]);

  const viewNodes = useMemo(
    () =>
      nodes.map((n) =>
        n.type === "result"
          ? { ...n, data: { ...n.data, value: amt[n.id], count: res[n.id]?.count || 0 } }
          : { ...n, data: { ...n.data, amount: amt[n.id] } }
      ),
    [nodes, amt, res]
  );

  const viewEdges = useMemo(
    () =>
      edges.map((e) => {
        const isRes = (id) => nodes.find((n) => n.id === id)?.type === "result";
        let label;
        if (isRes(e.source) || isRes(e.target)) {
          const r = nodes.find((n) => n.id === (isRes(e.source) ? e.source : e.target));
          const other = e.source === r.id ? e.target : e.source;
          const idx = res[r.id]?.ids.indexOf(other);
          label = r.data.op === "sub" ? (idx === 0 ? "start" : "−") : OPS[r.data.op].sym;
        } else {
          const p = amt[e.source] ? (amt[e.target] / amt[e.source]) * 100 : null;
          label = p === null ? "—" : `${p.toFixed(2)}% of`;
        }
        return { ...e, type: "ratio", data: { label }, markerEnd: { type: MarkerType.ArrowClosed, color: "#5b7bd5" } };
      }),
    [edges, nodes, amt, res]
  );

  const onNodesChange = useCallback((c) => setNodes((n) => applyNodeChanges(c, n)), []);
  const onEdgesChange = useCallback((c) => setEdges((e) => applyEdgeChanges(c, e)), []);
  const onConnect = useCallback((c) => setEdges((e) => addEdge({ ...c, id: `e_${Date.now()}` }, e)), []);

  const allItems = [...ITEMS, ...customs];
  const onCanvas = new Set(nodes.map((n) => n.id));

  function addItem(item, position) {
    if (onCanvas.has(item.id)) return;
    const pos = position || { x: (nodes.length % 3) * 300, y: Math.floor(nodes.length / 3) * 190 };
    setNodes((n) => [
      ...n,
      {
        id: item.id,
        type: "value",
        position: pos,
        data: { key: item.custom ? null : item.id, amount: item.amount, gu: item.gu, en: item.en, icon: item.icon, tone: item.tone },
      },
    ]);
  }

  function addResult(position) {
    const id = `r_${Date.now()}`;
    const pos = position || { x: 120 + (nodes.length % 3) * 40, y: 320 };
    setNodes((n) => [...n, { id, type: "result", position: pos, data: { title: "Total", op: "sum" } }]);
  }

  function onDrop(e) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/pp");
    if (!raw) return;
    const { id } = JSON.parse(raw);
    const pos = screenToFlowPosition({ x: e.clientX - 90, y: e.clientY - 35 });
    if (id === "__result") return addResult(pos);
    const item = allItems.find((i) => i.id === id);
    if (item) addItem(item, pos);
  }

  function addCustom(e) {
    e.preventDefault();
    if (!cName.trim()) return;
    setCustoms((c) => [
      ...c,
      { id: `c_${Date.now()}`, custom: true, gu: cName.trim(), en: "My container", icon: "⭐", tone: "pink", amount: +cAmt || 0 },
    ]);
    setCName("");
    setCAmt("");
  }

  function removeCustom(id) {
    setCustoms((c) => c.filter((i) => i.id !== id));
    setNodes((n) => n.filter((x) => x.id !== id));
    setEdges((e) => e.filter((x) => x.source !== id && x.target !== id));
  }

  const results = nodes.filter((n) => n.type === "result");
  const drag = (id) => (e) => {
    e.dataTransfer.setData("application/pp", JSON.stringify({ id }));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="builder">
      <header className="b-top">
        <div className="b-title">
          <div className="b-logo">🧮</div>
          <div>
            <h1>Monthly Calculation Builder</h1>
            <p>Drag values, connect them and see the relationship</p>
          </div>
        </div>
        <div className="b-actions">
          <div className="monthnav">
            <button onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
            <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            <button onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
          </div>
          <div className="pop-wrap">
            <button className="b-btn" onClick={() => { setPop(pop === "save" ? "" : "save"); setPName(""); }}>💾 Save Pattern</button>
            {pop === "save" && (
              <form className="pop" onSubmit={savePattern}>
                <b>Save this pattern</b>
                <small>Saves the boxes, links and your custom containers.</small>
                <input autoFocus placeholder="Pattern name (e.g. Profit check)" value={pName} onChange={(e) => setPName(e.target.value)} />
                <button className="b-btn primary" disabled={!nodes.length}>{nodes.length ? "Save" : "Canvas is empty"}</button>
              </form>
            )}
          </div>
          <div className="pop-wrap">
            <button className="b-btn" onClick={() => setPop(pop === "list" ? "" : "list")}>
              📂 My Patterns{patterns.length ? ` (${patterns.length})` : ""}
            </button>
            {pop === "list" && (
              <div className="pop">
                <b>My saved patterns</b>
                {patterns.length === 0 && <small>Nothing saved yet. Build something and press “Save Pattern”.</small>}
                {patterns.map((p) => (
                  <div className="pat" key={p.id}>
                    <button className="pat-load" onClick={() => loadPattern(p)}>
                      <span>{p.name}</span>
                      <small>{p.nodes.length} boxes · {p.edges.length} links</small>
                    </button>
                    <button className="pat-del" title="Delete pattern" onClick={() => deletePattern(p.id)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="b-btn" onClick={() => confirm("Clear everything on the canvas?") && (setNodes([]), setEdges([]))}>
            🗑 Clear Canvas
          </button>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <div className="b-main">
        <aside className="b-side">
          <h3>Available Values</h3>
          <p className="hint">Drag onto the canvas, or tap +</p>
          <div className="b-list">
            {allItems.map((it) => {
              const used = onCanvas.has(it.id);
              const val = it.custom ? it.amount : totals[it.id];
              return (
                <div
                  key={it.id}
                  className={`item tone-${it.tone} ${used ? "used" : ""}`}
                  draggable={!used}
                  onDragStart={drag(it.id)}
                >
                  <span className="item-ic">{it.icon}</span>
                  <div className="item-tx">
                    <b className="gu">{it.gu}</b>
                    <small>{it.en}</small>
                    <strong>{inr(val)}</strong>
                  </div>
                  {used ? (
                    <span className="tick">✓</span>
                  ) : (
                    <button className="plus" title="Add to canvas" onClick={() => addItem(it)}>+</button>
                  )}
                  {it.custom && <button className="del" title="Delete container" onClick={() => removeCustom(it.id)}>×</button>}
                </div>
              );
            })}
          </div>

          <h3 className="mt">Result Box</h3>
          <div className="item rbox" draggable onDragStart={drag("__result")}>
            <span className="item-ic">∑</span>
            <div className="item-tx">
              <b>Total / Result</b>
              <small>Adds or subtracts what you connect</small>
            </div>
            <button className="plus" onClick={() => addResult()}>+</button>
          </div>

          <h3 className="mt">Create Your Own</h3>
          <form className="custom" onSubmit={addCustom}>
            <input placeholder="Name (e.g. Rent)" value={cName} onChange={(e) => setCName(e.target.value)} />
            <input type="number" min="0" placeholder="Amount ₹" value={cAmt} onChange={(e) => setCAmt(e.target.value)} />
            <button className="b-btn primary">+ Create container</button>
          </form>
        </aside>

        <div className="b-canvas" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          <ReactFlow
            nodes={viewNodes}
            edges={viewEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            connectionMode={ConnectionMode.Loose}
            fitView
            fitViewOptions={{ padding: 0.25, minZoom: 0.7, maxZoom: 1.2 }}
            minZoom={0.4}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={22} size={1.4} color="#cfd6cc" />
            <Controls showInteractive={false} />
          </ReactFlow>
          {nodes.length === 0 && (
            <div className="empty-hint">
              <div className="dropbox">
                <span>👆</span>
                <b>Drag values here</b>
                <small>Then pull a line from one box’s dot to another to see how they relate</small>
              </div>
            </div>
          )}
          <div className="how">
            <b>How it works</b>
            <span>1 · Drag values in</span>
            <span>2 · Drag from a dot to another box</span>
            <span>3 · Read the % or add a Result box</span>
          </div>
        </div>
      </div>

      <footer className="b-foot">
        <b>Results</b>
        {results.length === 0 ? (
          <span className="muted">No result yet — add a “Result Box”, then connect values to it to get a total.</span>
        ) : (
          results.map((r) => (
            <div className="chip" key={r.id}>
              <span>{r.data.title || "Result"}</span>
              <strong>{inr(amt[r.id])}</strong>
            </div>
          ))
        )}
      </footer>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default function Builder() {
  return (
    <ReactFlowProvider>
      <BuilderInner />
    </ReactFlowProvider>
  );
}


