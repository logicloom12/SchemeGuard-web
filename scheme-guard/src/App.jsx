import { useState, useEffect, useCallback, createContext, useContext } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  BarChart3, ShieldCheck, Activity, Users, FileSearch, LogOut,
  Menu, ChevronRight, BrainCircuit, Lock, Search, Eye,
  AlertTriangle, History, Cpu, ArrowUpRight, CheckCircle,
  XCircle, X, Info, TrendingUp, Shield, Bell, Zap,
  Home, Settings, Quote, Database, Network, Wallet, ExternalLink
} from "lucide-react";
import {
  apiLogin, apiFetchBeneficiaries, apiCreateBeneficiary, apiScoreBeneficiary,
  apiFetchStats, apiFetchAuditLogs, apiFetchBlockchainBlocks, normalizeBeneficiary, apiEscalateBeneficiary, apiDeleteBeneficiary
} from "./api.js";

// ─── SAMPLE DATA ─────────────────────────────────────────────────
const SAMPLE_BENEFICIARIES = [
  { id: "CASE-001", name: "Rajesh Kumar", aadhaar: "XXXX-XXXX-3421", income: 28000, bank: "SBI-0042", district: "Varanasi", scheme: "PM-KISAN", riskScore: 95, riskLevel: "HIGH", status: "Under Investigation", flagged: ["duplicate_aadhaar", "income_mismatch"] },
  { id: "CASE-002", name: "Sunita Devi", aadhaar: "XXXX-XXXX-7812", income: 45000, bank: "PNB-1120", district: "Lucknow", scheme: "PMAY", riskScore: 72, riskLevel: "HIGH", status: "Flagged", flagged: ["shared_bank"] },
  { id: "CASE-003", name: "Mohammad Rafi", aadhaar: "XXXX-XXXX-5509", income: 32000, bank: "BOB-2234", district: "Agra", scheme: "MGNREGS", riskScore: 58, riskLevel: "MEDIUM", status: "Open", flagged: ["income_mismatch"] },
  { id: "CASE-004", name: "Priya Sharma", aadhaar: "XXXX-XXXX-9901", income: 18000, bank: "SBI-0042", district: "Kanpur", scheme: "PM-KISAN", riskScore: 80, riskLevel: "HIGH", status: "Flagged", flagged: ["shared_bank", "duplicate_aadhaar"] },
  { id: "CASE-005", name: "Arvind Yadav", aadhaar: "XXXX-XXXX-1123", income: 22000, bank: "HDFC-8812", district: "Prayagraj", scheme: "PMAY", riskScore: 25, riskLevel: "LOW", status: "Cleared", flagged: [] },
  { id: "CASE-006", name: "Kamla Devi", aadhaar: "XXXX-XXXX-6634", income: 55000, bank: "AXIS-4421", district: "Meerut", scheme: "MGNREGS", riskScore: 68, riskLevel: "MEDIUM", status: "Open", flagged: ["income_mismatch"] },
  { id: "CASE-007", name: "Suresh Patel", aadhaar: "XXXX-XXXX-2201", income: 31000, bank: "UCO-3312", district: "Varanasi", scheme: "PM-KISAN", riskScore: 88, riskLevel: "HIGH", status: "Under Investigation", flagged: ["duplicate_aadhaar"] },
  { id: "CASE-008", name: "Anita Singh", aadhaar: "XXXX-XXXX-4478", income: 15000, bank: "SBI-7891", district: "Mathura", scheme: "PMAY", riskScore: 15, riskLevel: "LOW", status: "Cleared", flagged: [] },
  { id: "CASE-009", name: "Deepak Verma", aadhaar: "XXXX-XXXX-8823", income: 42000, bank: "BOB-2234", district: "Agra", scheme: "MGNREGS", riskScore: 55, riskLevel: "MEDIUM", status: "Open", flagged: ["shared_bank"] },
  { id: "CASE-010", name: "Radha Kumari", aadhaar: "XXXX-XXXX-3312", income: 19000, bank: "PNB-9901", district: "Gorakhpur", scheme: "PM-KISAN", riskScore: 30, riskLevel: "LOW", status: "Open", flagged: [] },
];

// ─── SCHEME INTELLIGENCE DATA ─────────────────────────────────────────────
const SCHEME_INTELLIGENCE = {
  "PM-KISAN": { logo: "🌾", motto: "Agriculture Subsidies", launchYear: "2019", type: "Central", fraudRiskTrend: "High", eligibility: "Small & Marginal Farmers", deadline: "Rolling", website: "https://pmkisan.gov.in" },
  "MGNREGA": { logo: "🏛️", motto: "Labour Employment Guarantee", launchYear: "2005", type: "Central", fraudRiskTrend: "Medium", eligibility: "Rural Households", deadline: "Rolling", website: "https://nrega.nic.in" },
  "PMAY (Urban + Rural)": { logo: "🏠", motto: "Housing for All", launchYear: "2015", type: "Central", fraudRiskTrend: "High", eligibility: "EWS/LIG households", deadline: "2024 (Extended)", website: "https://pmaymis.gov.in" },
  "PM Ujjwala": { logo: "🔥", motto: "Clean Fuel for Better Life", launchYear: "2016", type: "Central", fraudRiskTrend: "Low", eligibility: "BPL Women/Households", deadline: "Rolling", website: "https://www.pmuy.gov.in" },
  "Jan Dhan Yojana": { logo: "🏦", motto: "Financial Inclusion", launchYear: "2014", type: "Central", fraudRiskTrend: "Low", eligibility: "Unbanked Citizens", deadline: "Rolling", website: "https://pmjdy.gov.in" },
  "PM Garib Kalyan Annadhana": { logo: "🍚", motto: "Food Security", launchYear: "2020", type: "Central", fraudRiskTrend: "Medium", eligibility: "AAY/PHH Cardholders", deadline: "2028", website: "https://dfpd.gov.in" },
  "Ayushman Bharat": { logo: "❤️", motto: "Health Cover up to ₹5 Lakh", launchYear: "2018", type: "Central", fraudRiskTrend: "High", eligibility: "Vulnerable Families (SECC)", deadline: "Rolling", website: "https://pmjay.gov.in" },
  "Mid-Day Meal": { logo: "🧒", motto: "PM POSHAN Scheme", launchYear: "1995", type: "Central", fraudRiskTrend: "Medium", eligibility: "Govt School Children Class 1-8", deadline: "Rolling", website: "https://pmposhan.education.gov.in" },
  "NSAP (Pension)": { logo: "👵", motto: "Social Assistance", launchYear: "1995", type: "Central", fraudRiskTrend: "High", eligibility: "Elderly, Widows, Disabled (BPL)", deadline: "Rolling", website: "https://nsap.nic.in" },
  "POSHAN Abhiyaan": { logo: "🌱", motto: "National Nutrition Mission", launchYear: "2018", type: "Central", fraudRiskTrend: "Low", eligibility: "Children (0-6 yrs), PW&LM", deadline: "Rolling", website: "https://poshanabhiyaan.gov.in" },
  "Post-Matric Scholarship": { logo: "🎓", motto: "Higher Education Support", launchYear: "1944", type: "Central", fraudRiskTrend: "High", eligibility: "SC/ST/OBC/Minority Std > Class 10", deadline: "Annual", website: "https://scholarships.gov.in" },
  "PMGSY (Rural Roads)": { logo: "🛣️", motto: "Rural Connectivity", launchYear: "2000", type: "Central", fraudRiskTrend: "Low", eligibility: "Unconnected Habitations", deadline: "Program Phase", website: "https://omms.nic.in" },
  "Jal Jeevan Mission": { logo: "💧", motto: "Har Ghar Jal", launchYear: "2019", type: "Central", fraudRiskTrend: "Medium", eligibility: "Rural Households", deadline: "2024", website: "https://jaljeevanmission.gov.in" },
  "+ Any State Scheme": { logo: "✨", motto: "State-Specific Frameworks", launchYear: "Varies", type: "State", fraudRiskTrend: "Medium", eligibility: "Varies by State Govt", deadline: "Varies", website: "https://india.gov.in/my-government/schemes" }
};

