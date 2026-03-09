import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ─── SAMPLE DATA ─────────────────────────────────────────────────────────────
const SAMPLE_BENEFICIARIES = [
  { id: "B001", name: "Rajesh Kumar", aadhaar: "XXXX-XXXX-3421", income: 28000, bank: "SBI-0042", district: "Varanasi", scheme: "PM-KISAN", riskScore: 95, riskLevel: "HIGH", status: "Under Investigation", notes: "Duplicate Aadhaar detected across 3 entries", mlProb: 0.92, flagged: ["duplicate_aadhaar", "income_mismatch"] },
  { id: "B002", name: "Sunita Devi", aadhaar: "XXXX-XXXX-7812", income: 45000, bank: "PNB-1120", district: "Lucknow", scheme: "PMAY", riskScore: 72, riskLevel: "HIGH", status: "Flagged", notes: "Same bank used by 7 beneficiaries", mlProb: 0.78, flagged: ["shared_bank"] },
  { id: "B003", name: "Mohammad Rafi", aadhaar: "XXXX-XXXX-5509", income: 32000, bank: "BOB-2234", district: "Agra", scheme: "MGNREGS", riskScore: 58, riskLevel: "MEDIUM", status: "Open", notes: "", mlProb: 0.61, flagged: ["income_mismatch"] },
  { id: "B004", name: "Priya Sharma", aadhaar: "XXXX-XXXX-9901", income: 18000, bank: "SBI-0042", district: "Kanpur", scheme: "PM-KISAN", riskScore: 80, riskLevel: "HIGH", status: "Flagged", notes: "Same bank account as B001", mlProb: 0.84, flagged: ["shared_bank", "duplicate_aadhaar"] },
  { id: "B005", name: "Arvind Yadav", aadhaar: "XXXX-XXXX-1123", income: 22000, bank: "HDFC-8812", district: "Prayagraj", scheme: "PMAY", riskScore: 25, riskLevel: "LOW", status: "Cleared", notes: "Verified on-site", mlProb: 0.18, flagged: [] },
  { id: "B006", name: "Kamla Devi", aadhaar: "XXXX-XXXX-6634", income: 55000, bank: "AXIS-4421", district: "Meerut", scheme: "MGNREGS", riskScore: 68, riskLevel: "MEDIUM", status: "Open", notes: "Income exceeds scheme limit", mlProb: 0.65, flagged: ["income_mismatch"] },
  { id: "B007", name: "Suresh Patel", aadhaar: "XXXX-XXXX-2201", income: 31000, bank: "UCO-3312", district: "Varanasi", scheme: "PM-KISAN", riskScore: 88, riskLevel: "HIGH", status: "Under Investigation", notes: "Third occurrence of this Aadhaar", mlProb: 0.89, flagged: ["duplicate_aadhaar"] },
  { id: "B008", name: "Anita Singh", aadhaar: "XXXX-XXXX-4478", income: 15000, bank: "SBI-7891", district: "Mathura", scheme: "PMAY", riskScore: 15, riskLevel: "LOW", status: "Cleared", notes: "", mlProb: 0.09, flagged: [] },
  { id: "B009", name: "Deepak Verma", aadhaar: "XXXX-XXXX-8823", income: 42000, bank: "BOB-2234", district: "Agra", scheme: "MGNREGS", riskScore: 55, riskLevel: "MEDIUM", status: "Open", notes: "Shared bank with B003", mlProb: 0.57, flagged: ["shared_bank"] },
  { id: "B010", name: "Radha Kumari", aadhaar: "XXXX-XXXX-3312", income: 19000, bank: "PNB-9901", district: "Gorakhpur", scheme: "PM-KISAN", riskScore: 30, riskLevel: "LOW", status: "Open", notes: "", mlProb: 0.22, flagged: [] },
];

const TREND_DATA = [
  { month: "Sep", cases: 12, high: 4, medium: 5, low: 3 },
  { month: "Oct", cases: 19, high: 7, medium: 8, low: 4 },
  { month: "Nov", cases: 15, high: 5, medium: 6, low: 4 },
  { month: "Dec", cases: 28, high: 11, medium: 10, low: 7 },
  { month: "Jan", cases: 34, high: 14, medium: 12, low: 8 },
  { month: "Feb", cases: 22, high: 9, medium: 8, low: 5 },
];

const DISTRICT_DATA = [
  { district: "Varanasi", cases: 18, risk: 82 },
  { district: "Lucknow", cases: 12, risk: 65 },
  { district: "Agra", cases: 15, risk: 71 },
  { district: "Kanpur", cases: 9, risk: 58 },
  { district: "Prayagraj", cases: 6, risk: 42 },
  { district: "Meerut", cases: 11, risk: 60 },
];

const SCHEME_DATA = [
  { name: "PM-KISAN", value: 38, color: "#ef4444" },
  { name: "PMAY", value: 28, color: "#f97316" },
  { name: "MGNREGS", value: 22, color: "#eab308" },
  { name: "Others", value: 12, color: "#6366f1" },
];

