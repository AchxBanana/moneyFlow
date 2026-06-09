import { useState, useMemo, useEffect } from "react";

const METHODS = [
  { id: "kplus", label: "K PLUS", dot: "#2D7A4F" },
  { id: "cash", label: "เงินสด", dot: "#B8976A" },
  { id: "ThaiPlus", label: "ThaiPlus", dot: "#999" },
];

const CATS = [
  { id: "food", label: "อาหาร", icon: "🍜" },
  { id: "transport", label: "เดินทาง", icon: "🚗" },
  { id: "shopping", label: "ช้อปปิ้ง", icon: "🛍" },
  { id: "coffee", label: "กาแฟ", icon: "☕" },
  { id: "self", label: "ของใช้ส่วนตัว", icon: "👨‍💻" },
  { id: "health", label: "สุขภาพ", icon: "💊" },
  { id: "entertainment", label: "บันเทิง", icon: "🎬" },
  { id: "bills", label: "ค่าบริการ", icon: "📱" },
  { id: "income", label: "รายรับ", icon: "💼" },
  { id: "other", label: "อื่นๆ", icon: "·" },
];

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const fmt = n => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SEED = [
  { id: 1, type: "expense", amount: 85, desc: "ข้าวกะเพราไข่ดาว", category: "food", method: "cash", date: "2026-06-01" },
  { id: 2, type: "expense", amount: 350, desc: "เติมน้ำมัน", category: "transport", method: "kplus", date: "2026-06-02" },
  { id: 3, type: "income", amount: 35000, desc: "เงินเดือน", category: "income", method: "ThaiPlus", date: "2026-06-01" },
  { id: 4, type: "expense", amount: 599, desc: "เสื้อผ้า", category: "shopping", method: "kplus", date: "2026-06-05" },
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
  useEffect(() => {
    localStorage.setItem('moneyflow-txs', JSON.stringify(txs));
  }, [txs]);
  const [view, setView] = useState("home");   // home | summary | add
  const [month, setMonth] = useState(5);
  const [filterM, setFilterM] = useState("all");
  const [form, setForm] = useState({
    type: "expense", amount: "", desc: "",
    category: "food", method: "kplus",
    date: new Date().toISOString().slice(0, 10),
  });

  // ── derived ──
  const monthTxs = useMemo(() =>
    txs.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === 2026;
    }), [txs, month]);

  const income = monthTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const byMethod = METHODS
    .map(m => ({ ...m, total: monthTxs.filter(t => t.method === m.id && t.type === "expense").reduce((s, t) => s + t.amount, 0) }))
    .filter(m => m.total > 0);

  const byCat = CATS.filter(c => c.id !== "income")
    .map(c => ({ ...c, total: monthTxs.filter(t => t.category === c.id && t.type === "expense").reduce((s, t) => s + t.amount, 0) }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const filtered = filterM === "all" ? monthTxs : monthTxs.filter(t => t.method === filterM);
  const recent = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);

  const addTx = () => {
    if (!form.amount || !form.desc) return;
    setTxs(p => [{ ...form, id: Date.now(), amount: parseFloat(form.amount) }, ...p]);
    setForm({ type: "expense", amount: "", desc: "", category: "food", method: "kplus", date: new Date().toISOString().slice(0, 10) });
    setView("home");
  };

  const cat = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];
  const meth = id => METHODS.find(m => m.id === id) || METHODS[METHODS.length - 1];

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
        <button onClick={() => setTxs(p => p.filter(x => x.id !== t.id))}
          style={{ background: "none", border: "none", color: C.muted, fontSize: 13, padding: "2px 4px", lineHeight: 1 }}>✕</button>
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
          color: view === n.v ? C.accent : C.muted, display: "flex", flexDirection: "column", alignItems: "center", gap: 3
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{n.icon}</span>
          <span style={{ fontSize: 10, fontWeight: view === n.v ? 700 : 400, letterSpacing: "0.05em" }}>{n.label}</span>
        </button>
      ))}
      <button onClick={() => setView("add")} style={{
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

      {/* balance card */}
      <div style={{ margin: "16px 20px 0", ...card, padding: "20px 24px" }}>
        <div style={lbl}>คงเหลือเดือนนี้</div>
        <div style={{
          ...mono, fontSize: 38, fontWeight: 500, letterSpacing: -1.5, marginTop: 6,
          color: balance >= 0 ? C.text : C.expense
        }}>
          ฿{fmt(balance)}
        </div>
        <div style={{ display: "flex", gap: 0, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.divider}` }}>
          <div style={{ flex: 1 }}>
            <div style={lbl}>รายรับ</div>
            <div style={{ ...mono, fontSize: 15, fontWeight: 600, color: C.income, marginTop: 4 }}>+฿{fmt(income)}</div>
          </div>
          <div style={{ width: 1, background: C.divider }} />
          <div style={{ flex: 1, paddingLeft: 20 }}>
            <div style={lbl}>รายจ่าย</div>
            <div style={{ ...mono, fontSize: 15, fontWeight: 600, color: C.expense, marginTop: 4 }}>−฿{fmt(expense)}</div>
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

      {/* stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "14px 20px 0" }}>
        {[
          { l: "รายรับ", v: income, c: C.income },
          { l: "รายจ่าย", v: expense, c: C.expense },
          { l: "คงเหลือ", v: balance, c: balance >= 0 ? C.text : C.expense },
        ].map(s => (
          <div key={s.l} style={{ ...card, padding: "12px 14px" }}>
            <div style={lbl}>{s.l}</div>
            <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: s.c, marginTop: 5 }}>฿{fmt(s.v)}</div>
          </div>
        ))}
      </div>

      {/* by method bars */}
      {byMethod.length > 0 && (
        <div style={{ margin: "12px 20px 0", ...card, padding: "16px 20px" }}>
          <div style={{ ...lbl, marginBottom: 14 }}>ตามช่องทางชำระ</div>
          {byMethod.map(m => (
            <div key={m.id} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Dot id={m.id} />
                  <span style={{ fontSize: 13, color: C.text }}>{m.label}</span>
                </div>
                <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: C.sub }}>฿{fmt(m.total)}</span>
              </div>
              <div style={{ background: C.tag, borderRadius: 3, height: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: m.dot, width: `${Math.min(100, (m.total / expense) * 100)}%`, transition: "width .4s ease" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* by category */}
      {byCat.length > 0 && (
        <div style={{ margin: "10px 20px 0", ...card, padding: "16px 20px" }}>
          <div style={{ ...lbl, marginBottom: 12 }}>หมวดหมู่</div>
          {byCat.map((c, i) => (
            <div key={c.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
              borderBottom: i < byCat.length - 1 ? `1px solid ${C.divider}` : "none"
            }}>
              <span style={{ fontSize: 16, width: 22, textAlign: "center", flexShrink: 0 }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: C.text }}>{c.label}</span>
                  <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: C.expense }}>฿{fmt(c.total)}</span>
                </div>
                <div style={{ background: C.tag, borderRadius: 3, height: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: C.muted, width: `${Math.min(100, (c.total / expense) * 100)}%` }} />
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
            {METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        {filtered.length === 0
          ? <div style={{ textAlign: "center", color: C.muted, padding: "20px 0", fontSize: 13 }}>ไม่มีรายการ</div>
          : filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => <TxRow key={t.id} t={t} deletable={true} />)
        }
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

      <div style={{ padding: "24px 20px 0" }}>
        <div style={lbl}>รายการใหม่</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, letterSpacing: -0.5 }}>บันทึก</div>
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
            {METHODS.map(m => (
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
        }}>บันทึกรายการ</button>
      </div>

      <BottomNav />
    </div>
  );

  return null;
}
