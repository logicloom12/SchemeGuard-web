// ─── API CLIENT ───────────────────────────────────────────────────
// All requests go to the Node.js backend on port 4000.
// Each function throws an Error with the backend error message on non-2xx.

const BASE = 'http://localhost:4000';

function headers(token) {
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

async function request(url, options = {}) {
    const res = await fetch(`${BASE}${url}`, options);
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data.error || `Request failed (${res.status})`);
        error.data = data;
        error.status = res.status;
        throw error;
    }
    return data;
}

/** Authenticate against the real backend. Returns { token, user }. */
export async function apiLogin(email, password) {
    return request('/api/auth/login', {
        method: 'POST',
        headers: headers(null),
        body: JSON.stringify({ email, password }),
    });
}

/**
 * Fetch paginated beneficiary list.
 * Params: { riskLevel, status, district, scheme, search, page, limit }
 * Returns { results, total, page, pages }
 */
export async function apiFetchBeneficiaries(token, params = {}) {
    const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString();
    return request(`/api/beneficiaries${qs ? '?' + qs : ''}`, {
        headers: headers(token),
    });
}

/**
 * Create a new beneficiary case. The backend runs rule-based scoring automatically.
 * Body: { name, aadhaar (12 digits), income, bankAccount, district, schemeName }
 * Returns the created beneficiary object.
 */
export async function apiCreateBeneficiary(token, body) {
    return request('/api/beneficiaries', {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify(body),
    });
}

/**
 * Permanently delete a beneficiary case. Creates a tombstone log in the blockchain.
 * Returns { success, message }
 */
export async function apiDeleteBeneficiary(token, id) {
    return request(`/api/beneficiaries/${id}/delete`, {
        method: 'POST',
        headers: headers(token),
    });
}

/**
 * Trigger ML scoring for an existing beneficiary.
 * Returns { probability, shap_values, risk_level }
 */
export async function apiScoreBeneficiary(token, id) {
    return request(`/api/beneficiaries/${id}/score`, {
        method: 'POST',
        headers: headers(token),
    });
}

/**
 * Escalate a case to "Under Investigation" and generate a forensic report.
 * Returns { success, investigation_report, caseStatus, escalated_at }
 */
export async function apiEscalateBeneficiary(token, id) {
    return request(`/api/beneficiaries/${id}/escalate`, {
        method: 'POST',
        headers: headers(token),
    });
}

/** Fetch dashboard stats. Returns { total, high, medium, low, underInvestigation, cleared, byScheme } */
export async function apiFetchStats(token) {
    return request('/api/dashboard/stats', { headers: headers(token) });
}

/** Fetch audit logs (admin only). Returns an array of log entries. */
export async function apiFetchAuditLogs(token) {
    return request('/api/audit-logs', { headers: headers(token) });
}

/** Fetch actual cryptographic blockchain ledgers. Returns an array of LedgerBlock objects. */
export async function apiFetchBlockchainBlocks(token) {
    return request('/api/blockchain/blocks', { headers: headers(token) });
}

/**
 * Normalize a raw backend beneficiary into the shape used by frontend components.
 */
export function normalizeBeneficiary(b) {
    return {
        _id: b._id,
        id: `CASE-${b._id.slice(-6).toUpperCase()}`,
        name: b.name,
        aadhaar: b.aadhaarMasked || '****-****-????',
        income: b.income,
        bank: b.bankAccount,
        district: b.district,
        scheme: b.schemeName,
        riskScore: Math.round(b.riskScore),
        riskLevel: b.riskLevel,
        status: b.caseStatus,
        flagged: b.flags || [],
        mlProbability: b.mlProbability,
        mlExplanation: b.mlExplanation,
        escalated: b.escalated || false,
        escalated_at: b.escalated_at || null,
        duplicationStatus: b.duplicationStatus || 'unique',
        aadhaarFrequency: b.aadhaarFrequency || 1,
        investigation_report: b.investigation_report || null,
    };
}