const AUDIT_LOGS = [
  { id: 1, user: "Officer Mishra", action: "Status Updated", target: "B001", detail: "Moved to 'Under Investigation'", time: "10:32 AM" },
  { id: 2, user: "Admin Sharma", action: "ML Score Triggered", target: "B007", detail: "ML probability: 0.89", time: "10:15 AM" },
  { id: 3, user: "Officer Singh", action: "Note Added", target: "B002", detail: "Same bank used by 7 beneficiaries", time: "09:48 AM" },
  { id: 4, user: "Admin Sharma", action: "Bulk Upload", target: "CSV-Feb16", detail: "47 records imported", time: "09:12 AM" },
  { id: 5, user: "Officer Mishra", action: "Case Cleared", target: "B005", detail: "Verified on-site visit", time: "08:55 AM" },
];

// ─── UTILITY ─────────────────────────────────────────────────────────────────
const getRiskColor = (level) => {
  if (level === "HIGH") return { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400", badge: "#ef444430", badgeText: "#ef4444" };
  if (level === "MEDIUM") return { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400", badge: "#f9731630", badgeText: "#f97316" };
  return { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400", badge: "#10b98130", badgeText: "#10b981" };
};

const getStatusColor = (status) => {
  const map = {
    "Under Investigation": "text-purple-400 bg-purple-500/15 border-purple-500/30",
    "Flagged": "text-red-400 bg-red-500/15 border-red-500/30",
    "Open": "text-blue-400 bg-blue-500/15 border-blue-500/30",
    "Cleared": "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  };
  return map[status] || "text-gray-400 bg-gray-500/15 border-gray-500/30";
};

// ─── ANIMATIONS ──────────────────────────────────────────────────────────────
const style = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0b0f1a; font-family: 'Roboto', system-ui, -apple-system, sans-serif; font-size: 22px; font-style: normal; -webkit-font-smoothing: antialiased; }
  * { font-style: normal !important; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2d3748; border-radius: 10px; }

  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-ring {
    0% { transform: scale(0.9); opacity: 0.8; }
    70% { transform: scale(1.3); opacity: 0; }
    100% { transform: scale(1.3); opacity: 0; }
  }
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(200%); }
  }
  @keyframes countUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes alertPulse {
    0%, 100% { border-color: rgba(239,68,68,0.35); }
    50% { border-color: rgba(239,68,68,0.8); }
  }
  @keyframes gridFlow {
    0% { background-position: 0 0; }
    100% { background-position: 40px 40px; }
  }
  @keyframes glowFloat {
    0%, 100% { opacity: 0.2; transform: scale(1); }
    50% { opacity: 0.45; transform: scale(1.04); }
  }

  .fade-in { animation: fadeSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
  .fade-in-delay-1 { animation: fadeSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) 0.07s both; }
  .fade-in-delay-2 { animation: fadeSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) 0.14s both; }
  .fade-in-delay-3 { animation: fadeSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) 0.21s both; }
  .fade-in-delay-4 { animation: fadeSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) 0.28s both; }
  .fade-in-delay-5 { animation: fadeSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) 0.35s both; }

  .skeleton {
    background: linear-gradient(90deg, #141c2e 25%, #1e2a42 37%, #141c2e 63%);
    background-size: 400px 100%;
    animation: shimmer 1.6s ease infinite;
    border-radius: 6px;
  }

  .card-hover {
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }
  .card-hover:hover {
    transform: translateY(-1px);
    border-color: rgba(79,109,245,0.25) !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.35);
  }

  .alert-border { animation: alertPulse 2.5s ease-in-out infinite; }

  .grid-bg {
    background-image: 
      linear-gradient(rgba(79,109,245,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(79,109,245,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    animation: gridFlow 25s linear infinite;
  }

  .glow-orb {
    animation: glowFloat 5s ease-in-out infinite;
  }

  .mono { font-family: 'IBM Plex Mono', 'Cascadia Code', Consolas, monospace; font-feature-settings: 'liga' 0; }

  .risk-bar-fill {
    transition: width 1.1s cubic-bezier(0.16,1,0.3,1);
  }

  .btn-primary {
    background: #4f6df5;
    transition: all 0.18s ease;
    position: relative;
    overflow: hidden;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .btn-primary:hover { background: #5c78f6; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(79,109,245,0.45); }
  .btn-primary:active { transform: translateY(0); box-shadow: none; }

  .btn-secondary {
    background: #141c2e;
    border: 1px solid #1e2a42;
    color: #94a3b8;
    transition: all 0.18s ease;
    font-weight: 500;
  }
  .btn-secondary:hover { background: #1a2438; border-color: #283551; color: #cbd5e1; }

  .nav-item {
    transition: all 0.14s ease;
    position: relative;
  }
  .nav-item.active {
    background: rgba(79,109,245,0.1);
    color: #7c9cf8;
  }
  .nav-item.active::before {
    content: '';
    position: absolute;
    left: 0; top: 50%;
    transform: translateY(-50%);
    width: 2.5px; height: 55%;
    background: #4f6df5;
    border-radius: 0 3px 3px 0;
  }

  .score-ring {
    transition: stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1);
  }

  .filter-chip {
    transition: all 0.14s ease;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
  .filter-chip.active { border-color: #4f6df5; background: rgba(79,109,245,0.12); color: #7c9cf8; }

  .table-row {
    transition: background 0.12s ease;
  }
  .table-row:hover { background: rgba(79,109,245,0.04); }

  .modal-backdrop {
    background: rgba(5,8,16,0.85);
    backdrop-filter: blur(12px);
    animation: fadeSlideIn 0.2s ease forwards;
  }

  .modal-panel {
    animation: fadeSlideIn 0.28s cubic-bezier(0.16,1,0.3,1) forwards;
  }

  input, select, textarea {
    outline: none;
    transition: border-color 0.14s ease, box-shadow 0.14s ease;
    font-family: 'Roboto', sans-serif;
    letter-spacing: -0.01em;
  }
  input:focus, select:focus, textarea:focus {
    border-color: #4f6df5 !important;
    box-shadow: 0 0 0 3px rgba(79,109,245,0.12);
  }

  hr { border-color: #1e2a42; }
`;

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function PulseIndicator({ color = "#ef4444" }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full rounded-full opacity-75" style={{
        backgroundColor: color, animation: "pulse-ring 1.5s cubic-bezier(0,0,0.2,1) infinite"
      }} />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
    </span>
  );
}

function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}

function KPICard({ label, value, sub, icon, color, delay = 0, loading }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (loading) return;
    const target = parseInt(value) || 0;
    const duration = 900;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      setCount(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value, loading]);

  if (loading) return (
    <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-5">
      <Skeleton className="h-4 w-24 mb-4" /><Skeleton className="h-9 w-16 mb-2" /><Skeleton className="h-3 w-32" />
    </div>
  );

  return (
    <div className={`card-hover border rounded-xl p-5 cursor-default fade-in-delay-${delay}`}
      style={{ background: "#0f1629", borderColor: "#1e2a42", backdropFilter: "blur(12px)" }}>
      <div className="flex items-start justify-between mb-4">
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-lg opacity-70">{icon}</span>
      </div>
      <div className="mono text-3xl font-bold mb-1" style={{ color, animation: "countUp 0.6s ease forwards", letterSpacing: "-0.02em" }}>
        {count}{typeof value === "string" && value.includes("%") ? "%" : ""}
      </div>
      <div className="text-xs text-slate-500 font-medium mt-1">{sub}</div>
    </div>
  );
}

function RiskScoreRing({ score, size = 80 }) {
  const radius = (size - 10) / 2;
  const circ = 2 * Math.PI * radius;
  const level = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
  const colors = { HIGH: "#ef4444", MEDIUM: "#f97316", LOW: "#10b981" };
  const color = colors[level];
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} className="score-ring" />
        <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="14" fontWeight="700" fontFamily="JetBrains Mono">{score}</text>
      </svg>
    </div>
  );
}

function FlagBadge({ flag }) {
  const map = {
    duplicate_aadhaar: { label: "Dup. Aadhaar", color: "text-red-400 bg-red-500/10 border-red-500/20" },
    shared_bank: { label: "Shared Bank", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
    income_mismatch: { label: "Income ↑", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  };
  const item = map[flag] || { label: flag, color: "text-gray-400 bg-gray-500/10 border-gray-500/20" };
  return <span className={`px-2 py-0.5 rounded-md text-xs border font-mono ${item.color}`}>{item.label}</span>;
}

function DetailModal({ beneficiary, onClose, onStatusChange }) {
  const [notes, setNotes] = useState(beneficiary.notes);
  const [status, setStatus] = useState(beneficiary.status);
  const rc = getRiskColor(beneficiary.riskLevel);
  const barWidth = beneficiary.riskScore + "%";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl modal-panel overflow-hidden" style={{ background: "#0c1424", border: "1px solid #1e2a42" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1e2a42", background: "#080d1a" }}>
          <div>
            <p className="text-xs mono font-medium" style={{ color: "#3a517a" }}>{beneficiary.id}</p>
            <h3 className="text-white font-bold text-base tracking-tight mt-0.5">{beneficiary.name}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-lg" style={{ background: "#141c2e" }}>✕</button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {/* Risk Score Hero */}
          <div className={`rounded-xl p-4 border mb-5 ${rc.bg} ${rc.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">AI Risk Score</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className={`mono text-4xl font-bold ${rc.text}`} style={{ letterSpacing: "-0.02em" }}>{beneficiary.riskScore}</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${rc.text} ${rc.border} ${rc.bg}`}>{beneficiary.riskLevel}</span>
                </div>
              </div>
              <RiskScoreRing score={beneficiary.riskScore} size={76} />
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#141c2e" }}>
              <div className="h-full rounded-full risk-bar-fill" style={{ width: barWidth, background: beneficiary.riskLevel === "HIGH" ? "#ef4444" : beneficiary.riskLevel === "MEDIUM" ? "#f97316" : "#10b981" }} />
            </div>
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {beneficiary.flagged.map(f => <FlagBadge key={f} flag={f} />)}
            </div>
          </div>

          {/* ML Explainability */}
          <div className="rounded-xl p-4 mb-5" style={{ background: "#141c2e", border: "1px solid #1e2a42" }}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#7c9cf8" }}>ML Model Explanation (SHAP)</h4>
            <div className="space-y-2.5">
              {[
                { feature: "Aadhaar Occurrence Count", impact: beneficiary.flagged.includes("duplicate_aadhaar") ? 0.42 : 0.05 },
                { feature: "Bank Account Overlap", impact: beneficiary.flagged.includes("shared_bank") ? 0.31 : 0.03 },
                { feature: "Income vs. Scheme Threshold", impact: beneficiary.flagged.includes("income_mismatch") ? 0.22 : 0.08 },
                { feature: "District Risk Index", impact: 0.09 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-48 truncate" style={{ color: "#64748b" }}>{item.feature}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#1e2a42" }}>
                    <div className="h-full rounded-full" style={{ width: `${item.impact * 100}%`, background: item.impact > 0.2 ? "#ef4444" : item.impact > 0.1 ? "#f97316" : "#4f6df5" }} />
                  </div>
                  <span className="mono text-xs w-10 text-right font-medium" style={{ color: "#94a3b8" }}>{item.impact.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3 mono font-medium" style={{ color: "#3a517a" }}>Model confidence: {(beneficiary.mlProb * 100).toFixed(1)}% fraud probability</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {[
              { label: "Aadhaar", value: beneficiary.aadhaar, mono: true },
              { label: "Income (₹/yr)", value: `₹${beneficiary.income.toLocaleString()}` },
              { label: "Bank Account", value: beneficiary.bank, mono: true },
              { label: "District", value: beneficiary.district },
              { label: "Scheme", value: beneficiary.scheme },
              { label: "Case ID", value: beneficiary.id, mono: true },
            ].map((item, i) => (
              <div key={i} className="rounded-lg p-3" style={{ background: "#141c2e", border: "1px solid #1e2a42" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#3a517a" }}>{item.label}</p>
                <p className={`text-sm font-medium text-slate-200 ${item.mono ? "mono" : ""}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Status Update */}
          <div className="mb-4">
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#64748b" }}>Update Case Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-slate-200 text-sm"
              style={{ background: "#141c2e", borderColor: "#1e2a42" }}>
              {["Open", "Flagged", "Under Investigation", "Cleared"].map(s =>
                <option key={s} value={s} style={{ background: "#141c2e" }}>{s}</option>
              )}
            </select>
          </div>

          {/* Officer Notes */}
          <div className="mb-5">
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#64748b" }}>Officer Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full border rounded-lg px-3 py-2.5 text-slate-200 text-sm resize-none"
              style={{ background: "#141c2e", borderColor: "#1e2a42" }}
              placeholder="Add investigation notes..." />
          </div>

          <div className="flex gap-2.5">
            <button onClick={() => { onStatusChange(beneficiary.id, status, notes); onClose(); }}
              className="flex-1 btn-primary text-white text-sm py-2.5 rounded-xl">
              Save Changes
            </button>
            <button onClick={onClose} className="btn-secondary px-5 text-sm rounded-xl">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VIEWS ───────────────────────────────────────────────────────────────────

function LoginView({ onLogin }) {
  const [email, setEmail] = useState("admin@gov.in");
  const [password, setPassword] = useState("••••••••");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("admin");

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => { onLogin({ name: role === "admin" ? "Sharma Ji" : "Officer Mishra", role }); }, 1200);
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4" style={{ background: "#0b0f1a" }}>
      <div className="fixed top-24 left-24 w-80 h-80 rounded-full glow-orb" style={{ background: "radial-gradient(circle, rgba(79,109,245,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div className="fixed bottom-24 right-24 w-72 h-72 rounded-full glow-orb" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)", animationDelay: "2.5s", pointerEvents: "none" }} />

      <div className="w-full max-w-sm fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, #4f6df5, #3b56d9)" }}>
            <span className="text-xl">🛡️</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">SchemeGuard</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Government Fraud Detection Portal</p>
          <div className="flex items-center justify-center gap-2 mt-2.5">
            <PulseIndicator color="#10b981" />
            <span className="text-xs text-emerald-400 mono font-medium">SYSTEM OPERATIONAL</span>
          </div>
        </div>

        <div className="border rounded-2xl p-7" style={{ background: "#0f1629", borderColor: "#1e2a42", backdropFilter: "blur(20px)" }}>
          <div className="mb-5">
            <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-wider">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {["admin", "officer"].map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${role === r
                    ? "border-blue-500/50 text-blue-300"
                    : "text-slate-500 hover:text-slate-300"
                    }`}
                  style={role === r ? { background: "rgba(79,109,245,0.12)", borderColor: "rgba(79,109,245,0.4)" } : { background: "#141c2e", borderColor: "#1e2a42" }}>
                  {r === "admin" ? "Admin" : "Officer"}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-wider">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-slate-200 text-sm"
              style={{ background: "#141c2e", borderColor: "#1e2a42" }}
              placeholder="officer@gov.in" />
          </div>
          <div className="mb-6">
            <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-wider">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-slate-200 text-sm"
              style={{ background: "#141c2e", borderColor: "#1e2a42" }}
              placeholder="••••••••" />
          </div>

          <button onClick={handleLogin} disabled={loading}
            className="w-full btn-primary text-white py-3 rounded-xl text-sm relative">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Authenticating…
              </span>
            ) : "Sign In"}
          </button>

          <div className="mt-5 flex items-center gap-2 justify-center">
            <span className="mono text-xs text-slate-600">AES-256 · JWT · MFA Protected</span>
          </div>
        </div>

        <p className="text-center text-xs text-slate-700 mt-5 font-medium">Ministry of Rural Development · v2.4</p>
      </div>
    </div>
  );
}

function DashboardView({ user, onNavigate }) {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 1200); return () => clearTimeout(t); }, []);

  const highRisk = SAMPLE_BENEFICIARIES.filter(b => b.riskLevel === "HIGH").length;
  const totalCases = SAMPLE_BENEFICIARIES.length;
  const underInvestigation = SAMPLE_BENEFICIARIES.filter(b => b.status === "Under Investigation").length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Alert Banner */}
      {!loading && (
        <div className="alert-border mb-6 rounded-xl border p-4 flex items-center gap-3 fade-in" style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.25)" }}>
          <PulseIndicator color="#ef4444" />
          <div className="flex-1">
            <span className="text-red-400 font-semibold text-sm">⚡ High Alert: </span>
            <span className="text-slate-300 text-sm">{highRisk} high-risk cases detected this period. 2 cases require immediate action.</span>
          </div>
          <button onClick={() => onNavigate("beneficiaries")} className="btn-primary text-white text-xs px-4 py-2 rounded-lg shrink-0">Review</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Total Cases" value={totalCases} sub="This quarter" icon="📋" color="#a5b4fc" delay={1} loading={loading} />
        <KPICard label="High Risk" value={highRisk} sub="Needs review" icon="🔴" color="#ef4444" delay={2} loading={loading} />
        <KPICard label="Investigating" value={underInvestigation} sub="Active probes" icon="🔍" color="#f97316" delay={3} loading={loading} />
        <KPICard label="Cleared" value={SAMPLE_BENEFICIARIES.filter(b => b.status === "Cleared").length} sub="This period" icon="✅" color="#10b981" delay={4} loading={loading} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Trend */}
        <div className="lg:col-span-2 border rounded-xl p-5 fade-in-delay-2" style={{ background: "#0f1629", borderColor: "#1e2a42" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-slate-100 font-semibold tracking-tight">Fraud Trend</h3>
              <p className="text-slate-500 text-xs font-medium">Cases detected per month</p>
            </div>
            <span className="text-xs mono text-emerald-400 px-2.5 py-1 rounded-md font-semibold" style={{ background: "rgba(16,185,129,0.1)" }}>↑ 22% MoM</span>
          </div>
          {loading ? <Skeleton className="h-48 w-full" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={TREND_DATA}>
                <defs>
                  <linearGradient id="gradH" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#f9fafb", fontSize: 12 }} />
                <Area type="monotone" dataKey="high" stroke="#ef4444" fill="url(#gradH)" strokeWidth={2} name="High" />
                <Area type="monotone" dataKey="medium" stroke="#f97316" fill="url(#gradM)" strokeWidth={2} name="Medium" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Scheme Breakdown */}
        <div className="border rounded-xl p-5 fade-in-delay-3" style={{ background: "#0f1629", borderColor: "#1e2a42" }}>
          <h3 className="text-slate-100 font-semibold mb-1 tracking-tight">By Scheme</h3>
          <p className="text-slate-500 text-xs mb-4 font-medium">Fraud distribution</p>
          {loading ? <Skeleton className="h-48 w-full" /> : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={SCHEME_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                    {SCHEME_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#f9fafb", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {SCHEME_DATA.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-xs text-gray-400">{s.name}</span>
                    </div>
                    <span className="text-xs mono text-gray-300">{s.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* District Heatmap + Top Suspicious */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded-xl p-5 fade-in-delay-3" style={{ background: "#0f1629", borderColor: "#1e2a42" }}>
          <h3 className="text-slate-100 font-semibold mb-1 tracking-tight">District Risk Heatmap</h3>
          <p className="text-slate-500 text-xs mb-4 font-medium">Fraud intensity by region</p>
          {loading ? <Skeleton className="h-40 w-full" /> : (
            <div className="space-y-3">
              {DISTRICT_DATA.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-20 shrink-0">{d.district}</span>
                  <div className="flex-1 h-6 bg-gray-800 rounded-lg overflow-hidden relative">
                    <div className="h-full rounded-lg risk-bar-fill flex items-center px-2"
                      style={{ width: `${d.risk}%`, background: d.risk > 75 ? "linear-gradient(90deg, #ef4444, #dc2626)" : d.risk > 55 ? "linear-gradient(90deg, #f97316, #ea580c)" : "linear-gradient(90deg, #eab308, #ca8a04)" }}>
                      <span className="text-xs font-bold text-white mono">{d.cases}</span>
                    </div>
                  </div>
                  <span className="text-xs mono text-gray-500 w-8">{d.risk}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Suspicious */}
        <div className="border rounded-xl p-5 fade-in-delay-4" style={{ background: "#0f1629", borderColor: "#1e2a42" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-slate-100 font-semibold tracking-tight">Top Suspicious</h3>
              <p className="text-slate-500 text-xs font-medium">Ranked by risk score</p>
            </div>
            <button onClick={() => onNavigate("beneficiaries")} className="text-xs font-semibold transition-colors" style={{ color: "#7c9cf8" }}>View all →</button>
          </div>
          {loading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
            <div className="space-y-2">
              {SAMPLE_BENEFICIARIES.filter(b => b.riskLevel === "HIGH").slice(0, 4).map((b, i) => {
                const rc = getRiskColor(b.riskLevel);
                return (
                  <div key={b.id} className={`flex items-center gap-3 p-3 rounded-xl border ${rc.border} ${rc.bg} table-row`}>
                    <span className="mono text-xs text-gray-500 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{b.name}</p>
                      <p className="text-xs text-gray-500">{b.scheme} · {b.district}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`mono font-bold text-sm ${rc.text}`}>{b.riskScore}</p>
                      <div className="flex gap-1 justify-end mt-0.5">
                        {b.flagged.slice(0, 1).map(f => <FlagBadge key={f} flag={f} />)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BeneficiariesView() {
  const [data, setData] = useState(SAMPLE_BENEFICIARIES);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [sortBy, setSortBy] = useState("riskScore");
  const [loading, setLoading] = useState(true);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 800); return () => clearTimeout(t); }, []);

  const filtered = data
    .filter(b => filter === "ALL" || b.riskLevel === filter)
    .filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.district.toLowerCase().includes(search.toLowerCase()) || b.scheme.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[sortBy] - a[sortBy]);

  const handleStatusChange = (id, status, notes) => {
    setData(prev => prev.map(b => b.id === id ? { ...b, status, notes } : b));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {selected && <DetailModal beneficiary={selected} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} />}

      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <div className="flex-1 min-w-48 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#3a517a" }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, district, scheme…"
            className="w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium"
            style={{ background: "#0f1629", borderColor: "#1e2a42", color: "#94a3b8" }} />
        </div>
        {["ALL", "HIGH", "MEDIUM", "LOW"].map(f => {
          const colors = {
            ALL: { border: "#1e2a42", color: "#64748b" },
            HIGH: { border: "rgba(239,68,68,0.3)", color: "#f87171" },
            MEDIUM: { border: "rgba(251,146,60,0.3)", color: "#fb923c" },
            LOW: { border: "rgba(52,211,153,0.3)", color: "#34d399" }
          }[f];
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`filter-chip px-3.5 py-2.5 rounded-xl text-xs border transition-all ${filter === f ? "active" : ""}`}
              style={filter !== f ? { background: "#0f1629", borderColor: colors.border, color: colors.color } : {}}>
              {f === "ALL" ? `All (${data.length})` : `${f} (${data.filter(b => b.riskLevel === f).length})`}
            </button>
          );
        })}
        <button className="btn-primary text-white text-xs px-4 py-2.5 rounded-xl">+ Add Case</button>
        <button className="btn-secondary text-xs px-4 py-2.5 rounded-xl">↑ Bulk CSV</button>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden" style={{ background: "#0f1629", borderColor: "#1e2a42" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #1e2a42" }}>
                {["Name & ID", "Aadhaar", "Scheme · District", "Risk Score", "ML Prob", "Status", "Flags", "Action"].map((h, i) => (
                  <th key={i} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "#4a6285" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} style={{ borderBottom: "1px solid #141c2e" }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                      <td key={j} className="px-4 py-4"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.map(b => {
                const rc = getRiskColor(b.riskLevel);
                return (
                  <tr key={b.id} className="table-row cursor-pointer" style={{ borderBottom: "1px solid #141c2e" }} onClick={() => setSelected(b)}>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-slate-200">{b.name}</p>
                      <p className="text-xs mono" style={{ color: "#3a517a" }}>{b.id}</p>
                    </td>
                    <td className="px-4 py-4"><span className="mono text-xs" style={{ color: "#64748b" }}>{b.aadhaar}</span></td>
                    <td className="px-4 py-4">
                      <p className="text-xs font-medium text-slate-300">{b.scheme}</p>
                      <p className="text-xs text-slate-500">{b.district}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: b.riskScore + "%", background: b.riskLevel === "HIGH" ? "#ef4444" : b.riskLevel === "MEDIUM" ? "#f97316" : "#10b981" }} />
                        </div>
                        <span className={`mono text-xs font-bold ${rc.text}`}>{b.riskScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="mono text-xs text-gray-300">{(b.mlProb * 100).toFixed(0)}%</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs border font-medium ${getStatusColor(b.status)}`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {b.flagged.slice(0, 2).map(f => <FlagBadge key={f} flag={f} />)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={e => { e.stopPropagation(); setSelected(b); }}
                        className="btn-primary text-white text-xs px-3 py-1.5 rounded-lg font-semibold">Investigate</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #1e2a42" }}>
          <span className="text-xs text-slate-500 font-medium">Showing {filtered.length} of {data.length} records</span>
          <div className="flex gap-2">
            {[1, 2, 3].map(p => (
              <button key={p} className="w-7 h-7 rounded-lg text-xs font-semibold transition-colors"
                style={p === 1 ? { background: "#4f6df5", color: "white" } : { background: "#141c2e", color: "#64748b" }}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditView() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="border rounded-xl p-5 fade-in" style={{ background: "#0f1629", borderColor: "#1e2a42" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-slate-100 font-semibold tracking-tight">Audit Trail</h3>
            <p className="text-slate-500 text-xs font-medium">All system actions logged immutably</p>
          </div>
          <button className="btn-secondary text-xs px-4 py-2 rounded-xl">↓ Export PDF</button>
        </div>
        <div className="space-y-2">
          {AUDIT_LOGS.map((log, i) => (
            <div key={log.id} className={`flex items-start gap-4 p-4 rounded-xl table-row fade-in-delay-${Math.min(i + 1, 5)}`} style={{ background: "#141c2e", border: "1px solid #1e2a42" }}>
              <div className="shrink-0 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4f6df5" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-slate-200">{log.action}</span>
                  <span className="mono text-xs px-2 py-0.5 rounded font-medium" style={{ color: "#7c9cf8", background: "rgba(79,109,245,0.1)" }}>{log.target}</span>
                </div>
                <p className="text-xs text-slate-400 font-medium">{log.detail}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-500 font-semibold">{log.user}</p>
                <p className="mono text-xs" style={{ color: "#2d4060" }}>{log.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MLView() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  const runML = () => {
    setRunning(true); setDone(false); setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); setRunning(false); setDone(true); return 100; }
        return p + 4;
      });
    }, 80);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded-xl p-5 fade-in" style={{ background: "#0f1629", borderColor: "#1e2a42" }}>
          <h3 className="text-slate-100 font-semibold mb-1 tracking-tight">ML Model Pipeline</h3>
          <p className="text-slate-500 text-xs mb-5 font-medium">Isolation Forest + Logistic Regression</p>
          <div className="space-y-2 mb-6">
            {[
              { label: "Phase 1: Rule Engine", desc: "Aadhaar dups, bank overlaps, income mismatch", done: true },
              { label: "Phase 2: Isolation Forest", desc: "Anomaly detection on 8 features", done: true },
              { label: "Phase 3: Logistic Regression", desc: "Calibrated probability estimate", done: running || done },
              { label: "Phase 4: SHAP Explainer", desc: "Feature importance per case", done: done },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "#141c2e", border: "1px solid #1e2a42" }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: step.done ? "rgba(16,185,129,0.15)" : "#1e2a42" }}>
                  {step.done ? <span className="text-emerald-400 text-xs">✓</span> : <span className="text-xs" style={{ color: "#2d4060" }}>{i + 1}</span>}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${step.done ? "text-slate-200" : "text-slate-500"}`}>{step.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {running && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Processing {Math.round(progress * 0.1)} / 10 records…</span>
                <span className="mono">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-100" style={{ width: progress + "%", background: "linear-gradient(90deg, #6366f1, #a5b4fc)" }} />
              </div>
            </div>
          )}

          <button onClick={runML} disabled={running}
            className="w-full btn-primary text-white font-semibold py-3 rounded-xl text-sm">
            {running ? "⚙️ Running ML Pipeline…" : done ? "✅ Re-run Analysis" : "🚀 Run ML Analysis on All Cases"}
          </button>
        </div>

        <div className="border rounded-xl p-5 fade-in-delay-1" style={{ background: "#0f1629", borderColor: "#1e2a42" }}>
          <h3 className="text-slate-100 font-semibold mb-1 tracking-tight">Model Performance</h3>
          <p className="text-slate-500 text-xs mb-5 font-medium">Validation metrics on test set</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: "Precision", value: "91.4%", color: "#7c9cf8" },
              { label: "Recall", value: "87.2%", color: "#10b981" },
              { label: "F1-Score", value: "89.2%", color: "#f97316" },
              { label: "AUC-ROC", value: "0.944", color: "#a78bfa" },
            ].map((m, i) => (
              <div key={i} className="rounded-xl p-3 text-center" style={{ background: "#141c2e", border: "1px solid #1e2a42" }}>
                <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">{m.label}</p>
                <p className="mono text-xl font-bold" style={{ color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>

          <h4 className="text-sm font-semibold text-slate-300 mb-3 tracking-tight">Top Feature Importances</h4>
          <div className="space-y-2">
            {[
              { feature: "Aadhaar Frequency", weight: 0.38 },
              { feature: "Bank Overlap Count", weight: 0.29 },
              { feature: "Income/Limit Ratio", weight: 0.18 },
              { feature: "District Risk Score", weight: 0.09 },
              { feature: "Scheme Duration", weight: 0.06 },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-40 truncate">{f.feature}</span>
                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full risk-bar-fill" style={{ width: `${f.weight * 100}%`, background: "linear-gradient(90deg, #6366f1, #a5b4fc)" }} />
                </div>
                <span className="mono text-xs text-gray-400 w-8 text-right">{(f.weight * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(79,109,245,0.07)", border: "1px solid rgba(79,109,245,0.2)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#7c9cf8" }}>FastAPI Endpoint</p>
            <p className="mono text-xs text-slate-400">POST /api/v1/predict</p>
            <p className="mono text-xs text-slate-500 mt-0.5">→ Returns: probability, shap_values, risk_level</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({ user, active, onNavigate, collapsed }) {
  const navItems = [
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    { id: "beneficiaries", icon: "⊞", label: "Beneficiaries" },
    { id: "ml", icon: "◎", label: "ML Engine" },
    { id: "audit", icon: "⊟", label: "Audit Trail" },
  ];

  return (
    <div className={`h-full flex flex-col transition-all duration-300`} style={{ background: "#080d1a", borderRight: "1px solid #1e2a42", backdropFilter: "blur(20px)" }}>
      {/* Logo */}
      <div className="p-4" style={{ borderBottom: "1px solid #1e2a42" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #4f6df5, #3b56d9)" }}>
            <span className="text-sm">🛡️</span>
          </div>
          {!collapsed && (
            <div>
              <p className="text-white font-bold text-sm leading-tight tracking-tight">SchemeGuard</p>
              <p className="text-xs font-medium" style={{ color: "#2d4060" }}>Fraud Detection</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-3">
        {navItems.map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)}
            className={`group w-full flex items-center px-4 py-4 rounded-2xl transition-all duration-300 relative overflow-hidden focus:outline-none ${active === item.id ? "text-white font-bold" : "text-slate-400 font-medium hover:text-white hover:-translate-y-1"
              }`}
            style={active === item.id ? {
              background: "linear-gradient(90deg, rgba(79,109,245,0.2) 0%, rgba(79,109,245,0.02) 100%)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              border: "1px solid rgba(79,109,245,0.15)"
            } : {
              border: "1px solid transparent"
            }}
          >
            {active === item.id && (
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#4f6df5] shadow-[0_0_15px_#4f6df5]"></div>
            )}

            {active !== item.id && (
              <div className="absolute inset-0 bg-[#141c2e]/0 group-hover:bg-[#141c2e]/80 transition-colors duration-300 z-0"></div>
            )}

            <div className="relative z-10 flex items-center gap-4 w-full pl-2">
              <span className={`transition-all duration-300 ${active === item.id ? "text-[#4f6df5]" : "text-slate-500 group-hover:text-[#7c9cf8] group-hover:scale-110"}`}
                style={{ fontSize: "1.6em", transform: active === item.id ? "scale(1.15)" : "" }}>
                {item.icon}
              </span>
              {!collapsed && <span className="tracking-wide" style={{ fontSize: "1.15em" }}>{item.label}</span>}
            </div>

            {active === item.id && !collapsed && (
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                <div className="w-2 h-2 rounded-full bg-[#4f6df5] shadow-[0_0_8px_#4f6df5] animate-pulse"></div>
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="p-3" style={{ borderTop: "1px solid #1e2a42" }}>
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs"
            style={{ background: "rgba(79,109,245,0.15)", color: "#7c9cf8" }}>
            {user.name[0]}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-300 truncate tracking-tight">{user.name}</p>
              <p className="text-xs capitalize font-medium" style={{ color: "#2d4060" }}>{user.role}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const viewTitles = {
    dashboard: "Overview Dashboard",
    beneficiaries: "Beneficiary Registry",
    ml: "ML Risk Engine",
    audit: "Audit Trail",
  };

  if (!user) return (
    <>
      <style>{style}</style>
      <LoginView onLogin={setUser} />
    </>
  );

  return (
    <>
      <style>{style}</style>
      <div className="flex h-screen overflow-hidden" style={{ background: "#0b0f1a" }}>
        {/* Sidebar */}
        <div className={`shrink-0 ${sidebarOpen ? "w-52" : "w-14"} transition-all duration-300`}>
          <Sidebar user={user} active={view} onNavigate={setView} collapsed={!sidebarOpen} />
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Topbar */}
          <div className="h-12 shrink-0 flex items-center px-5 gap-4" style={{ background: "rgba(8,13,26,0.8)", borderBottom: "1px solid #1e2a42", backdropFilter: "blur(20px)" }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="transition-colors" style={{ color: "#2d4060" }}
              onMouseEnter={e => e.currentTarget.style.color = "#64748b"}
              onMouseLeave={e => e.currentTarget.style.color = "#2d4060"}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <h2 className="text-sm font-semibold flex-1 tracking-tight" style={{ color: "#94a3b8" }}>{viewTitles[view]}</h2>
            <div className="flex items-center gap-2">
              <PulseIndicator color="#10b981" />
              <span className="mono text-xs font-medium" style={{ color: "#2d4060" }}>LIVE</span>
            </div>
            <div className="w-px h-3.5" style={{ background: "#1e2a42" }} />
            <span className="text-xs capitalize font-medium" style={{ color: "#3a517a" }}>{user.role}</span>
            <button onClick={() => setUser(null)} className="text-xs font-medium transition-colors" style={{ color: "#2d4060" }}
              onMouseEnter={e => e.currentTarget.style.color = "#64748b"}
              onMouseLeave={e => e.currentTarget.style.color = "#2d4060"}>Sign out</button>
          </div>

          {/* Grid background */}
          <div className="absolute inset-0 pointer-events-none grid-bg" style={{ opacity: 0.35 }} />

          {/* Content */}
          <div className="flex-1 overflow-y-auto relative">
            {view === "dashboard" && <DashboardView user={user} onNavigate={setView} />}
            {view === "beneficiaries" && <BeneficiariesView />}
            {view === "ml" && <MLView />}
            {view === "audit" && <AuditView />}
          </div>
        </div>
      </div>
    </>
  );
}
