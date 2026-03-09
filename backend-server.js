// ============================================================
// SCHEME GUARD — Backend (Node.js + Express + MongoDB + JWT)
// File: backend/server.js
// ============================================================

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const crypto = require('crypto');
const csvParser = require('csv-parser');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ─── JSON PERSISTENCE ────────────────────────────────────────
const CASES_FILE = path.join(__dirname, 'cases.json');

function loadCases() {
  try {
    if (!fs.existsSync(CASES_FILE)) return [];
    return JSON.parse(fs.readFileSync(CASES_FILE, 'utf8'));
  } catch { return []; }
}

function saveCases(cases) {
  fs.writeFileSync(CASES_FILE, JSON.stringify(cases, null, 2));
}

// ─── AADHAAR FREQUENCY COMPUTATION ──────────────────────────
// Reads cases.json fresh every call (no require() caching)
function computeAadhaarStats(aadhaarClean, schemeName, beneficiaryName) {
  const cases = loadCases();
  const sameAadhaar = cases.filter(c => c.aadhaarClean === aadhaarClean);
  const sameScheme = sameAadhaar.filter(c => c.schemeName === schemeName);
  // Identity mismatch: same Aadhaar but different name (case-insensitive)
  const normName = (beneficiaryName || '').toLowerCase().trim();
  const nameMismatch = sameAadhaar.some(
    c => c.name && c.name.toLowerCase().trim() !== normName
  );

  let duplicationStatus = 'unique';
  if (nameMismatch) duplicationStatus = 'identity_mismatch';
  else if (sameScheme.length > 0) duplicationStatus = 'same_scheme';
  else if (sameAadhaar.length > 0) duplicationStatus = 'cross_scheme';

  const duplicationTypeLabel = {
    same_scheme: 'Same Scheme Duplicate',
    cross_scheme: 'Cross Scheme Participation',
    identity_mismatch: 'Identity Mismatch',
    unique: 'Unique',
  }[duplicationStatus];

  return {
    aadhaarFrequency: sameAadhaar.length + 1,
    sameSchemeCount: sameScheme.length + 1,
    crossSchemeOnly: sameAadhaar.length > 0 && sameScheme.length === 0 && !nameMismatch,
    nameMismatch,
    duplicationStatus,
    duplicationTypeLabel,
  };
}

const app = express();

// ─── SECURITY MIDDLEWARE ─────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  }
}));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: { error: 'Too many login attempts, please try again in 15 minutes.' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// ─── DATABASE SCHEMAS ────────────────────────────────────────

// Encryption helpers for Aadhaar
const ENCRYPT_KEY = Buffer.from(process.env.AADHAAR_KEY || 'SchemeGuard2026__SecureKey123456', 'utf8');
const IV_LENGTH = 16;

function encryptAadhaar(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPT_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decryptAadhaar(text) {
  const [ivHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPT_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function maskAadhaar(aadhaar) {
  const digits = aadhaar.replace(/\D/g, '');
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

// USER SCHEMA
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'officer', 'viewer'], default: 'officer' },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// BENEFICIARY SCHEMA
const beneficiarySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  aadhaarEncrypted: { type: String, required: true },
  aadhaarMasked: { type: String, required: true },
  aadhaarClean: { type: String, default: '' },             // for frequency lookups
  income: { type: Number, required: true, min: 0 },
  bankAccount: { type: String, required: true, trim: true },
  district: { type: String, required: true, trim: true },
  state: { type: String, default: 'Uttar Pradesh' },
  schemeName: { type: String, required: true },
  riskScore: { type: Number, default: 0, min: 0, max: 100 },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
  caseStatus: { type: String, enum: ['Open', 'Flagged', 'Under Investigation', 'Cleared', 'Closed'], default: 'Open' },
  officerNotes: { type: String, default: '', maxlength: 2000 },
  flags: [{ type: String }],
  mlProbability: { type: Number, default: null },
  mlExplanation: { type: Object, default: null },
  assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  caseHash: { type: String, unique: true, sparse: true },
  // ── Aadhaar duplication metadata (additive, no breaking changes) ──
  aadhaarFrequency: { type: Number, default: 1 },
  sameSchemeCount: { type: Number, default: 1 },
  duplicationStatus: { type: String, enum: ['unique', 'cross_scheme', 'same_scheme', 'identity_mismatch'], default: 'unique' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Escalation fields
  escalated: { type: Boolean, default: false },
  escalated_at: { type: Date },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
  investigation_report: { type: Object, default: null },
});

beneficiarySchema.index({ aadhaarEncrypted: 1, schemeName: 1 }, { unique: true });
beneficiarySchema.index({ district: 1, schemeName: 1 });
beneficiarySchema.index({ riskLevel: 1, caseStatus: 1 });
beneficiarySchema.index({ bankAccount: 1 });

const Beneficiary = mongoose.model('Beneficiary', beneficiarySchema);

// AUDIT LOG SCHEMA
const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String,
  action: { type: String, required: true },
  targetId: String,
  targetType: String,
  detail: String,
  ipAddress: String,
  timestamp: { type: Date, default: Date.now }
});
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// ─── LEDGER BLOCK SCHEMA (Blockchain Layer) ──────────────────
const ledgerBlockSchema = new mongoose.Schema({
  index: { type: Number, required: true },
  action: { type: String, enum: ['CREATE', 'STATUS_UPDATE', 'ML_SCORE', 'DELETE'], required: true },
  recordId: { type: String, required: true },
  dataHash: { type: String, required: true },
  previousHash: { type: String, required: true },
  hash: { type: String, required: true, unique: true },
  timestamp: { type: String, required: true },
});
const LedgerBlock = mongoose.model('LedgerBlock', ledgerBlockSchema);

