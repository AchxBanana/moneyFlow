import { useState, useMemo, useEffect } from "react";

const DEFAULT_METHODS = [
  { id: "kplus", label: "K PLUS", dot: "#2D7A4F" },
  { id: "cash", label: "เงินสด", dot: "#B8976A" },
  { id: "true", label: "True money", dot: "#7B5EA7" },
  { id: "Thaiplus", label: "ไทยช่วยไทย", dot: "#3A6FD8" },
  { id: "other", label: "อื่นๆ", dot: "#999" },
];

const CATS = [
  { id: "food", label: "อาหาร", icon: "🍜" },
  { id: "coffee", label: "กาแฟ", icon: "☕" },
  { id: "transport", label: "เดินทาง", icon: "🚗" },
  { id: "shopping", label: "ช้อปปิ้ง", icon: "🛍" },
  { id: "personal", label: "ของใช้ส่วนตัว", icon: "👨‍💻" },
  { id: "health", label: "สุขภาพ", icon: "💊" },
  { id: "entertainment", label: "บันเทิง", icon: "🎬" },
  { id: "bills", label: "ค่าบริการ", icon: "📱" },
  { id: "income", label: "รายรับ", icon: "💼" },
  { id: "other", label: "อื่นๆ", icon: "·" },
];

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const fmt = n => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DOT_PRESETS = ["#2D7A4F", "#B8976A", "#7B5EA7", "#3A6FD8", "#C0392B", "#D98A1F", "#1B998B", "#9B5DE5", "#5B6470", "#999999"];
const slugify = (label, existingIds) => {
  let base = (label || "method").trim().toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-+|-+$/g, "") || "method";
  let id = base, n = 1;
  while (existingIds.includes(id)) id = `${base}-${++n}`;
  return id;
};

const SEED = [
  { id: 1, type: "expense", amount: 85, desc: "ข้าวกะเพราไข่ดาว", category: "food", method: "cash", date: "2026-06-01" },
  { id: 2, type: "expense", amount: 350, desc: "เติมน้ำมัน", category: "transport", method: "kplus", date: "2026-06-02" },
  { id: 3, type: "income", amount: 35000, desc: "เงินเดือน", category: "income", method: "kplus", date: "2026-06-01" },
  { id: 4, type: "expense", amount: 1290, desc: "Netflix", category: "entertainment", method: "true", date: "2026-06-03" },
  { id: 5, type: "expense", amount: 450, desc: "ยา + หน้ากาก", category: "health", method: "other", date: "2026-06-04" },
  { id: 6, type: "expense", amount: 599, desc: "เสื้อผ้า", category: "shopping", method: "kplus", date: "2026-06-05" },
];

// ── PALETTE ──────────────────────────────────────────────
const C = {
  bg: "#F8F5F0",
  surface: "#FFFFFF",
  border: "#EAE6DF",
  divider: "#F0ECE6",
  text: "#1C1A17",
  sub: "#6B6560",
  muted: "#ADA8A2",
  accent: "#1C1A17",
  income: "#2D7A4F",
  expense: "#B83232",
  tag: "#F0ECE6",
};

const mono = { fontFamily: "'DM Mono','Courier New',monospace" };
const card = { background: C.surface, borderRadius: 14, border: `1px solid ${C.border}` };
const lbl = { fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted };

const GLOBAL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 0; height: 4px; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
  input, select, button { font-family: inherit; }
  input[type=date]::-webkit-calendar-picker-indicator { opacity: 0.4; cursor: pointer; }
  button { cursor: pointer; }