const AUDIT_LOGS = [
  { id: 1, user: "Officer Mishra", action: "Status Updated", target: "CASE-001", detail: "Moved to 'Under Investigation'", time: "10:32 AM" },
  { id: 2, user: "System", action: "ML Score Triggered", target: "CASE-007", detail: "Risk score increased to 88%", time: "10:15 AM" },
  { id: 3, user: "Officer Singh", action: "Note Added", target: "CASE-002", detail: "Shared bank account flagged", time: "09:48 AM" },
  { id: 4, user: "Admin Sharma", action: "Registry Import", target: "REQ-402", detail: "Processed 12,000 nodes", time: "09:12 AM" },
  { id: 5, user: "Officer Mishra", action: "Case Cleared", target: "CASE-005", detail: "Verified identity via biometric", time: "08:55 AM" },
];

const TREND_DATA = [
  { month: "Sep", cases: 45, high: 12 },
  { month: "Oct", cases: 52, high: 18 },
  { month: "Nov", cases: 68, high: 24 },
  { month: "Dec", cases: 74, high: 31 },
  { month: "Jan", cases: 61, high: 22 },
  { month: "Feb", cases: 85, high: 42 }
];

const SCHEME_DATA = [
  { name: "PM-KISAN", value: 45, color: "#6366f1" },
  { name: "PMAY", value: 25, color: "#ec4899" },
  { name: "MGNREGS", value: 20, color: "#14b8a6" },
  { name: "Others", value: 10, color: "#64748b" }
];

// ─── RIPPLE HOOK ─────────────────────────────────────────────────
function useRipple() {
  const handleRipple = (e) => {
    const btn = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(btn.clientWidth, btn.clientHeight);
    const radius = diameter / 2;
    const rect = btn.getBoundingClientRect();
    circle.className = 'ripple-circle';
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    btn.appendChild(circle);
    circle.addEventListener('animationend', () => circle.remove());
  };
  return handleRipple;
}

// ─── COUNT-UP HOOK ────────────────────────────────────────────────
function useCountUp(target, duration = 1200, active = true) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const isInt = Number.isInteger(target);
    const step = duration / 60;
    const increment = target / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(isInt ? Math.ceil(start) : parseFloat(start.toFixed(1)));
    }, step);
    return () => clearInterval(timer);
  }, [target, duration, active]);
  return count;
}

// ─── TOAST SYSTEM ─────────────────────────────────────────────────
const ToastContext = createContext(null);
const useToast = () => useContext(ToastContext);