// ─── BLOCKCHAIN SERVICE ──────────────────────────────────────
/**
 * generateHash — SHA-256 of (index + recordId + dataHash + previousHash + timestamp)
 */
function generateHash(index, recordId, dataHash, previousHash, timestamp) {
  return crypto
    .createHash('sha256')
    .update(`${index}${recordId}${dataHash}${previousHash}${timestamp}`)
    .digest('hex');
}

/**
 * addBlock — creates and persists the next chained ledger block.
 * Fire-and-forget: never throws; errors are only logged.
 */
async function addBlock(action, recordId, dataObject) {
  try {
    // dataHash = SHA-256 of the full data snapshot
    const dataHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(dataObject))
      .digest('hex');

    // Find the last block to chain from
    const last = await LedgerBlock.findOne().sort({ index: -1 });
    const previousHash = last ? last.hash : '0';
    const index = last ? last.index + 1 : 0;
    const timestamp = new Date().toISOString();

    const hash = generateHash(index, String(recordId), dataHash, previousHash, timestamp);

    await LedgerBlock.create({
      index,
      action,
      recordId: String(recordId),
      dataHash,
      previousHash,
      hash,
      timestamp,
    });

    console.log(`🔗 Ledger block #${index} added [${action}] for record ${String(recordId).slice(0, 8)}…`);
  } catch (err) {
    console.error('Ledger addBlock error:', err.message);
  }
}

/**
 * validateChain — verifies every block's hash and the previousHash linkage.
 * Returns { valid: true } or { valid: false, message: '...' }
 */
async function validateChain() {
  try {
    const blocks = await LedgerBlock.find().sort({ index: 1 });

    if (blocks.length === 0) return { valid: true };

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];

      // Recompute expected hash
      const expected = generateHash(b.index, b.recordId, b.dataHash, b.previousHash, b.timestamp);
      if (b.hash !== expected) {
        return { valid: false, message: 'Blockchain integrity compromised' };
      }

      // Verify chain linkage (skip genesis block)
      if (i > 0 && b.previousHash !== blocks[i - 1].hash) {
        return { valid: false, message: 'Blockchain integrity compromised' };
      }
    }

    return { valid: true };
  } catch (err) {
    console.error('validateChain error:', err.message);
    return { valid: false, message: 'Blockchain integrity compromised' };
  }
}

// ─── MIDDLEWARE ──────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'scheme_guard_jwt_secret_2026');
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