`;

export default function App() {
  const [txs, setTxs] = useState(() => {
    try {
      const saved = localStorage.getItem('moneyflow-txs');
      return saved ? JSON.parse(saved) : SEED;
    } catch { return SEED; }
  });
  const [methods, setMethods] = useState(() => {
    try {
      const saved = localStorage.getItem('moneyflow-methods');
      return saved ? JSON.parse(saved) : DEFAULT_METHODS;
    } catch { return DEFAULT_METHODS; }
  });
  const [view, setView] = useState("home");   // home | summary | add | methods
  const [month, setMonth] = useState(5);
  const [filterM, setFilterM] = useState("all");
  const [form, setForm] = useState({
    type: "expense", amount: "", desc: "",
    category: "food", method: "kplus",
    date: new Date().toISOString().slice(0, 10),
  });
  const [newMethodLabel, setNewMethodLabel] = useState("");
  const [newMethodDot, setNewMethodDot] = useState(DOT_PRESETS[0]);
  const [editingMethodId, setEditingMethodId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editingTxId, setEditingTxId] = useState(null); // null = adding new, otherwise editing existing tx id

  useEffect(() => {
    localStorage.setItem('moneyflow-txs', JSON.stringify(txs));
  }, [txs]);
  useEffect(() => {
    localStorage.setItem('moneyflow-methods', JSON.stringify(methods));
  }, [methods]);
  // keep the add-form's selected method valid if it gets deleted/renamed elsewhere
  useEffect(() => {
    if (!methods.some(m => m.id === form.method) && methods.length) {
      setForm(f => ({ ...f, method: methods[0].id }));
    }
  }, [methods]);

  // normalize unknown method/category ids (e.g. left over from a renamed id) into a safe fallback
  // so totals always add up correctly instead of silently dropping orphaned transactions
  const validMethodIds = methods.map(m => m.id);
  const validCatIds = CATS.map(c => c.id);
  const fallbackMethodId = methods.find(m => m.id === "other")?.id ?? methods[methods.length - 1]?.id;
  const normTxs = useMemo(() => txs.map(t => ({
    ...t,
    method: validMethodIds.includes(t.method) ? t.method : fallbackMethodId,
    category: validCatIds.includes(t.category) ? t.category : "other",
  })), [txs, validMethodIds, fallbackMethodId]);

  // ── derived ──
  const monthTxs = useMemo(() =>
    normTxs.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === 2026;
    }), [normTxs, month]);

  // all-time cumulative totals — used on home page
  const totalIncomeAll = normTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenseAll = normTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balanceAll = totalIncomeAll - totalExpenseAll;

  const totalIncomeMonth = monthTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenseMonth = monthTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const prevMonthTxs = useMemo(() =>
    normTxs.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === 2026 && d.getMonth() < month;
    }), [normTxs, month]);
  const prevIncome = prevMonthTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const prevExpense = prevMonthTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const carryover = prevIncome - prevExpense;
  const availableMonth = carryover + totalIncomeMonth;
  const balanceMonth = availableMonth - totalExpenseMonth;

  const byMethod = methods
    .map(m => ({ ...m, total: normTxs.filter(t => t.method === m.id && t.type === "expense").reduce((s, t) => s + t.amount, 0) }))
    .filter(m => m.total > 0);

  const byMethodMonth = methods
    .map(m => ({ ...m, total: monthTxs.filter(t => t.method === m.id && t.type === "expense").reduce((s, t) => s + t.amount, 0) }))
    .filter(m => m.total > 0);

  const byCat = CATS.filter(c => c.id !== "income")
    .map(c => ({ ...c, total: normTxs.filter(t => t.category === c.id && t.type === "expense").reduce((s, t) => s + t.amount, 0) }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const byCatMonth = CATS.filter(c => c.id !== "income")
    .map(c => ({ ...c, total: monthTxs.filter(t => t.category === c.id && t.type === "expense").reduce((s, t) => s + t.amount, 0) }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const filtered = filterM === "all" ? monthTxs : monthTxs.filter(t => t.method === filterM);
  const recent = [...normTxs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);

  const addTx = () => {
    if (!form.amount || !form.desc) return;
    if (editingTxId) {
      setTxs(p => p.map(x => x.id === editingTxId ? { ...form, id: editingTxId, amount: parseFloat(form.amount) } : x));
    } else {
      setTxs(p => [{ ...form, id: Date.now(), amount: parseFloat(form.amount) }, ...p]);
    }
    setForm({ type: "expense", amount: "", desc: "", category: "food", method: methods[0]?.id ?? "other", date: new Date().toISOString().slice(0, 10) });
    setEditingTxId(null);
    setView(editingTxId ? "summary" : "home");
  };

  const startEditTx = (t) => {
    setForm({ type: t.type, amount: String(t.amount), desc: t.desc, category: t.category, method: t.method, date: t.date });
    setEditingTxId(t.id);
    setView("add");
  };

  const cat = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];
  const meth = id => methods.find(m => m.id === id) || methods[methods.length - 1];

  // ── method management ──
  const addMethod = () => {
    const label = newMethodLabel.trim();
    if (!label) return;
    const id = slugify(label, methods.map(m => m.id));
    setMethods(p => [...p, { id, label, dot: newMethodDot }]);
    setNewMethodLabel("");
    setNewMethodDot(DOT_PRESETS[(methods.length) % DOT_PRESETS.length]);
  };
  const startEditMethod = (m) => { setEditingMethodId(m.id); setEditLabel(m.label); };
  const saveEditMethod = () => {
    const label = editLabel.trim();
    if (!label) return;
    setMethods(p => p.map(m => m.id === editingMethodId ? { ...m, label } : m));
    setEditingMethodId(null);
    setEditLabel("");
  };
  const recolorMethod = (id, dot) => setMethods(p => p.map(m => m.id === id ? { ...m, dot } : m));
  const deleteMethod = (id) => {
    if (methods.length <= 1) return; // keep at least one channel
    // any transactions using this method will be folded into "other" (or another fallback) automatically via normTxs
    setMethods(p => p.filter(m => m.id !== id));
  };

  // ── shared components ──
  const Dot = ({ id }) => <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: meth(id).dot, flexShrink: 0 }} />;

  const TxRow = ({ t, deletable }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: `1px solid ${C.divider}` }}>
      <span style={{ fontSize: 18, width: 26, textAlign: "center", flexShrink: 0, lineHeight: 1 }}>{cat(t.category).icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.text }}>
          {t.desc}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          <Dot id={t.method} />
          <span style={{ fontSize: 11, color: C.muted }}>{meth(t.method).label} · {t.date.slice(5).replace("-", "/")}</span>
        </div>
      </div>
      <span style={{ ...mono, fontSize: 13, fontWeight: 600, color: t.type === "income" ? C.income : C.expense, flexShrink: 0 }}>
        {t.type === "income" ? "+" : "−"}฿{fmt(t.amount)}
      </span>
      {deletable && (
        <>
          <button onClick={() => startEditTx(t)}
            style={{ background: "none", border: "none", color: C.muted, fontSize: 13, padding: "2px 4px", lineHeight: 1 }}>✎</button>
          <button onClick={() => setTxs(p => p.filter(x => x.id !== t.id))}
            style={{ background: "none", border: "none", color: C.muted, fontSize: 13, padding: "2px 4px", lineHeight: 1 }}>✕</button>
        </>
      )}
    </div>
  );

  // bottom nav
  const BottomNav = () => (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430,
      background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", padding: "10px 0 18px"
    }}>
      {[
        { v: "home", icon: "◉", label: "หน้าหลัก" },
        { v: "summary", icon: "▤", label: "สรุป" },
      ].map(n => (
        <button key={n.v} onClick={() => setView(n.v)} style={{
          flex: 1, background: "none", border: "none",
          color: (view === n.v || (n.v === "summary" && view === "methods")) ? C.accent : C.muted, display: "flex", flexDirection: "column", alignItems: "center", gap: 3
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{n.icon}</span>
          <span style={{ fontSize: 10, fontWeight: (view === n.v || (n.v === "summary" && view === "methods")) ? 700 : 400, letterSpacing: "0.05em" }}>{n.label}</span>
        </button>
      ))}
      <button onClick={() => {
        setEditingTxId(null);
        setForm({ type: "expense", amount: "", desc: "", category: "food", method: methods[0]?.id ?? "other", date: new Date().toISOString().slice(0, 10) });
        setView("add");
      }} style={{
        flex: 1, background: "none", border: "none",
        color: view === "add" ? C.accent : C.muted, display: "flex", flexDirection: "column", alignItems: "center", gap: 3
      }}>
        <span style={{ fontSize: 22, lineHeight: 1, fontWeight: 300 }}>+</span>
        <span style={{ fontSize: 10, fontWeight: view === "add" ? 700 : 400, letterSpacing: "0.05em" }}>เพิ่ม</span>
      </button>
    </div>
  );

  const pageStyle = {
    fontFamily: "'DM Sans','Noto Sans Thai',sans-serif",
    background: C.bg,
    minHeight: "100vh",
    maxWidth: 430,
    margin: "0 auto",
    paddingBottom: 80,
    color: C.text,
  };

  // ════════════════════════════════════
  //  HOME
  // ════════════════════════════════════
  if (view === "home") return (
    <div style={pageStyle}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700&family=DM+Mono:wght@400;500&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{GLOBAL_CSS}</style>

      {/* header */}
      <div style={{ padding: "24px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={lbl}>บัญชีส่วนตัว</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, letterSpacing: -0.5 }}>MoneyFlow</div>
        </div>
        <div style={{ ...lbl, marginTop: 6 }}>{MONTHS[5]} 2026</div>
      </div>

      {/* balance card — all-time cumulative across every channel */}
      <div style={{ margin: "16px 20px 0", ...card, padding: "20px 24px" }}>
        <div style={lbl}>คงเหลือทั้งหมด</div>
        <div style={{
          ...mono, fontSize: 38, fontWeight: 500, letterSpacing: -1.5, marginTop: 6,
          color: balanceAll >= 0 ? C.text : C.expense
        }}>
          ฿{fmt(balanceAll)}
        </div>
        <div style={{ display: "flex", gap: 0, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.divider}` }}>
          <div style={{ flex: 1 }}>
            <div style={lbl}>รายรับสะสม</div>
            <div style={{ ...mono, fontSize: 15, fontWeight: 600, color: C.income, marginTop: 4 }}>+฿{fmt(totalIncomeAll)}</div>
          </div>
          <div style={{ width: 1, background: C.divider }} />
          <div style={{ flex: 1, paddingLeft: 20 }}>
            <div style={lbl}>รายจ่ายสะสม</div>
            <div style={{ ...mono, fontSize: 15, fontWeight: 600, color: C.expense, marginTop: 4 }}>−฿{fmt(totalExpenseAll)}</div>
          </div>
        </div>
      </div>

      {/* method chips */}
      {byMethod.length > 0 && (
        <div style={{ padding: "16px 20px 0" }}>
          <div style={{ ...lbl, marginBottom: 10 }}>ช่องทางชำระ</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {byMethod.map(m => (
              <div key={m.id} style={{ ...card, padding: "7px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <Dot id={m.id} />
                <span style={{ fontSize: 12, color: C.sub }}>{m.label}</span>
                <span style={{ ...mono, fontSize: 12, fontWeight: 600 }}>฿{fmt(m.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* recent */}
      <div style={{ margin: "16px 20px 0", ...card, padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={lbl}>รายการล่าสุด</div>
          <button onClick={() => setView("summary")} style={{ background: "none", border: "none", fontSize: 12, color: C.muted, textDecoration: "underline" }}>ดูทั้งหมด</button>
        </div>
        {recent.length === 0
          ? <div style={{ color: C.muted, fontSize: 13, padding: "16px 0", textAlign: "center" }}>ยังไม่มีรายการ</div>
          : recent.map(t => <TxRow key={t.id} t={t} deletable={false} />)
        }
      </div>

      <BottomNav />
    </div>
  );

  // ════════════════════════════════════
  //  SUMMARY
  // ════════════════════════════════════
  if (view === "summary") return (
    <div style={pageStyle}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700&family=DM+Mono:wght@400;500&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{GLOBAL_CSS}{`option { background: #fff; color: #1C1A17; }`}</style>

      <div style={{ padding: "24px 20px 0" }}>
        <div style={lbl}>สรุปรายเดือน</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, letterSpacing: -0.5 }}>ภาพรวม</div>
      </div>

      {/* month picker */}
      <div style={{ overflowX: "auto", padding: "14px 20px 0" }}>
        <div style={{ display: "flex", gap: 6, width: "max-content" }}>
          {MONTHS.map((m, i) => (
            <button key={i} onClick={() => setMonth(i)} style={{
              background: i === month ? C.accent : C.surface,
              color: i === month ? "#fff" : C.sub,
              border: `1px solid ${i === month ? C.accent : C.border}`,
              borderRadius: 20, padding: "5px 12px", fontSize: 12,
              fontWeight: i === month ? 600 : 400, transition: "all .15s",
            }}>{m}</button>
          ))}
        </div>
      </div>

      {/* stat cards — monthly available funds including carryover */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "14px 20px 0" }}>
        {[
          { l: "เงินใช้ได้", v: availableMonth, c: C.income },
          { l: "รายจ่าย", v: totalExpenseMonth, c: C.expense },
          { l: "คงเหลือ", v: balanceMonth, c: balanceMonth >= 0 ? C.text : C.expense },
        ].map(s => (
          <div key={s.l} style={{ ...card, padding: "12px 14px" }}>
            <div style={lbl}>{s.l}</div>
            <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: s.c, marginTop: 5 }}>฿{fmt(s.v)}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.muted, margin: "6px 20px 0" }}>รวมยอดสะสมที่เหลือจากเดือนก่อนกับรายรับเดือนนี้</div>

      {/* by method — monthly balance for selected month */}
      {(() => {
        const methodSummary = methods.map(m => ({
          ...m,
          inc: monthTxs.filter(t => t.method === m.id && t.type === "income").reduce((s, t) => s + t.amount, 0),
          exp: monthTxs.filter(t => t.method === m.id && t.type === "expense").reduce((s, t) => s + t.amount, 0),
        })).map(m => ({ ...m, bal: m.inc - m.exp })).filter(m => m.inc > 0 || m.exp > 0);
        if (!methodSummary.length) return null;
        return (
          <div style={{ margin: "12px 20px 0", ...card, padding: "16px 20px" }}>
            <div style={{ ...lbl, marginBottom: 2 }}>คงเหลือตามช่องทางชำระ</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>ยอดของเดือนที่เลือก</div>
            {methodSummary.map((m, i) => (
              <div key={m.id} style={{ padding: "11px 0", borderBottom: i < methodSummary.length - 1 ? `1px solid ${C.divider}` : "none" }}>
                {/* method name */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Dot id={m.id} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.label}</span>
                </div>
                {/* 3 cols */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  <div style={{ background: C.tag, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, marginBottom: 3 }}>รายรับ</div>
                    <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: C.income }}>+฿{fmt(m.inc)}</div>
                  </div>
                  <div style={{ background: C.tag, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, marginBottom: 3 }}>รายจ่าย</div>
                    <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: C.expense }}>−฿{fmt(m.exp)}</div>
                  </div>
                  <div style={{ background: m.bal >= 0 ? "#EEF6F1" : "#FDF0F0", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, marginBottom: 3 }}>คงเหลือ</div>
                    <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: m.bal >= 0 ? C.income : C.expense }}>฿{fmt(m.bal)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* by category */}
      {byCatMonth.length > 0 && (
        <div style={{ margin: "10px 20px 0", ...card, padding: "16px 20px" }}>
          <div style={{ ...lbl, marginBottom: 12 }}>หมวดหมู่</div>
          {byCatMonth.map((c, i) => (
            <div key={c.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
              borderBottom: i < byCatMonth.length - 1 ? `1px solid ${C.divider}` : "none"
            }}>
              <span style={{ fontSize: 16, width: 22, textAlign: "center", flexShrink: 0 }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: C.text }}>{c.label}</span>
                  <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: C.expense }}>฿{fmt(c.total)}</span>
                </div>
                <div style={{ background: C.tag, borderRadius: 3, height: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: C.muted, width: `${Math.min(100, totalExpenseMonth > 0 ? (c.total / totalExpenseMonth) * 100 : 0)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* transactions list */}
      <div style={{ margin: "10px 20px 0", ...card, padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={lbl}>รายการ</div>
          <select value={filterM} onChange={e => setFilterM(e.target.value)}
            style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 11, color: C.sub, outline: "none", background: C.surface }}>
            <option value="all">ทุกช่องทาง</option>
            {methods.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        {filtered.length === 0
          ? <div style={{ textAlign: "center", color: C.muted, padding: "20px 0", fontSize: 13 }}>ไม่มีรายการ</div>
          : filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => <TxRow key={t.id} t={t} deletable={true} />)
        }
      </div>

      {/* manage payment channels */}
      <div style={{ margin: "10px 20px 0" }}>
        <button onClick={() => setView("methods")} style={{
          width: "100%", ...card, padding: "14px 20px", display: "flex",
          alignItems: "center", justifyContent: "space-between", background: C.surface,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>⚙ จัดการช่องทางชำระ</span>
          <span style={{ color: C.muted, fontSize: 14 }}>→</span>
        </button>
      </div>

      <BottomNav />
    </div>
  );

  // ════════════════════════════════════
  //  MANAGE METHODS
  // ════════════════════════════════════
  if (view === "methods") return (
    <div style={pageStyle}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700&family=DM+Mono:wght@400;500&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{GLOBAL_CSS}</style>

      <div style={{ padding: "24px 20px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => setView("summary")} style={{
          background: "none", border: `1px solid ${C.border}`, borderRadius: 10,
          width: 34, height: 34, fontSize: 15, color: C.text,
        }}>←</button>
        <div>
          <div style={lbl}>ตั้งค่า</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, letterSpacing: -0.4 }}>จัดการช่องทางชำระ</div>
        </div>
      </div>

      {/* existing methods list */}
      <div style={{ margin: "16px 20px 0", ...card, padding: "8px 20px" }}>
        {methods.map((m, i) => (
          <div key={m.id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 0",
            borderBottom: i < methods.length - 1 ? `1px solid ${C.divider}` : "none",
          }}>
            {/* color swatch + picker */}
            <label style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: m.dot, display: "inline-block", border: `2px solid ${C.surface}`, boxShadow: `0 0 0 1px ${C.border}` }} />
              <input type="color" value={m.dot} onChange={e => recolorMethod(m.id, e.target.value)}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: 18, height: 18 }} />
            </label>

            {/* label / edit input */}
            {editingMethodId === m.id ? (
              <input
                autoFocus
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveEditMethod()}
                style={{ flex: 1, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", outline: "none", color: C.text }}
              />
            ) : (
              <span style={{ flex: 1, fontSize: 14, color: C.text }}>{m.label}</span>
            )}

            {/* actions */}
            {editingMethodId === m.id ? (
              <button onClick={saveEditMethod} style={{ background: C.accent, border: "none", color: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600 }}>บันทึก</button>
            ) : (
              <button onClick={() => startEditMethod(m)} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, textDecoration: "underline" }}>แก้ไข</button>
            )}
            <button onClick={() => deleteMethod(m.id)} disabled={methods.length <= 1}
              style={{ background: "none", border: "none", color: methods.length <= 1 ? C.border : C.expense, fontSize: 13, padding: "2px 4px", opacity: methods.length <= 1 ? 0.4 : 1 }}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: C.muted, margin: "8px 20px 0" }}>
        ลบช่องทางได้เมื่อเหลือมากกว่า 1 ช่องทาง — รายการเก่าที่อยู่ในช่องทางที่ถูกลบจะถูกย้ายไปกอง "อื่นๆ" โดยอัตโนมัติ
      </div>

      {/* add new method */}
      <div style={{ margin: "16px 20px 0", ...card, padding: "16px 20px" }}>
        <div style={{ ...lbl, marginBottom: 10 }}>เพิ่มช่องทางใหม่</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: newMethodDot, display: "inline-block", border: `2px solid ${C.surface}`, boxShadow: `0 0 0 1px ${C.border}` }} />
            <input type="color" value={newMethodDot} onChange={e => setNewMethodDot(e.target.value)}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: 22, height: 22 }} />
          </label>
          <input
            placeholder="เช่น Rabbit LINE Pay"
            value={newMethodLabel}
            onChange={e => setNewMethodLabel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addMethod()}
            style={{ flex: 1, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", outline: "none", color: C.text }}
          />
          <button onClick={addMethod} style={{ background: C.accent, border: "none", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>เพิ่ม</button>
        </div>
        {/* color presets */}
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {DOT_PRESETS.map(c => (
            <button key={c} onClick={() => setNewMethodDot(c)} style={{
              width: 20, height: 20, borderRadius: "50%", background: c, border: c === newMethodDot ? `2px solid ${C.text}` : "2px solid transparent", padding: 0,
            }} />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );

  // ════════════════════════════════════
  //  ADD
  // ════════════════════════════════════
  if (view === "add") return (
    <div style={pageStyle}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700&family=DM+Mono:wght@400;500&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{GLOBAL_CSS}</style>

      <div style={{ padding: "24px 20px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => { setEditingTxId(null); setView(editingTxId ? "summary" : "home"); }} style={{
          background: "none", border: `1px solid ${C.border}`, borderRadius: 10,
          width: 34, height: 34, fontSize: 15, color: C.text, flexShrink: 0,
        }}>←</button>
        <div>
          <div style={lbl}>{editingTxId ? "แก้ไขรายการ" : "รายการใหม่"}</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, letterSpacing: -0.5 }}>{editingTxId ? "แก้ไข" : "บันทึก"}</div>
        </div>
      </div>

      <div style={{ padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* type toggle */}
        <div style={{ ...card, padding: 4, display: "flex", gap: 4 }}>
          {[{ v: "expense", l: "รายจ่าย" }, { v: "income", l: "รายรับ" }].map(t => (
            <button key={t.v} onClick={() => setForm(f => ({ ...f, type: t.v }))} style={{
              flex: 1, padding: "10px", borderRadius: 10, border: "none",
              background: form.type === t.v ? C.accent : "transparent",
              color: form.type === t.v ? "#fff" : C.sub,
              fontSize: 14, fontWeight: 600, transition: "all .15s",
            }}>{t.l}</button>
          ))}
        </div>

        {/* amount */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={lbl}>จำนวนเงิน</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 20, color: C.muted, fontWeight: 300 }}>฿</span>
            <input type="number" placeholder="0.00" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              style={{ background: "none", border: "none", ...mono, fontSize: 30, fontWeight: 500, outline: "none", width: "100%", color: C.text }} />
          </div>
        </div>

        {/* desc */}
        <div style={{ ...card, padding: "14px 20px" }}>
          <div style={lbl}>รายละเอียด</div>
          <input type="text" placeholder="เช่น ข้าวกะเพรา, Grab, Netflix…" value={form.desc}
            onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
            style={{ background: "none", border: "none", fontSize: 15, outline: "none", width: "100%", marginTop: 8, color: C.text }} />
        </div>

        {/* category */}
        <div>
          <div style={{ ...lbl, marginBottom: 8 }}>หมวดหมู่</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CATS.map(c => (
              <button key={c.id} onClick={() => setForm(f => ({ ...f, category: c.id }))} style={{
                padding: "7px 13px", borderRadius: 20, fontSize: 13,
                border: `1px solid ${form.category === c.id ? C.accent : C.border}`,
                background: form.category === c.id ? C.accent : C.surface,
                color: form.category === c.id ? "#fff" : C.text,
                transition: "all .15s",
              }}>{c.icon} {c.label}</button>
            ))}
          </div>
        </div>

        {/* method */}
        <div>
          <div style={{ ...lbl, marginBottom: 8 }}>ช่องทางชำระ</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {methods.map(m => (
              <button key={m.id} onClick={() => setForm(f => ({ ...f, method: m.id }))} style={{
                padding: "7px 13px", borderRadius: 20, fontSize: 13,
                border: `1px solid ${form.method === m.id ? m.dot : C.border}`,
                background: form.method === m.id ? m.dot + "18" : C.surface,
                color: C.text, display: "flex", alignItems: "center", gap: 7,
                transition: "all .15s",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.dot, display: "inline-block", flexShrink: 0 }} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* date */}
        <div style={{ ...card, padding: "14px 20px" }}>
          <div style={lbl}>วันที่</div>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            style={{ background: "none", border: "none", fontSize: 15, outline: "none", width: "100%", marginTop: 8, color: C.text }} />
        </div>

        <button onClick={addTx} style={{
          width: "100%", padding: "15px", background: C.accent, border: "none",
          color: "#fff", borderRadius: 12, fontSize: 15, fontWeight: 700,
          letterSpacing: 0.2, marginTop: 4,
        }}>{editingTxId ? "บันทึกการแก้ไข" : "บันทึกรายการ"}</button>
      </div>

      <BottomNav />
    </div>
  );

  return null;
}