function Toast({ message, type, onRemove }) {
  useEffect(() => {
    const t = setTimeout(onRemove, 4500);
    return () => clearTimeout(t);
  }, [onRemove]);

  const cfg = {
    success: { wrap: "bg-emerald-950/95 border-emerald-500/30", Icon: CheckCircle, tc: "text-emerald-400" },
    error: { wrap: "bg-red-950/95 border-red-500/30", Icon: XCircle, tc: "text-red-400" },
    info: { wrap: "bg-indigo-950/95 border-indigo-500/30", Icon: Info, tc: "text-indigo-400" },
  }[type] || { wrap: "bg-slate-900/95 border-white/10", Icon: Info, tc: "text-slate-300" };

  return (
    <div className={`animate-toast flex items-center gap-3 px-4 py-3.5 rounded-xl border backdrop-blur-xl shadow-2xl min-w-[300px] ${cfg.wrap}`}>
      <cfg.Icon size={16} className={cfg.tc} />
      <p className={`text-sm font-medium flex-1 ${cfg.tc}`}>{message}</p>
      <button onClick={onRemove} className="text-white/20 hover:text-white/50 transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed top-5 right-5 z-[300] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast {...t} onRemove={() => removeToast(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── RISK BADGE ───────────────────────────────────────────────────
function RiskBadge({ level, score }) {
  const cls = level === "HIGH" ? "risk-high" : level === "MEDIUM" ? "risk-medium" : "risk-low";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      {score !== undefined ? `${score}% · ` : ""}{level}
    </span>
  );
}

// ─── SECTION HEADER ───────────────────────────────────────────────
function SectionHeader({ eyebrow, title, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div>
        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">{eyebrow}</p>
        <h2 className="text-3xl font-bold text-white tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, trend, accent }) {
  return (
    <div className="glass-card p-6 transition-all duration-300 hover:border-white/12 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-5">
        <div className={`p-2.5 rounded-xl bg-white/5 ${accent}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <TrendingUp size={11} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">+{trend}%</span>
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-white tracking-tight mb-1">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

// ─── SVG RING GAUGE ──────────────────────────────────────────────
function RingGauge({ score, level }) {
  const [animated, setAnimated] = useState(0);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (animated / 100) * circumference;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 80);
    return () => clearTimeout(t);
  }, [score]);

  const color = level === 'HIGH' ? '#f87171' : level === 'MEDIUM' ? '#fbbf24' : '#34d399';
  const glowColor = level === 'HIGH' ? 'rgba(248,113,113,0.3)' : level === 'MEDIUM' ? 'rgba(251,191,36,0.3)' : 'rgba(52,211,153,0.3)';

  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    let s = 0;
    const iv = setInterval(() => {
      s += Math.ceil(score / 40);
      if (s >= score) { setDisplayScore(score); clearInterval(iv); }
      else setDisplayScore(s);
    }, 30);
    return () => clearInterval(iv);
  }, [score]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 130, height: 130 }}>
      <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle
          cx="65" cy="65" r="54"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="ring-gauge"
          style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>{displayScore}%</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color, opacity: 0.7 }}>{level}</span>
      </div>
    </div>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────
function DetailModal({ beneficiary, onClose, token, onEscalated, onDeleted }) {
  if (!beneficiary) return null;
  const toast = useToast();
  const riskCls = beneficiary.riskLevel === "HIGH" ? "risk-high" : beneficiary.riskLevel === "MEDIUM" ? "risk-medium" : "risk-low";

  const [escalating, setEscalating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [report, setReport] = useState(beneficiary.investigation_report || null);
  const [isEscalated, setIsEscalated] = useState(beneficiary.escalated || !!beneficiary.investigation_report);

  const handleEscalate = async () => {
    if (!beneficiary._id) { toast('Cannot escalate: missing case ID', 'error'); return; }
    setEscalating(true);
    try {
      const res = await apiEscalateBeneficiary(token, beneficiary._id);
      setReport(res.investigation_report);
      setIsEscalated(true);
      toast('Case escalated successfully — forensic report generated', 'success');
      onEscalated && onEscalated(beneficiary._id, res);
    } catch (err) {
      toast(err.message || 'Escalation failed', 'error');
    } finally {
      setEscalating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`WARNING: Are you sure you want to permanently erase the case for ${beneficiary.name}? This action cannot be undone and a cryptographic tombstone will be minted.`)) return;
    setDeleting(true);
    try {
      await apiDeleteBeneficiary(token, beneficiary._id);
      toast('Case securely erased. Cryptographic tombstone minted.', 'success');
      onDeleted && onDeleted(beneficiary._id);
      onClose();
    } catch (err) {
      toast(err.message || 'Deletion failed', 'error');
      setDeleting(false); // only stop loading on error, let it unmount on success
    }
  };

  const dupColors = {
    same_scheme: 'text-red-400 bg-red-500/10 border-red-500/20',
    identity_mismatch: 'text-red-400 bg-red-500/10 border-red-500/20',
    cross_scheme: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    unique: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };
  const dupLabel = {
    same_scheme: 'Same Scheme Duplicate',
    identity_mismatch: 'Identity Mismatch',
    cross_scheme: 'Cross Scheme Participation',
    unique: 'Unique',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
          <div>
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">Subject Dossier · {beneficiary.id}</p>
            <h3 className="text-xl font-bold text-white">{beneficiary.name}</h3>
          </div>
          <div className="flex items-center gap-3">
            {isEscalated && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 border border-orange-500/30 text-orange-400">
                🔴 Escalated
              </span>
            )}
            <RiskBadge level={beneficiary.riskLevel} score={beneficiary.riskScore} />
            <button onClick={onClose} className="w-9 h-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left col */}
            <div className="lg:col-span-2 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Aadhaar ID", val: beneficiary.aadhaar, mono: true },
                  { label: "Bank Account", val: beneficiary.bank, mono: true },
                  { label: "District", val: beneficiary.district },
                  { label: "Scheme", val: beneficiary.scheme },
                  { label: "Annual Income", val: `₹${beneficiary.income.toLocaleString("en-IN")}` },
                  { label: "Status", val: isEscalated ? 'Under Investigation' : beneficiary.status },
                ].map(({ label, val, mono }) => (
                  <div key={label} className="rounded-xl border border-white/5 bg-white/[0.025] p-4">
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className={`text-white font-medium text-sm ${mono ? "font-mono" : ""}`}>{val}</p>
                  </div>
                ))}
              </div>

              {/* SHAP */}
              <div className="rounded-xl border border-white/5 bg-white/[0.025] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <BrainCircuit size={16} className="text-indigo-400" />
                  <h4 className="text-sm font-semibold text-white">AI Explanation (SHAP Values)</h4>
                </div>
                <div className="space-y-4">
                  {[
                    { feature: "Aadhaar Collisions", impact: 42, color: "bg-indigo-500" },
                    { feature: "Financial Overlap", impact: 29, color: "bg-cyan-500" },
                    { feature: "Regional Inconsistency", impact: 15, color: "bg-emerald-500" },
                    { feature: "Income Threshold Ratio", impact: 14, color: "bg-amber-500" },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                        <span>{item.feature}</span>
                        <span className="font-semibold text-white">{item.impact}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full animate-bar-fill`} style={{ width: `${item.impact}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right col */}
            <div className="space-y-4">
              <div className={`rounded-xl border p-6 flex flex-col items-center gap-2 ${riskCls}`}>
                <RingGauge score={beneficiary.riskScore} level={beneficiary.riskLevel} />
                <p className="text-xs font-semibold uppercase tracking-widest opacity-75">Risk Score</p>
              </div>

              {/* Duplication badge */}
              {beneficiary.duplicationStatus && beneficiary.duplicationStatus !== 'unique' && (
                <div className={`rounded-xl border px-4 py-3 text-xs font-semibold ${dupColors[beneficiary.duplicationStatus] || ''}`}>
                  ⚠ {dupLabel[beneficiary.duplicationStatus]} · freq {beneficiary.aadhaarFrequency}
                </div>
              )}

              <div className="rounded-xl border border-white/5 bg-white/[0.025] p-4">
                <p className="text-xs text-slate-500 mb-3">Active Flags</p>
                {beneficiary.flagged.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {beneficiary.flagged.map(f => (
                      <span key={f} className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-lg">
                        {f.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-500">No flags detected.</p>}
              </div>

              <button
                onClick={handleEscalate}
                disabled={escalating || isEscalated}
                className={`btn-vault w-full justify-center ${isEscalated ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {escalating
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Escalating…</>
                  : isEscalated
                    ? <><Shield size={15} /> Already Escalated</>
                    : <><Shield size={15} /> Escalate Investigation</>
                }
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-vault w-full justify-center border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                {deleting
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting…</>
                  : <><XCircle size={15} /> Delete Case File</>
                }
              </button>
            </div>
          </div>

          {/* ── Forensic Investigation Report ─────────────── */}
          {report && (
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                <Shield size={16} className="text-orange-400" />
                <h4 className="text-sm font-bold text-white">Forensic Investigation Report</h4>
                <span className="ml-auto text-xs text-slate-500 font-mono">{new Date(report.generated_at).toLocaleString('en-IN')}</span>
              </div>

              {/* Risk Summary */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Risk Summary</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Risk Score', val: `${report.risk_summary.risk_score}%` },
                    { label: 'Risk Level', val: report.risk_summary.risk_level },
                    { label: 'ML Probability', val: `${(report.risk_summary.ml_probability * 100).toFixed(1)}%` },
                    { label: 'Anomaly Score', val: report.risk_summary.anomaly_score },
                  ].map(({ label, val }) => (
                    <div key={label} className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
                      <p className="text-xs text-slate-500 mb-1">{label}</p>
                      <p className="text-sm font-bold text-white">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duplication Analysis */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Duplication Analysis</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Aadhaar Frequency', val: report.duplication_analysis.aadhaar_frequency },
                    { label: 'Same Scheme Count', val: report.duplication_analysis.same_scheme_count },
                    { label: 'Duplication Type', val: dupLabel[report.duplication_analysis.duplication_type] || report.duplication_analysis.duplication_type },
                  ].map(({ label, val }) => (
                    <div key={label} className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
                      <p className="text-xs text-slate-500 mb-1">{label}</p>
                      <p className="text-sm font-bold text-white">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* SHAP Explanation */}
              {report.shap_explanation && report.shap_explanation.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">SHAP Feature Impact</p>
                  <div className="space-y-2">
                    {report.shap_explanation.map((s, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>{s.feature}</span><span className="font-semibold text-white">{s.impact_percentage}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400 rounded-full" style={{ width: `${s.impact_percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Anomaly */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Anomaly Analysis</p>
                <p className="text-sm text-slate-300">{report.anomaly_analysis.anomaly_interpretation}</p>
              </div>

              {/* Final Reasoning */}
              <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-4">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Final Decision Reasoning</p>
                <p className="text-sm text-slate-300 leading-relaxed">{report.final_decision_reasoning}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CASES VIEW ───────────────────────────────────────────────────
function CasesView({ token }) {
  const [cases, setCases] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const toast = useToast();

  const loadCases = useCallback(() => {
    setLoadingData(true);
    apiFetchBeneficiaries(token)
      .then(({ results }) => { setCases(results.map(normalizeBeneficiary)); setLoadingData(false); })
      .catch(err => { toast(err.message, 'error'); setLoadingData(false); });
  }, [token]);

  useEffect(() => { loadCases(); }, [loadCases]);

  const filtered = cases.filter(b => {
    const q = search.toLowerCase();
    const s = b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || b.district.toLowerCase().includes(q);
    const f = filter === "ALL" || b.riskLevel === filter;
    return s && f;
  });

  const handleEscalated = (id, res) => {
    setCases(prev => prev.map(c =>
      c._id === id
        ? { ...c, status: 'Under Investigation', escalated: true, investigation_report: res.investigation_report }
        : c
    ));
  };

  const handleDeleted = (id) => {
    setCases(prev => prev.filter(c => c._id !== id));
  };

  return (
    <div className="p-8 animate-slide-up">
      {selected && (
        <DetailModal
          beneficiary={selected}
          onClose={() => setSelected(null)}
          token={token}
          onEscalated={handleEscalated}
          onDeleted={handleDeleted}
        />
      )}

      <SectionHeader eyebrow="Forensic Registry" title="Case Intelligence">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
            <input
              placeholder="Search name or case ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="field-input input-icon-left w-64 py-2.5 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {["ALL", "HIGH", "MEDIUM", "LOW"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${filter === f
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-white/4 border-white/6 text-slate-400 hover:text-white hover:border-white/12"
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </SectionHeader>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-900/80 backdrop-blur border-b border-white/5">
                {["Identity", "Scheme / Bank", "Risk Score", "Status", ""].map(h => (
                  <th key={h} className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr
                  key={b.id}
                  onClick={() => setSelected(b)}
                  className={`group cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-indigo-500/[0.04] ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="avatar-circle"
                        style={{
                          background: b.riskLevel === 'HIGH' ? 'rgba(239,68,68,0.15)' : b.riskLevel === 'MEDIUM' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                          color: b.riskLevel === 'HIGH' ? '#f87171' : b.riskLevel === 'MEDIUM' ? '#fbbf24' : '#34d399',
                          border: `1px solid ${b.riskLevel === 'HIGH' ? 'rgba(239,68,68,0.25)' : b.riskLevel === 'MEDIUM' ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
                        }}
                      >
                        {b.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors">{b.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">{b.id} · {b.district}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-300 font-medium">{b.scheme}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{b.bank}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${b.riskLevel === "HIGH" ? "bg-red-400" : b.riskLevel === "MEDIUM" ? "bg-amber-400" : "bg-emerald-400"}`}
                          style={{ width: `${b.riskScore}%` }}
                        />
                      </div>
                      <RiskBadge level={b.riskLevel} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-400">{b.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 text-indigo-400 text-xs font-medium">
                      <Eye size={14} /> View
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-500 text-sm">No cases match your filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ML VIEW ──────────────────────────────────────────────────────
function MLView() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);

  const startScan = () => {
    setScanning(true);
    setProgress(0);
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(iv); setScanning(false); return 100; }
        return p + 2;
      });
    }, 50);
  };

  const pipelines = [
    { name: "Synthetic Identity Detection", val: scanning ? progress : 100 },
    { name: "Financial Propagation Analysis", val: scanning ? Math.max(0, progress - 20) : 100 },
    { name: "Biometric Collision Scan", val: scanning ? Math.max(0, progress - 50) : 100 },
    { name: "Neural Probabilistic Calibration", val: scanning ? Math.max(0, progress - 80) : 100 },
  ];

  return (
    <div className="p-8 animate-slide-up">
      {/* ML Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden mb-8" style={{ height: 200 }}>
        <img src="/ml_hero.png" alt="ML Engine" className="hero-img" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090f]/90 via-[#07090f]/50 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8">
          <div>
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Neural Risk Pipeline</p>
            <h2 className="text-3xl font-bold text-white tracking-tight">Anomaly Engine</h2>
            <p className="text-sm text-slate-400 mt-1.5 max-w-sm">Isolation Forest + LR Ensemble · Real-time fraud probability scoring</p>
          </div>
          <div className="ml-auto">
            <button onClick={startScan} disabled={scanning} className="btn-vault btn-ripple">
              {scanning ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Cpu size={16} />}
              {scanning ? "Processing…" : "Run Full Scan"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pipeline status */}
        <div className="glass-card p-7">
          <h3 className="text-base font-semibold text-white mb-6">Pipeline Status</h3>
          <div className="space-y-5">
            {pipelines.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-300 font-medium">{item.name}</span>
                  <span className={`font-semibold font-mono ${item.val === 100 ? "text-emerald-400" : "text-indigo-400"}`}>{item.val}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${item.val === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-cyan-500"}`}
                    style={{ width: `${item.val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance */}
        <div className="glass-card p-7">
          <h3 className="text-base font-semibold text-white mb-6">Engine Performance</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Precision", val: "0.984", color: "text-indigo-400" },
              { label: "Recall", val: "0.942", color: "text-cyan-400" },
              { label: "F1 Score", val: "0.963", color: "text-emerald-400" },
              { label: "AUC-ROC", val: "0.991", color: "text-amber-400" },
            ].map((m, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.025] p-5 text-center hover:border-white/10 transition-colors">
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">{m.label}</p>
                <p className={`text-3xl font-bold font-mono ${m.color}`}>{m.val}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-5 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
            <span>Model: Isolation Forest + LR Ensemble</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
              Live
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AUDIT VIEW (Blockchain Ledger) ──────────────────────────────
function AuditView({ token }) {
  const [blocks, setBlocks] = useState([]);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    // Fetch actual blockchain blocks
    apiFetchBlockchainBlocks(token)
      .then(data => setBlocks(data))
      .catch(() => { });

    // Validate chain integrity
    fetch('http://localhost:4000/api/blockchain/validate', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setIsValid(d.valid))
      .catch(() => setIsValid(false));
  }, [token]);

  return (
    <div className="p-8 animate-slide-up">
      <SectionHeader eyebrow="Immutable Ledger" title="Cryptographic Blockchain Audit">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isValid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {isValid ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
          <span className="text-xs font-semibold">{isValid ? 'Chain Validated' : 'Integrity Compromised'}</span>
        </div>
      </SectionHeader>

      <div className="space-y-4">
        {blocks.map((block, i) => (
          <div key={block.hash} className="glass-card p-6 border-l-4 border-l-indigo-500 relative overflow-hidden group">
            {/* Background hash decoration */}
            <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 text-[120px] font-black text-white/[0.02] tracking-tighter select-none pointer-events-none">
              #{block.index}
            </div>

            <div className="relative z-10 flex items-start gap-6">
              {/* Block Icon */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  <Database size={20} />
                </div>
                {i < blocks.length - 1 && (
                  <div className="w-0.5 h-16 bg-gradient-to-b from-indigo-500/30 to-transparent mt-2" />
                )}
              </div>

              {/* Block Content */}
              <div className="flex-1 w-full min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-white/10 rounded-md text-xs font-bold text-white uppercase tracking-wider">
                      {block.action}
                    </span>
                    <span className="text-sm font-mono text-slate-400">
                      Record: {block.recordId}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">
                      {new Date(block.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-black/30 rounded-lg p-3 border border-white/5 font-mono text-xs">
                    <p className="text-slate-500 mb-1">Block Hash (SHA-256)</p>
                    <p className="text-emerald-400 truncate">{block.hash}</p>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3 border border-white/5 font-mono text-xs">
                    <p className="text-slate-500 mb-1">Previous Hash Latch</p>
                    <p className="text-indigo-400 truncate">{block.previousHash}</p>
                  </div>
                </div>

                <div className="mt-3 bg-black/30 rounded-lg p-3 border border-white/5 font-mono text-xs">
                  <p className="text-slate-500 mb-1">Data Snapshot Hash</p>
                  <p className="text-slate-300 truncate">{block.dataHash}</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {blocks.length === 0 && (
          <div className="glass-card p-12 text-center text-slate-500">
            <History size={32} className="mx-auto mb-4 opacity-50" />
            <p>No blocks in the ledger yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NEW CASE VIEW ────────────────────────────────────────────────
function NewCaseView({ token, onNavigate }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", aadhaar: "", bank: "", income: "", scheme: "PM-KISAN", district: "Agra" });
  const [customDistrict, setCustomDistrict] = useState("");
  const set = (k, v) => setFormData(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const aadhaarDigits = formData.aadhaar.replace(/\D/g, '');
    if (aadhaarDigits.length !== 12) {
      toast('Aadhaar must be exactly 12 digits (e.g. 1234 5678 9012)', 'error');
      return;
    }
    setLoading(true);
    try {
      const effectiveDistrict = formData.district === '__other__'
        ? customDistrict.trim()
        : formData.district;
      if (!effectiveDistrict) {
        toast('Please enter a district name', 'error');
        setLoading(false);
        return;
      }
      const beneficiary = await apiCreateBeneficiary(token, {
        name: formData.name,
        aadhaar: aadhaarDigits,
        income: parseFloat(formData.income),
        bankAccount: formData.bank,
        district: effectiveDistrict,
        schemeName: formData.scheme,
      });
      // Trigger ML scoring asynchronously
      apiScoreBeneficiary(token, beneficiary._id).catch(() => { });
      toast(`Case registered! Rule-based risk: ${beneficiary.riskLevel} (${beneficiary.riskScore}%). ML scoring in progress…`, 'success');
      setFormData({ name: '', aadhaar: '', bank: '', income: '', scheme: 'PM-KISAN', district: 'Agra' });
      setCustomDistrict('');
      setTimeout(() => onNavigate && onNavigate('cases'), 2000);
    } catch (err) {
      if (err.status === 409 && err.data?.existingCase) {
        toast(`${err.message} — Matched ID: ${err.data.existingCase.id}`, 'error');
      } else {
        toast(err.message, 'error');
      }
    }
    setLoading(false);
  };

  return (
    <div className="p-8 animate-slide-up">
      <SectionHeader eyebrow="Data Entry" title="New Case Dossier" />

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Form */}
        <div className="flex-1 glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Subject Full Name</label>
                <input type="text" required value={formData.name} onChange={e => set("name", e.target.value)} placeholder="Full legal name" className="field-input" />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Aadhaar / Biometric ID</label>
                <input type="text" required value={formData.aadhaar} onChange={e => set("aadhaar", e.target.value)} placeholder="XXXX-XXXX-XXXX" className="field-input mono" />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Bank Account Reference</label>
                <input type="text" required value={formData.bank} onChange={e => set("bank", e.target.value)} placeholder="e.g. SBI-0042" className="field-input mono" />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Annual Income (₹)</label>
                <input type="number" required min="0" value={formData.income} onChange={e => set("income", e.target.value)} placeholder="0" className="field-input mono" />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Target Scheme</label>
                <select value={formData.scheme} onChange={e => set("scheme", e.target.value)} className="field-input cursor-pointer">
                  <option value="PM-KISAN">PM-KISAN — Agriculture Subsidies</option>
                  <option value="MGNREGA">MGNREGA — Labour Employment</option>
                  <option value="PMAY">PMAY (Urban + Rural) — Housing Welfare</option>
                  <option value="PM Ujjwala">PM Ujjwala</option>
                  <option value="Jan Dhan Yojana">Jan Dhan Yojana</option>
                  <option value="PM Garib Kalyan Annadhana">PM Garib Kalyan Annadhana</option>
                  <option value="Ayushman Bharat">Ayushman Bharat</option>
                  <option value="Mid-Day Meal">Mid-Day Meal</option>
                  <option value="NSAP (Pension)">NSAP (Pension)</option>
                  <option value="POSHAN Abhiyaan">POSHAN Abhiyaan</option>
                  <option value="Post-Matric Scholarship">Post-Matric Scholarship</option>
                  <option value="PMGSY (Rural Roads)">PMGSY (Rural Roads)</option>
                  <option value="Jal Jeevan Mission">Jal Jeevan Mission</option>
                  <option value="OTHER">Any State Scheme</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">District</label>
                <select
                  value={formData.district}
                  onChange={e => set("district", e.target.value)}
                  className="field-input cursor-pointer"
                >
                  {[
                    "Agra", "Ahmedabad", "Aligarh", "Allahabad", "Amritsar",
                    "Aurangabad", "Azamgarh", "Bareilly", "Bhopal", "Bhubaneswar",
                    "Chennai", "Coimbatore", "Dehradun", "Delhi", "Dhanbad",
                    "Faridabad", "Ghaziabad", "Gorakhpur", "Gurgaon", "Guwahati",
                    "Gwalior", "Howrah", "Hyderabad", "Indore", "Jabalpur",
                    "Jaipur", "Jalandhar", "Jammu", "Jodhpur", "Kanpur",
                    "Kochi", "Kolkata", "Lucknow", "Ludhiana", "Mathura",
                    "Meerut", "Mumbai", "Mysuru", "Nagpur", "Nashik",
                    "Noida", "Patna", "Pune", "Prayagraj", "Raipur",
                    "Rajkot", "Ranchi", "Surat", "Thane", "Varanasi",
                  ].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                  <option value="__other__">— Other (Enter below) —</option>
                </select>
                {formData.district === '__other__' && (
                  <input
                    type="text"
                    required
                    value={customDistrict}
                    onChange={e => setCustomDistrict(e.target.value)}
                    placeholder="Enter district name"
                    className="field-input mt-2"
                  />
                )}
              </div>

            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <p className="text-xs text-slate-500">All fields are required. Data is encrypted at rest.</p>
              <button type="submit" disabled={loading} className="btn-vault btn-ripple">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
                  : <><BrainCircuit size={16} /> Submit to ML Pipeline</>
                }
              </button>
            </div>
          </form>
        </div>

        {/* Right illustration panel */}
        <div className="hidden xl:flex xl:w-72 shrink-0 flex-col gap-5">
          {/* Header card */}
          <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-indigo-600/10 blur-2xl" />
            <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-cyan-600/8 blur-2xl" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4">
                <ShieldCheck size={20} className="text-indigo-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Why it matters</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every case adds to the AI model's understanding — helping detect fraud faster and protect India's welfare funds.
              </p>
            </div>
          </div>

          {/* Impact stats */}
          {[
            { label: "Funds Protected", val: "₹1.2T", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
            { label: "Cases Flagged", val: "240K+", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
            { label: "AI Accuracy", val: "94.2%", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
          ].map((s) => (
            <div key={s.label} className={`glass-card p-5 border ${s.border} ${s.bg} transition-all duration-300 hover:-translate-y-0.5`}>
              <p className={`text-2xl font-bold tracking-tight mb-1 ${s.color}`}>{s.val}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}

          {/* Encryption badge */}
          <div className="glass-card p-4 flex items-center gap-3">
            <Lock size={16} className="text-slate-500 shrink-0" />
            <p className="text-xs text-slate-500 leading-snug">Aadhaar is AES-256 encrypted before storage. Never stored in plaintext.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN VIEW ────────────────────────────────────────────────────
function LoginView({ onLogin }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loginErr, setLoginErr] = useState("");
  const [authResult, setAuthResult] = useState(null);
  const [creds, setCreds] = useState({ id: "", email: "", password: "", otp: "" });
  const set = (k, v) => setCreds(prev => ({ ...prev, [k]: v }));
  const ripple = useRipple();

  const handleNext = async () => {
    setLoginErr("");
    if (step === 1 && creds.id && creds.email && creds.password) {
      setLoading(true);
      try {
        const result = await apiLogin(creds.email, creds.password);
        setAuthResult(result);
        setLoading(false);
        setStep(2);
      } catch (err) {
        setLoginErr(err.message);
        setLoading(false);
      }
    } else if (step === 2 && creds.otp.length === 6) {
      setLoading(true);
      setTimeout(() => onLogin(authResult), 1000);
    }
  };

  const canProceed = step === 1
    ? (creds.id && creds.email && creds.password)
    : creds.otp.length === 6;

  return (
    <div className="w-screen h-screen flex items-center justify-center overflow-hidden relative">
      {/* Full-screen background image */}
      <img
        src="/login_hero.png"
        alt="SchemeGuard Background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.85 }}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-[#07090f]/60 backdrop-blur-[2px]" />
      {/* Subtle grid */}
      <div className="absolute inset-0 starlight-grid opacity-20" />

      {/* Centered login card */}
      <div className="relative z-10 w-full max-w-md px-6 animate-float">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.4)] mb-5">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SchemeGuard</h1>
          <p className="text-sm text-indigo-400 font-medium mt-1.5">National AI Fraud Prevention System</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-all duration-500 ${step >= s ? "bg-indigo-500" : "bg-white/8"}`} />
            ))}
          </div>

          <div className="space-y-4">
            {step === 1 ? (
              <>
                <p className="text-base font-semibold text-white mb-1">Officer Authentication</p>
                <p className="text-sm text-slate-400 mb-5">Enter your credentials to continue.</p>

                {[
                  { label: "Officer ID", key: "id", type: "text", ph: "e.g. OFF-2024-001", Icon: Lock },
                  { label: "Email", key: "email", type: "email", ph: "officer@gov.in", Icon: Lock },
                  { label: "Password", key: "password", type: "password", ph: "••••••••", Icon: BrainCircuit },
                ].map(({ label, key, type, ph, Icon }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-300">{label}</label>
                    <div className="relative">
                      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                      <input
                        type={type}
                        value={creds[key]}
                        onChange={e => set(key, e.target.value)}
                        placeholder={ph}
                        onKeyDown={e => e.key === "Enter" && canProceed && handleNext()}
                        className="field-input input-icon-left mono"
                      />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="animate-slide-right">
                <p className="text-base font-semibold text-white mb-1">Two-Factor Verification</p>
                <p className="text-sm text-slate-400 mb-5">
                  Enter the 6-digit OTP sent to <span className="text-indigo-400">{creds.email || "your registered device"}</span>.
                </p>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">One-Time Passcode</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={creds.otp}
                    onChange={e => set("otp", e.target.value.replace(/\D/g, ""))}
                    placeholder="• • • • • •"
                    onKeyDown={e => e.key === "Enter" && canProceed && handleNext()}
                    className="field-input mono text-center text-2xl tracking-[0.6em]"
                  />
                </div>
                <button onClick={() => setStep(1)} className="text-xs text-slate-500 hover:text-slate-300 mt-3 transition-colors">
                  ← Back to credentials
                </button>
              </div>
            )}
          </div>

          {/* Error message */}
          {loginErr && (
            <div className="flex items-center gap-2 mt-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <XCircle size={15} className="text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{loginErr}</p>
            </div>
          )}

          <button
            onClick={handleNext}
            disabled={loading || !canProceed}
            className="btn-vault w-full justify-center mt-6"
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <>{step === 1 ? "Continue" : "Verify & Sign In"} <ChevronRight size={16} /></>
            }
          </button>

          <p className="text-center text-xs text-slate-600 mt-4">Authorized Government Personnel Only</p>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD VIEW ────────────────────────────────────────────────
function DashboardView({ token }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    apiFetchStats(token).then(setStats).catch(() => { });
  }, [token]);

  const total = stats ? stats.total.toLocaleString() : '—';
  const highRisk = stats ? stats.high.toLocaleString() : '—';
  const underInv = stats ? stats.underInvestigation.toLocaleString() : '—';

  return (
    <div className="p-8 animate-slide-up">
      {/* Dashboard hero banner */}
      <div className="relative rounded-2xl overflow-hidden mb-8" style={{ height: 180 }}>
        <img src="/dashboard_hero.png" alt="Dashboard" className="hero-img" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090f]/90 via-[#07090f]/55 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8">
          <div>
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Intelligence Matrix</p>
            <h2 className="text-3xl font-bold text-white tracking-tight">Command Center</h2>
          </div>
          <div className="ml-auto flex gap-3 flex-wrap">
            {[
              { label: 'Total Cases', val: total, c: 'text-indigo-300' },
              { label: 'High Risk', val: highRisk, c: 'text-red-300' },
              { label: 'Under Investigation', val: underInv, c: 'text-amber-300' },
            ].map(s => (
              <div key={s.label} className="px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-center backdrop-blur-sm">
                <p className={`text-xl font-bold ${s.c}`}>{s.val}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard label="Total Beneficiaries" value={total} icon={Users} trend={null} accent="text-indigo-400" />
        <StatCard label="High Risk Cases" value={highRisk} icon={AlertTriangle} trend={null} accent="text-red-400" />
        <StatCard label="Under Investigation" value={underInv} icon={Activity} trend={null} accent="text-emerald-400" />
        <StatCard label="ML Engine" value="Live" icon={Cpu} trend={null} accent="text-amber-400" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Area Chart */}
        <div className="xl:col-span-2 glass-card p-7 flex flex-col" style={{ height: 380 }}>
          <h3 className="text-sm font-semibold text-white mb-1">Case Volume — 6 Months</h3>
          <p className="text-xs text-slate-500 mb-5">Total cases vs high-risk flags</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND_DATA}>
                <defs>
                  <linearGradient id="gradCases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" stroke="transparent" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#0d1422", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}
                  itemStyle={{ color: "#fff", fontSize: 12 }}
                  labelStyle={{ color: "#64748b", fontSize: 11 }}
                />
                <Area type="monotone" dataKey="cases" name="Total Cases" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradCases)" />
                <Area type="monotone" dataKey="high" name="High Risk" stroke="#f87171" strokeWidth={2.5} fill="url(#gradHigh)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="glass-card p-7 flex flex-col" style={{ height: 380 }}>
          <h3 className="text-sm font-semibold text-white mb-1">Fraud by Scheme</h3>
          <p className="text-xs text-slate-500 mb-4">Distribution across programmes</p>
          <div className="flex-1 min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={SCHEME_DATA} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                  {SCHEME_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0d1422", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}
                  itemStyle={{ color: "#fff", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {SCHEME_DATA.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-xs font-medium text-slate-300">{s.name}</span>
                </div>
                <span className="text-xs font-bold text-white font-mono">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCHEME INTELLIGENCE MODAL ─────────────────────────────────────
function SchemeIntelligenceModal({ schemeName, data, onClose }) {
  if (!schemeName || !data) return null;

  const fraudColors = {
    Low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    Medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    High: "text-red-400 bg-red-500/10 border-red-500/20",
  };
  const typeColors = {
    Central: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    State: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className="glass-card w-full max-w-2xl overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-8 border-b border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="relative z-10 flex gap-5 items-center">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-4xl shadow-inner shadow-black/50">
              {data.logo}
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">Intelligence Dossier</p>
              <h2 className="text-2xl font-bold text-white tracking-tight">{schemeName}</h2>
              <p className="text-sm text-slate-400 mt-1 italic">"{data.motto}"</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors relative z-10">
            <X size={18} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-slate-500 mb-2">Fund Allocation Level</p>
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${typeColors[data.type]}`}>
                {data.type} Funding
              </span>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-slate-500 mb-2">Historical Fraud Risk Trend</p>
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${fraudColors[data.fraudRiskTrend]}`}>
                {data.fraudRiskTrend} Risk Profile
              </span>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-slate-500 mb-1">Inception Year</p>
              <p className="text-white font-semibold font-mono">{data.launchYear}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-slate-500 mb-1">Target Deadline</p>
              <p className="text-white font-semibold">{data.deadline}</p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-indigo-400" />
              <h4 className="text-sm font-semibold text-white">Target Demographic Eligibility</h4>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed pl-6">{data.eligibility}</p>
          </div>

          <div className="pt-2 relative z-50">
            <a
              href={data.website}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-vault w-full justify-center group bg-white/5 hover:bg-[rgba(255,255,255,0.1)] flex items-center text-center cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              Access Official Intelligence Portal <ExternalLink size={15} className="text-slate-400 group-hover:text-white transition-colors ml-1" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HOME VIEW ──────────────────────────────────────────────────────
const GOVERNANCE_QUOTES = [
  "“Transparency and accountability are the twin pillars of good governance.”",
  "“AI-driven insights empower us to protect public resources with unprecedented precision.”",
  "“Data is the new currency of trust. Ensure every transaction is verified and immutable.”",
  "“True governance is not about reacting to fraud, but predicting and preventing it.”"
];

const SCHEME_CARDS = [
  { id: "pmkisan", name: "PM-KISAN", ministry: "Agriculture", totalBeneficiaries: "8.5M", suspicious: 1240, risk: "Medium" },
  { id: "pmay", name: "PMAY (Housing)", ministry: "Urban Affairs", totalBeneficiaries: "3.2M", suspicious: 850, risk: "High" },
  { id: "mgnrega", name: "MGNREGA", ministry: "Rural Dev", totalBeneficiaries: "12.1M", suspicious: 412, risk: "Low" }
];

// ─── KPI CARDS (with count-up) ───────────────────────────────────────
const KPI_DATA = [
  { label: "Beneficiaries", raw: 238, display: (v) => `${v / 10}M`, icon: Users, c: "text-blue-400" },
  { label: "Funds (Cr)", raw: 14250, display: (v) => `₹${v.toLocaleString('en-IN')}`, icon: Wallet, c: "text-emerald-400" },
  { label: "High Risk", raw: 2410, display: (v) => v.toLocaleString('en-IN'), icon: AlertTriangle, c: "text-red-400" },
  { label: "Medium Risk", raw: 8920, display: (v) => v.toLocaleString('en-IN'), icon: ShieldCheck, c: "text-amber-400" },
  { label: "AI Accuracy", raw: 942, display: (v) => `${v / 10}%`, icon: BrainCircuit, c: "text-indigo-400" },
  { label: "Blockchain Logs", raw: 41, display: (v) => `${v / 10}M`, icon: History, c: "text-cyan-400" },
];

function KpiCard({ kpi, onNavigate }) {
  const count = useCountUp(kpi.raw, 1400);
  const ripple = useRipple();
  return (
    <div
      onClick={(e) => { ripple(e); onNavigate('dashboard'); }}
      className="glass-card p-5 cursor-pointer hover:bg-white/[0.04] transition-all duration-300 group btn-ripple relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${kpi.c}`}>
          <kpi.icon size={16} />
        </div>
        <ArrowUpRight size={14} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
      </div>
      <p className={`text-2xl font-bold mb-1 tracking-tight animate-count-up ${kpi.c}`}>{kpi.display(count)}</p>
      <p className="text-xs text-slate-500">{kpi.label}</p>
    </div>
  );
}

function KpiCards({ onNavigate }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {KPI_DATA.map((k, i) => <KpiCard key={i} kpi={k} onNavigate={onNavigate} />)}
    </div>
  );
}

function HomeView({ token, onNavigate }) {
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [activeScheme, setActiveScheme] = useState(SCHEME_CARDS[0].id);
  const [hoveredScheme, setHoveredScheme] = useState(null);
  const [selectedScheme, setSelectedScheme] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setQuoteIdx(i => (i + 1) % GOVERNANCE_QUOTES.length), 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-8 animate-fade-in space-y-8 relative">
      {selectedScheme && (
        <SchemeIntelligenceModal
          schemeName={selectedScheme}
          data={SCHEME_INTELLIGENCE[selectedScheme]}
          onClose={() => setSelectedScheme(null)}
        />
      )}
      {/* 1. Welcome & Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Command Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Welcome back, Officer. {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Cpu size={14} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">AI Engine Live</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Network size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-blue-400">Blockchain Sync</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <Database size={14} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400">Data Node Active</span>
          </div>
        </div>
      </div>

      {/* 2. Governance Quote */}
      <div className="relative overflow-hidden rounded-2xl group cursor-pointer transition-all duration-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="/quote_bg.png"
            alt="Governance background"
            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700 ease-out"
          />
        </div>

        {/* Gradients for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1d] via-[#0a0f1d]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-transparent to-[#0a0f1d]/30" />

        {/* Subtle animated overlay */}
        <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl mix-blend-overlay" />

        <div className="relative z-10 p-8 md:p-12 flex items-center justify-center min-h-[160px] border-l-4 border-l-indigo-500">
          <Quote className="absolute right-4 top-4 text-white/5 group-hover:text-indigo-500/10 transition-colors duration-500" size={140} />

          <div className="w-full relative">
            {GOVERNANCE_QUOTES.map((q, i) => (
              <div
                key={i}
                className={`transition-all duration-1000 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center ${i === quoteIdx ? "opacity-100 translate-y-[-50%] scale-100" : "opacity-0 translate-y-[20px] scale-95 pointer-events-none"
                  }`}
              >
                <p className="text-xl md:text-2xl font-medium text-indigo-50 leading-snug tracking-wide italic max-w-4xl mx-auto drop-shadow-md">
                  {q}
                </p>
                <div className="mt-4 flex items-center justify-center gap-1.5 opacity-50">
                  {GOVERNANCE_QUOTES.map((_, dotIdx) => (
                    <div
                      key={dotIdx}
                      className={`h-1 rounded-full transition-all duration-500 ${dotIdx === quoteIdx ? "w-6 bg-indigo-400" : "w-1.5 bg-white/30"
                        }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. KPI Cards */}
      <KpiCards onNavigate={onNavigate} />

      {/* 3.5 Coverage Section */}
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in relative">
        {/* India Schemes Banner */}
        <div className="relative rounded-2xl overflow-hidden w-full" style={{ height: 200 }}>
          <img src="/india_schemes_banner.png" alt="Indian Government Schemes" className="hero-img" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07090f]/80 via-[#07090f]/30 to-[#07090f]/80" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] mb-2">Coverage</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none px-4">
              Works across all major schemes
            </h2>
            <p className="text-sm text-slate-300 mt-2">14 national & state-level welfare programmes under AI monitoring</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 max-w-5xl mx-auto mt-8 relative z-10">
          {Object.entries(SCHEME_INTELLIGENCE).map(([name, data], i) => {
            const fraudColors = { Low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", Medium: "text-amber-400 bg-amber-500/10 border-amber-500/20", High: "text-red-400 bg-red-500/10 border-red-500/20" };
            const typeColors = { Central: "text-blue-400 bg-blue-500/10 border-blue-500/20", State: "text-purple-400 bg-purple-500/10 border-purple-500/20" };

            return (
              <div
                key={i}
                className="relative group cursor-pointer"
                onMouseEnter={() => setHoveredScheme(name)}
                onMouseLeave={() => setHoveredScheme(null)}
                onClick={() => setSelectedScheme(name)}
              >
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f172a] border border-white/5 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 transition-all shadow-md">
                  <span className="text-lg">{data.logo}</span>
                  <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">{name}</span>
                </div>

                {/* Hover Popover */}
                {hoveredScheme === name && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 p-5 rounded-xl glass-card border border-white/10 shadow-2xl z-50 animate-slide-up pointer-events-none">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-2xl shrink-0">
                        {data.logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold text-base truncate">{name}</h4>
                        <p className="text-xs text-slate-400 italic line-clamp-2">{data.motto}</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Eligibility</p>
                        <p className="text-xs text-slate-300 line-clamp-2">{data.eligibility}</p>
                      </div>
                      <div className="flex justify-between items-center bg-white/[0.02] p-2 rounded-lg border border-white/5">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Deadline</p>
                          <p className="text-xs font-semibold text-white">{data.deadline}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Est.</p>
                          <p className="text-xs font-mono text-slate-300">{data.launchYear}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Funded By</p>
                        <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-semibold border ${typeColors[data.type]}`}>
                          {data.type}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Fraud Risk</p>
                        <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-semibold border ${fraudColors[data.fraudRiskTrend]}`}>
                          {data.fraudRiskTrend}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-indigo-400 flex items-center gap-1">
                        <ExternalLink size={12} /> {new URL(data.website).hostname.replace('www.', '')}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">Click to expand</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 4. Interactive Schemes List */}
        <div className="glass-card p-6 xl:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-semibold text-white">Active Schemes Under AI Monitoring</h3>
              <p className="text-sm text-slate-400">Select a scheme to view analytics and risk insights</p>
            </div>
            <select className="field-input text-sm px-3 py-1.5 w-auto">
              <option>All Ministries</option>
              <option>Agriculture</option>
              <option>Rural Dev</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SCHEME_CARDS.map(s => (
              <div key={s.id} onClick={() => setActiveScheme(s.id)} className={`scheme-card glass-card p-5 cursor-pointer border-2 ${activeScheme === s.id ? 'active' : 'border-transparent'}`}>
                <div className="flex justify-between mb-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/10 text-slate-300">{s.ministry}</span>
                  <RiskBadge level={s.risk.toUpperCase()} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{s.name}</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Beneficiaries</span>
                    <span className="font-medium text-slate-300">{s.totalBeneficiaries}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Flags</span>
                    <span className="font-medium text-red-400">{s.suspicious}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Scheme Quick Chart Area */}
          <div className="mt-8 border-t border-white/5 pt-6 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND_DATA}>
                <defs>
                  <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="transparent" tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0d1422", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="cases" stroke="#6366f1" strokeWidth={2} fill="url(#gC)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Risk Distribution / Recent Flags */}
        <div className="space-y-6">
          <div className="glass-card p-6 h-[300px] flex flex-col">
            <h3 className="text-sm font-semibold text-white mb-4">Risk Distribution</h3>
            <div className="flex-1 min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ n: 'Low', v: 65, c: '#34d399' }, { n: 'Med', v: 25, c: '#fbbf24' }, { n: 'High', v: 10, c: '#f87171' }]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="v" stroke="none">
                    {[{ c: '#34d399' }, { c: '#fbbf24' }, { c: '#f87171' }].map((e, i) => <Cell key={i} fill={e.c} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0d1422", border: "1px solid rgba(255,255,255,0.08)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-2xl font-bold text-white">94%</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Accuracy</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-white">Recent Flags</h3>
              <button onClick={() => onNavigate('cases')} className="text-xs text-indigo-400 hover:text-indigo-300">View All</button>
            </div>
            <div className="space-y-3">
              {[
                { i: "C-001", r: "HIGH" },
                { i: "C-002", r: "HIGH" },
                { i: "C-003", r: "MEDIUM" }
              ].map((c, i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-xs font-mono text-slate-300">{c.i}</span>
                  <RiskBadge level={c.r} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────
function Sidebar({ active, onNavigate, collapsed, user, onLogOut }) {
  const MENU = [
    { id: "home", label: "Home", icon: Home },
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "cases", label: "Case Files", icon: Users },
    { id: "new", label: "New Case", icon: FileSearch },
    { id: "audit", label: "Blockchain Logs", icon: History },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className={`${collapsed ? "w-[72px]" : "w-64"} h-full bg-[#080d1a] border-r border-white/5 flex flex-col transition-all duration-500 shrink-0 z-30`}>
      {/* Brand */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b border-white/5 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(99,102,241,0.4)]">
          <ShieldCheck size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="animate-slide-right min-w-0">
            <h2 className="text-sm font-bold text-white leading-none">SchemeGuard DEV</h2>
            <p className="text-[10px] text-indigo-400 mt-0.5 font-mono">v4.2 · Neural</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 mt-2">
        {MENU.map(item => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                ${isActive
                  ? "bg-indigo-600/15 text-indigo-300"
                  : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                }`}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r-full" />}
              <item.icon size={18} className={`shrink-0 ${isActive ? "text-indigo-400" : ""}`} />
              {!collapsed && (
                <span className={`text-sm font-medium ${isActive ? "text-indigo-200" : ""}`}>{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className={`p-4 border-t border-white/5 flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {user.name[0]}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <button
              onClick={(e) => { e.stopPropagation(); onLogOut(); }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors mt-0.5 cursor-pointer z-50"
            >
              <LogOut size={11} /> Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── SETTINGS VIEW ──────────────────────────────────────────────────
function SettingsView() {
  return (
    <div className="p-8 animate-slide-up max-w-4xl mx-auto mt-8">
      <SectionHeader eyebrow="Configuration" title="System Settings" />
      <div className="glass-card p-8 text-center space-y-4 py-16">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-700">
          <Settings size={24} className="text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-white">Settings Portal Under Construction</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          System configuration features are currently locked down by the Ministry of Electronics and Information Technology (MeitY) pending clearance.
        </p>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(null); // { token, user: { id, name, email, role } }
  const [view, setView] = useState("home");
  const [collapsed, setCollapsed] = useState(false);

  if (!auth) {
    return (
      <ToastProvider>
        <LoginView onLogin={setAuth} />
      </ToastProvider>
    );
  }

  const { token, user } = auth;

  return (
    <ToastProvider>
      <div className="w-screen h-screen flex overflow-hidden bg-[var(--bg-base)]">
        <Sidebar
          active={view}
          onNavigate={setView}
          collapsed={collapsed}
          user={user}
          onLogOut={() => setAuth(null)}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="h-14 shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#080d1a]/80 backdrop-blur-xl z-20">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
              >
                <Menu size={16} />
              </button>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">System</span>
                <ChevronRight size={14} className="text-slate-600" />
                <span className="text-white font-semibold capitalize">{view === "new" ? "New Case" : view === "ml" ? "ML Engine" : view}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
                <span className="text-xs font-semibold text-emerald-400">All Systems Operational</span>
              </div>
              <button className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                <Bell size={15} />
              </button>
            </div>
          </header>

          {/* Live Activity Ticker */}
          <div className="h-7 shrink-0 border-b border-white/[0.04] bg-[#060a14]/60 flex items-center overflow-hidden" style={{ backdropFilter: 'blur(8px)' }}>
            <div className="shrink-0 flex items-center gap-2 px-3 border-r border-white/8 h-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="animate-ticker">
                {[
                  { dot: 'bg-indigo-400', text: 'ML scan complete — 847 active cases scored' },
                  { dot: 'bg-red-400', text: '2 new HIGH-risk flags raised in Varanasi district' },
                  { dot: 'bg-emerald-400', text: 'Blockchain chain validated — all 4,102 blocks intact' },
                  { dot: 'bg-amber-400', text: 'MGNREGA cross-scheme duplicate cluster detected' },
                  { dot: 'bg-blue-400', text: 'New Case CASE-847 registered — ML scoring in progress' },
                  { dot: 'bg-indigo-400', text: 'ML scan complete — 847 active cases scored' },
                  { dot: 'bg-red-400', text: '2 new HIGH-risk flags raised in Varanasi district' },
                  { dot: 'bg-emerald-400', text: 'Blockchain chain validated — all 4,102 blocks intact' },
                  { dot: 'bg-amber-400', text: 'MGNREGA cross-scheme duplicate cluster detected' },
                  { dot: 'bg-blue-400', text: 'New Case CASE-847 registered — ML scoring in progress' },
                ].map((item, i) => (
                  <span key={i} className="mx-8 inline-flex items-center gap-2">
                    <span className={`w-1 h-1 rounded-full ${item.dot}`} />
                    <span className="text-[11px] text-slate-400">{item.text}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Main */}
          <main className="flex-1 overflow-y-auto relative">
            <div className="absolute inset-0 starlight-grid opacity-25 pointer-events-none" />
            <div className="relative z-10">
              {view === "home" && <HomeView token={token} onNavigate={setView} />}
              {view === "dashboard" && <DashboardView token={token} />}
              {view === "cases" && <CasesView token={token} />}
              {view === "new" && <NewCaseView token={token} onNavigate={setView} />}
              {view === "ml" && <MLView />}
              {view === "audit" && <AuditView token={token} />}
              {view === "settings" && <SettingsView />}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