async function logAudit(userId, userName, action, targetId, targetType, detail, ipAddress) {
  try {
    await AuditLog.create({ userId, userName, action, targetId, targetType, detail, ipAddress });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// Input sanitization
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<script.*?>.*?<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim();
}

// Text Normalization for duplicate detection
function normalizeText(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function generateCaseHash(name, aadhaarClean, schemeName) {
  const normName = normalizeText(name);
  const normAadhaar = normalizeText(aadhaarClean);
  const normScheme = normalizeText(schemeName);
  const combined = `${normName}|${normAadhaar}|${normScheme}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

// ─── PHASE 1: RULE-BASED RISK SCORING ─────────────────────
async function computeRuleBasedScore(beneficiary) {
  let score = 0;
  const flags = [];

  // Same Aadhaar multiple times = +50
  const aadhaarCount = await Beneficiary.countDocuments({
    aadhaarEncrypted: beneficiary.aadhaarEncrypted,
    _id: { $ne: beneficiary._id }
  });
  if (aadhaarCount > 0) { score += 50; flags.push('duplicate_aadhaar'); }

  // Same bank account used by many = +30
  const bankCount = await Beneficiary.countDocuments({
    bankAccount: beneficiary.bankAccount,
    _id: { $ne: beneficiary._id }
  });
  if (bankCount >= 2) { score += 30; flags.push('shared_bank'); }

  // Income mismatch vs scheme threshold = +20
  const SCHEME_INCOME_LIMITS = {
    'PM-KISAN': 25000,
    'PMAY': 50000,
    'MGNREGS': 40000,
  };
  const limit = SCHEME_INCOME_LIMITS[beneficiary.schemeName];
  if (limit && beneficiary.income > limit) { score += 20; flags.push('income_mismatch'); }

  score = Math.min(score, 100);
  const level = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';

  return { score, level, flags };
}

// ─── AUTH ROUTES ─────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    await logAudit(user._id, user.name, 'LOGIN', null, 'auth', `User logged in`, req.ip);

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'scheme_guard_jwt_secret_2026',
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── BENEFICIARY ROUTES ──────────────────────────────────────
app.get('/api/beneficiaries', auth, async (req, res) => {
  try {
    const {
      page = 1, limit = 20, riskLevel, status,
      district, scheme, search, sortBy = 'riskScore', sortDir = 'desc'
    } = req.query;

    const query = {};
    if (riskLevel && riskLevel !== 'ALL') query.riskLevel = riskLevel;
    if (status) query.caseStatus = status;
    if (district) query.district = new RegExp(district, 'i');
    if (scheme) query.schemeName = new RegExp(scheme, 'i');
    if (search) query.$or = [
      { name: new RegExp(search, 'i') },
      { district: new RegExp(search, 'i') },
      { schemeName: new RegExp(search, 'i') }
    ];

    const sort = { [sortBy]: sortDir === 'desc' ? -1 : 1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [results, total] = await Promise.all([
      Beneficiary.find(query).sort(sort).skip(skip).limit(parseInt(limit))
        .select('-aadhaarEncrypted'), // Never send encrypted Aadhaar to frontend
      Beneficiary.countDocuments(query)
    ]);

    res.json({ results, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch beneficiaries' });
  }
});

app.post('/api/beneficiaries', auth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const { name, aadhaar, income, bankAccount, district, schemeName } = req.body;

    // Validate
    if (!name || !aadhaar || !income || !bankAccount || !district || !schemeName) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const aadhaarClean = aadhaar.replace(/\D/g, '');
    if (aadhaarClean.length !== 12) return res.status(400).json({ error: 'Invalid Aadhaar number' });

    // ─── PHASE 6: ROBUST DUPLICATE DETECTION ─────────────────
    const caseHash = generateCaseHash(name, aadhaarClean, schemeName);

    // 1. Exact Hash Match
    const exactMatch = await Beneficiary.findOne({ caseHash });
    if (exactMatch) {
      await logAudit(req.user.userId, req.user.name, 'DUPLICATE_ATTEMPT', exactMatch._id, 'beneficiary', `Attempted to create exact duplicate of ${exactMatch.name}`, req.ip);
      return res.status(409).json({ error: 'Potential duplicate case detected (Exact Match)', existingCase: { id: exactMatch._id, name: exactMatch.name } });
    }

    // 2. Fuzzy / Semantic Similarity Match via ML Service
    try {
      // Find possible candidates in the same district and scheme
      const candidates = await Beneficiary.find({ district: sanitize(district), schemeName: sanitize(schemeName) }).select('_id name');

      if (candidates.length > 0) {
        const mlResponse = await axios.post(
          `${process.env.ML_SERVICE_URL || 'http://localhost:8000'}/check-similarity`,
          {
            source_text: sanitize(name),
            candidates: candidates.map(c => ({ id: c._id.toString(), text: c.name }))
          },
          { timeout: 5000 }
        );

        if (mlResponse.data && mlResponse.data.is_duplicate) {
          const matchedId = mlResponse.data.matched_candidate_id;
          const matchedCand = candidates.find(c => c._id.toString() === matchedId);
          await logAudit(req.user.userId, req.user.name, 'DUPLICATE_ATTEMPT', matchedId, 'beneficiary', `Attempted to create fuzzy/semantic duplicate of ${matchedCand?.name}`, req.ip);
          return res.status(409).json({
            error: `Potential duplicate case detected (${mlResponse.data.match_type} match)`,
            existingCase: { id: matchedId, name: matchedCand?.name || 'Unknown' }
          });
        }
      }
    } catch (err) {
      console.warn('Similarity check warning:', err.message);
      // Proceed if ML is down, as exact hash handles direct duplicates
    }
    // ─────────────────────────────────────────────────────────

    // ── PART 2: Aadhaar frequency + duplication type ────────────
    const { aadhaarFrequency, sameSchemeCount, crossSchemeOnly, nameMismatch, duplicationStatus: dupStatus, duplicationTypeLabel } =
      computeAadhaarStats(aadhaarClean, sanitize(schemeName), sanitize(name));

    const beneficiary = new Beneficiary({
      name: sanitize(name),
      aadhaarEncrypted: encryptAadhaar(aadhaarClean),
      aadhaarMasked: maskAadhaar(aadhaarClean),
      aadhaarClean,                              // stored for future frequency lookups
      income: parseFloat(income),
      bankAccount: sanitize(bankAccount),
      district: sanitize(district),
      schemeName: sanitize(schemeName),
      caseHash,
      aadhaarFrequency,
      sameSchemeCount,
    });

    // Phase 1: Rule scoring
    const { score, level, flags } = await computeRuleBasedScore(beneficiary);
    beneficiary.riskScore = score;
    beneficiary.riskLevel = level;
    beneficiary.flags = flags;
    if (score >= 40) beneficiary.caseStatus = 'Flagged';

    // ── PART 2: Apply duplication risk rules ─────────────────
    if (nameMismatch) {
      // Same Aadhaar + Different Name → Identity Fraud (HIGH)
      beneficiary.riskScore = Math.min(beneficiary.riskScore + 60, 100);
      beneficiary.riskLevel = 'HIGH';
      beneficiary.caseStatus = 'Flagged';
      beneficiary.flags.push('identity_mismatch');
      beneficiary.duplicationStatus = 'identity_mismatch';
    } else if (sameSchemeCount > 1) {
      // Same Aadhaar + Same Scheme → HIGH risk trigger
      beneficiary.riskScore = Math.min(beneficiary.riskScore + 50, 100);
      beneficiary.riskLevel = 'HIGH';
      beneficiary.caseStatus = 'Flagged';
      beneficiary.flags.push('same_scheme_aadhaar_dup');
      beneficiary.duplicationStatus = 'same_scheme';
    } else if (crossSchemeOnly) {
      // Same Aadhaar + Different Scheme → medium increase
      beneficiary.riskScore = Math.min(beneficiary.riskScore + 20, 100);
      if (beneficiary.riskScore >= 40) beneficiary.riskLevel = 'MEDIUM';
      beneficiary.flags.push('cross_scheme_aadhaar_dup');
      beneficiary.duplicationStatus = 'cross_scheme';
    } else {
      beneficiary.duplicationStatus = 'unique';
    }

    await beneficiary.save();
    // ── Blockchain: record CREATE event (fire-and-forget) ────
    addBlock('CREATE', beneficiary._id, beneficiary.toObject()).catch(console.error);

    await logAudit(req.user.userId, req.user.name, 'BENEFICIARY_CREATED', beneficiary._id, 'beneficiary',
      `New case: ${name} | aadhaar_freq=${aadhaarFrequency} dup=${beneficiary.duplicationStatus}`, req.ip);

    // ── PART 1: Write to cases.json for persistence ──────────
    const allCases = loadCases();
    const caseRecord = { ...beneficiary.toObject(), aadhaarEncrypted: undefined };
    allCases.push(caseRecord);
    saveCases(allCases);

    res.status(201).json({ ...beneficiary.toObject(), aadhaarEncrypted: undefined });
  } catch (err) {
    console.error('Create beneficiary error:', err);
    res.status(500).json({ error: 'Failed to create beneficiary' });
  }
});

app.put('/api/beneficiaries/:id/status', auth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const valid = ['Open', 'Flagged', 'Under Investigation', 'Cleared', 'Closed'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const beneficiary = await Beneficiary.findByIdAndUpdate(
      req.params.id,
      { caseStatus: status, officerNotes: sanitize(notes || ''), updatedAt: new Date() },
      { new: true, select: '-aadhaarEncrypted' }
    );
    if (!beneficiary) return res.status(404).json({ error: 'Beneficiary not found' });

    // ── Blockchain: record STATUS_UPDATE event (fire-and-forget) ─
    addBlock('STATUS_UPDATE', req.params.id, beneficiary.toObject()).catch(console.error);

    await logAudit(req.user.userId, req.user.name, 'STATUS_UPDATED', req.params.id, 'beneficiary',
      `Status changed to ${status}`, req.ip);

    res.json(beneficiary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ── Case Deletion (Tombstone Approach) ────────────────────
app.post('/api/beneficiaries/:id/delete', auth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) return res.status(404).json({ error: 'Beneficiary not found' });

    // ── Blockchain: record DELETE event as a cryptographic tombstone ─
    addBlock('DELETE', req.params.id, { ...beneficiary.toObject(), deleted: true }).catch(console.error);

    // Remove from MongoDB
    await beneficiary.deleteOne();

    // Remove from local cases.json file cache to keep in sync
    const allCases = loadCases();
    const updatedCases = allCases.filter(c => c._id && c._id.toString() !== req.params.id);
    saveCases(updatedCases);

    await logAudit(req.user.userId, req.user.name, 'CASE_DELETED', req.params.id, 'beneficiary',
      `Permanently deleted case ${beneficiary.name}`, req.ip);

    res.json({ success: true, message: 'Case securely deleted' });
  } catch (err) {
    console.error('Delete beneficiary error:', err);
    res.status(500).json({ error: 'Failed to delete beneficiary' });
  }
});

// ML Scoring integration
app.post('/api/beneficiaries/:id/score', auth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) return res.status(404).json({ error: 'Not found' });

    // ── Compute real aadhaar_frequency from cases.json ───────
    const { aadhaarFrequency: af } =
      computeAadhaarStats(beneficiary.aadhaarClean || '', beneficiary.schemeName);

    // Call ML microservice
    const mlResponse = await axios.post(
      `${process.env.ML_SERVICE_URL || 'http://localhost:8000'}/predict`,
      {
        income: beneficiary.income,
        aadhaar_frequency: af,                                        // real count from JSON
        bank_overlap: beneficiary.flags.includes('shared_bank') ? 5 : 1,
        income_ratio: beneficiary.income / 25000,
        district: beneficiary.district,
        scheme: beneficiary.schemeName,
      },
      { timeout: 10000 }
    );

    const { probability, shap_values } = mlResponse.data;

    const riskScore = Math.round(probability * 100);
    const riskLevel = riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW';

    await Beneficiary.findByIdAndUpdate(req.params.id, {
      mlProbability: probability,
      mlExplanation: shap_values,
      riskScore: riskScore,
      riskLevel: riskLevel,
      updatedAt: new Date()
    });

    // ── Blockchain: record ML_SCORE event (fire-and-forget) ──
    addBlock('ML_SCORE', req.params.id, { probability, riskScore, riskLevel, shap_values }).catch(console.error);

    await logAudit(req.user.userId, req.user.name, 'ML_SCORED', req.params.id, 'beneficiary',
      `ML probability: ${probability}`, req.ip);

    res.json({ probability, shap_values, riskScore, riskLevel });
  } catch (err) {
    res.status(502).json({ error: 'ML service unavailable', details: err.message });
  }
});

// ─── ESCALATION ROUTE ───────────────────────────────────────────────
const DISTRICT_RISK_SCORES = {
  'Varanasi': 0.82, 'Agra': 0.71, 'Lucknow': 0.65,
  'Meerut': 0.60, 'Kanpur': 0.58, 'Prayagraj': 0.42,
  'Gorakhpur': 0.45, 'Mathura': 0.38,
};

function buildForensicReport(beneficiary) {
  const districtRisk = DISTRICT_RISK_SCORES[beneficiary.district] || 0.50;
  const prob = beneficiary.mlProbability ?? 0;
  const riskScore = beneficiary.riskScore ?? 0;

  // SHAP explanation rows
  const shapRaw = beneficiary.mlExplanation || {};
  const shapTotal = Object.values(shapRaw).reduce((s, v) => s + Math.abs(v), 0) || 1;
  const shap_explanation = Object.entries(shapRaw)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .map(([feature, value]) => ({
      feature,
      impact_percentage: Math.round((Math.abs(value) / shapTotal) * 100),
    }));

  // Anomaly interpretation
  const anomalyScore = beneficiary.anomalyScore ||
    (prob > 0.7 ? 0.82 : prob > 0.4 ? 0.55 : 0.2);
  const anomalyInterpretation =
    anomalyScore > 0.7 ? 'Strong anomaly detected — behaviour deviates significantly from legitimate population' :
      anomalyScore > 0.4 ? 'Moderate anomaly — some unusual characteristics identified' :
        'Low anomaly — behaviour largely consistent with legitimate cases';

  // Human-readable final reasoning
  const reasons = [];
  if (beneficiary.duplicationStatus === 'identity_mismatch')
    reasons.push('Identity mismatch: the same Aadhaar number has been registered under a different name, indicating potential identity fraud');
  if (beneficiary.duplicationStatus === 'same_scheme')
    reasons.push(`Aadhaar appears ${beneficiary.aadhaarFrequency || 1} times in the same scheme (${beneficiary.schemeName}), a strong indicator of duplicate claiming`);
  if (beneficiary.duplicationStatus === 'cross_scheme')
    reasons.push(`Aadhaar is active across multiple schemes (frequency: ${beneficiary.aadhaarFrequency || 1}), warranting cross-scheme verification`);
  if (districtRisk >= 0.7)
    reasons.push(`${beneficiary.district} is a high-risk district (risk score: ${districtRisk})`);
  if (beneficiary.income > 40000)
    reasons.push('Income significantly exceeds the typical threshold for this scheme');
  if ((beneficiary.flags || []).includes('shared_bank'))
    reasons.push('Bank account is shared with multiple beneficiaries, indicating financial overlap');
  if (reasons.length === 0)
    reasons.push('Risk factors are within acceptable bounds; escalation triggered by officer discretion');

  return {
    risk_summary: {
      risk_score: riskScore,
      risk_level: beneficiary.riskLevel,
      ml_probability: prob,
      anomaly_score: parseFloat(anomalyScore.toFixed(4)),
    },
    duplication_analysis: {
      aadhaar_frequency: beneficiary.aadhaarFrequency || 1,
      same_scheme_count: beneficiary.sameSchemeCount || 1,
      duplication_type: beneficiary.duplicationStatus || 'unique',
    },
    feature_analysis: {
      income: beneficiary.income,
      income_ratio: parseFloat((beneficiary.income / 25000).toFixed(3)),
      bank_overlap: (beneficiary.flags || []).includes('shared_bank') ? 'detected' : 'none',
      district: beneficiary.district,
      district_risk_value: districtRisk,
    },
    shap_explanation,
    anomaly_analysis: {
      anomaly_score: parseFloat(anomalyScore.toFixed(4)),
      anomaly_interpretation: anomalyInterpretation,
    },
    final_decision_reasoning: reasons.join('. ') + '.',
    generated_at: new Date().toISOString(),
  };
}

app.post('/api/beneficiaries/:id/escalate', auth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) return res.status(404).json({ error: 'Case not found' });

    // Build forensic report
    const investigation_report = buildForensicReport(beneficiary);

    // Update case in MongoDB
    const updatedBeneficiary = await Beneficiary.findByIdAndUpdate(
      req.params.id,
      {
        caseStatus: 'Under Investigation',
        escalated: true,
        escalated_at: new Date().toISOString(),
        priority: 'High',
        investigation_report,
        updatedAt: new Date(),
      },
      { new: true, select: '-aadhaarEncrypted' }
    );

    // Persist to cases.json
    const allCases = loadCases();
    const idx = allCases.findIndex(c => c.caseHash === beneficiary.caseHash);
    const updatedRecord = updatedBeneficiary.toObject();
    delete updatedRecord.aadhaarEncrypted;
    if (idx !== -1) {
      allCases[idx] = { ...allCases[idx], ...updatedRecord };
    } else {
      allCases.push(updatedRecord);
    }
    saveCases(allCases);

    await logAudit(
      req.user.userId, req.user.name, 'CASE_ESCALATED', req.params.id, 'beneficiary',
      `Case escalated to Under Investigation | dup=${beneficiary.duplicationStatus}`, req.ip
    );

    res.json({ success: true, investigation_report, caseStatus: 'Under Investigation', escalated_at: updatedRecord.escalated_at });
  } catch (err) {
    console.error('Escalation error:', err);
    res.status(500).json({ error: 'Escalation failed', details: err.message });
  }
});

// Bulk CSV upload
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
app.post('/api/beneficiaries/bulk', auth, requireRole('admin'), upload.single('file'), async (req, res) => {
  // Process CSV and insert records with rule-based scoring
  // Implementation omitted for brevity — follows same pattern as POST /api/beneficiaries
  res.json({ message: 'Bulk upload processed', count: 0 });
});

// Dashboard stats
app.get('/api/dashboard/stats', auth, async (req, res) => {
  try {
    const [total, high, medium, low, underInvestigation, cleared] = await Promise.all([
      Beneficiary.countDocuments(),
      Beneficiary.countDocuments({ riskLevel: 'HIGH' }),
      Beneficiary.countDocuments({ riskLevel: 'MEDIUM' }),
      Beneficiary.countDocuments({ riskLevel: 'LOW' }),
      Beneficiary.countDocuments({ caseStatus: 'Under Investigation' }),
      Beneficiary.countDocuments({ caseStatus: 'Cleared' }),
    ]);

    const byDistrict = await Beneficiary.aggregate([
      { $group: { _id: '$district', count: { $sum: 1 }, avgRisk: { $avg: '$riskScore' } } },
      { $sort: { avgRisk: -1 } },
      { $limit: 10 }
    ]);

    const byScheme = await Beneficiary.aggregate([
      { $group: { _id: '$schemeName', count: { $sum: 1 }, highRisk: { $sum: { $cond: [{ $eq: ['$riskLevel', 'HIGH'] }, 1, 0] } } } },
      { $sort: { highRisk: -1 } }
    ]);

    res.json({ total, high, medium, low, underInvestigation, cleared, byDistrict, byScheme });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Audit logs
app.get('/api/audit-logs', auth, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('userId', 'name email');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── BLOCKCHAIN ROUTES ───────────────────────────────
// GET /api/blockchain/blocks
app.get('/api/blockchain/blocks', auth, async (req, res) => {
  try {
    const blocks = await LedgerBlock.find().sort({ index: -1 }).limit(100);
    res.json(blocks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch blockchain ledgers' });
  }
});

// GET /api/blockchain/validate
// Returns { valid: true } or { valid: false, message: '...' }
app.get('/api/blockchain/validate', auth, async (req, res) => {
  try {
    const result = await validateChain();
    res.json(result);
  } catch (err) {
    res.status(500).json({ valid: false, message: 'Blockchain integrity compromised' });
  }
});

const PORT = process.env.PORT || 4000;

const { MongoMemoryServer } = require('mongodb-memory-server');

async function startServer() {
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('📦 Connected to In-Memory MongoDB');

  // ── PART 1: Restore persisted cases from cases.json ─────
  const persisted = loadCases();
  let reloaded = 0;
  for (const c of persisted) {
    try {
      if (!c.caseHash) continue;
      const exists = await Beneficiary.findOne({ caseHash: c.caseHash });
      if (!exists) {
        const doc = { ...c };
        delete doc._id;          // let Mongo assign a fresh _id
        // aadhaarEncrypted is required but stripped from JSON (display uses aadhaarMasked)
        if (!doc.aadhaarEncrypted) doc.aadhaarEncrypted = 'RELOAD_PLACEHOLDER';
        await Beneficiary.create(doc);
        reloaded++;
      }
    } catch (e) {
      console.warn(`⚠ Skipped reload for case ${c.caseHash?.slice(0, 8)}: ${e.message}`);
    }
  }
  console.log(`📂 Reloaded ${reloaded} / ${persisted.length} cases from cases.json`);

  // Seed user to be able to login
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await User.create({ name: 'Admin', email: 'admin@schemeguard.gov.in', passwordHash: adminPasswordHash, role: 'admin' });
  console.log('👤 Admin user seeded: admin@schemeguard.gov.in / admin123');

  // Seed sample beneficiaries
  try {
    const defaultData = [
      { name: 'Rajesh Kumar', aadhaar: '123456783421', income: 28000, bankAccount: 'SBI-0042', district: 'Varanasi', schemeName: 'PM-KISAN' },
      { name: 'Sunita Devi', aadhaar: '234567897812', income: 45000, bankAccount: 'PNB-1120', district: 'Lucknow', schemeName: 'PMAY' },
      { name: 'Mohammad Rafi', aadhaar: '345678905509', income: 32000, bankAccount: 'BOB-2234', district: 'Agra', schemeName: 'MGNREGS' },
      { name: 'Priya Sharma', aadhaar: '456789019901', income: 18000, bankAccount: 'SBI-0042', district: 'Kanpur', schemeName: 'PM-KISAN' },
      { name: 'Arvind Yadav', aadhaar: '567890121123', income: 22000, bankAccount: 'HDFC-8812', district: 'Prayagraj', schemeName: 'PMAY' }
    ];

    for (const b of defaultData) {
      const beneficiary = new Beneficiary({
        name: sanitize(b.name),
        aadhaarEncrypted: encryptAadhaar(b.aadhaar),
        aadhaarMasked: maskAadhaar(b.aadhaar),
        income: b.income,
        bankAccount: sanitize(b.bankAccount),
        district: sanitize(b.district),
        schemeName: sanitize(b.schemeName),
        caseHash: generateCaseHash(b.name, b.aadhaar, b.schemeName)
      });

      // Simple rule check (abridged)
      if (b.schemeName === 'PM-KISAN' && b.income > 25000) {
        beneficiary.riskScore += 20;
        beneficiary.flags.push('income_mismatch');
      }

      const level = beneficiary.riskScore >= 70 ? 'HIGH' : beneficiary.riskScore >= 40 ? 'MEDIUM' : 'LOW';
      beneficiary.riskLevel = level;
      if (beneficiary.riskScore >= 40) beneficiary.caseStatus = 'Flagged';

      await beneficiary.save();
    }
    console.log('📋 Seeded 5 sample beneficiaries');
  } catch (err) {
    console.error('Failed to seed beneficiaries:', err);
  }

  app.listen(PORT, () => console.log(`🛡️  Scheme Guard API running on port ${PORT}`));
}

startServer().catch(console.error);
