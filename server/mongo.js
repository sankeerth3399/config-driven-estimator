import mongoose, { Schema } from 'mongoose';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  ConfigModel,
  UserModel,
  SessionModel,
  LeadModel,
  WebhookModel,
  ConfigSchema,
  UserSchema,
  SessionSchema,
  LeadSchema,
  WebhookSchema,
  QuestionSchema,
  OptionSchema,
  ModifiersSchema,
  BusinessSchema,
} from './models/index.js';

export {
  ConfigModel,
  UserModel,
  SessionModel,
  LeadModel,
  WebhookModel,
  ConfigSchema,
  UserSchema,
  SessionSchema,
  LeadSchema,
  WebhookSchema,
  QuestionSchema,
  OptionSchema,
  ModifiersSchema,
  BusinessSchema,
};

// ==========================================
// 1. DEFAULT SEED DATA
// ==========================================
export const SEED_CONFIG = {
  config_version: 3,
  business: {
    name: 'Northline Roofing & Exteriors',
    region: 'Columbus, OH',
    currency: 'USD',
  },
  questions: [
    {
      key: 'roof_area',
      label: 'Roughly how big is your roof?',
      type: 'number',
      unit: 'sq ft',
      required: true,
      min: 300,
      max: 12000,
      active: true,
    },
    {
      key: 'material',
      label: 'What material do you want?',
      type: 'select',
      required: true,
      active: true,
      options: [
        { value: 'asphalt_3tab', label: 'Asphalt shingle - 3-tab', rate_per_sqft: 4.25 },
        { value: 'asphalt_arch', label: 'Asphalt shingle - architectural', rate_per_sqft: 5.9 },
        { value: 'metal_standing', label: 'Standing seam metal', rate_per_sqft: 12.4 },
        { value: 'cedar_shake', label: 'Cedar shake', rate_per_sqft: 11.1 },
      ],
    },
    {
      key: 'pitch',
      label: 'How steep is the roof?',
      type: 'select',
      required: true,
      active: true,
      options: [
        { value: 'low', label: 'Low - you could walk on it', multiplier: 1.0 },
        { value: 'medium', label: 'Medium', multiplier: 1.12 },
        { value: 'steep', label: 'Steep - not walkable', multiplier: 1.3 },
      ],
    },
    {
      key: 'layers',
      label: 'How many layers of old roofing are on there now?',
      type: 'select',
      required: true,
      active: true,
      options: [
        { value: '0', label: 'None - new build', tear_off_per_sqft: 0 },
        { value: '1', label: 'One layer', tear_off_per_sqft: 1.15 },
        { value: '2', label: 'Two or more layers', tear_off_per_sqft: 2.05 },
      ],
    },
    {
      key: 'stories',
      label: 'How many stories is the house?',
      type: 'select',
      required: true,
      active: true,
      options: [
        { value: '1', label: 'Single storey', multiplier: 1.0 },
        { value: '2', label: 'Two storeys', multiplier: 1.08 },
        { value: '3', label: 'Three or more', multiplier: 1.18 },
      ],
    },
  ],
  modifiers: {
    waste_factor: 0.1,
    permit_flat_fee: 350,
    range_spread_pct: 12,
  },
  updated_at: '2026-06-01T10:00:00Z',
  updated_by: 'Dale Whitmore',
  change_notes: 'Initial production config',
};

export const SEED_LEADS = [
  {
    id: 'ld_1041',
    captured_at: '2026-06-02T14:20:11Z',
    config_version: 3,
    name: 'Ana Ruiz',
    phone: '+1-614-555-0148',
    email: 'aruiz@example.com',
    answers: { roof_area: 2100, material: 'asphalt_arch', pitch: 'medium', layers: '1', stories: '2' },
    estimate_low: 21480,
    estimate_high: 27260,
  },
  {
    id: 'ld_1102',
    captured_at: '2026-07-11T18:47:03Z',
    config_version: 3,
    name: 'Priya Nair',
    phone: '+1-614-555-0177',
    email: 'pnair@example.com',
    answers: { roof_area: 900, material: 'metal_standing', pitch: 'low', layers: '0', stories: '1' },
    estimate_low: 12240,
    estimate_high: 15530,
  },
];

// ==========================================
// 2. PASSWORD HASHING
// ==========================================
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedPassword) {
  if (!storedPassword || typeof storedPassword !== 'string') return false;
  if (!storedPassword.includes(':')) return password === storedPassword;
  const [salt, key] = storedPassword.split(':');
  if (!salt || !key) return false;
  const hashedBuffer = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  if (hashedBuffer.length !== keyBuffer.length) return false;
  return crypto.timingSafeEqual(hashedBuffer, keyBuffer);
}

export const DEFAULT_USERS = [
  {
    id: 'usr_dale',
    username: 'dale',
    name: 'Dale Whitmore',
    email: 'dale@northlineroofing.com',
    password: hashPassword('northline2026', 'northline_salt_1'),
    role: 'Owner',
    company_name: 'Northline Roofing & Exteriors',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'usr_marcus',
    username: 'marcus',
    name: 'Marcus Vance',
    email: 'marcus@northlineroofing.com',
    password: hashPassword('books2026', 'northline_salt_2'),
    role: 'Financial Manager',
    company_name: 'Northline Roofing & Exteriors',
    created_at: '2026-01-01T00:00:00Z',
  },
];

// ==========================================
// 3. PERSISTENT JSON STORE (FALLBACK)
// ==========================================
const JSON_STORE_PATH = path.join(process.cwd(), 'estimator_database.json');

const memoryStore = {
  configs: [{ ...SEED_CONFIG }],
  leads: [...SEED_LEADS],
  webhooks: [],
  sessions: [],
  users: [...DEFAULT_USERS],
};

function loadLocalStore() {
  try {
    if (fs.existsSync(JSON_STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(JSON_STORE_PATH, 'utf-8'));
      if (Array.isArray(data.configs) && data.configs.length) memoryStore.configs = data.configs;
      if (Array.isArray(data.leads)) memoryStore.leads = data.leads;
      if (Array.isArray(data.webhooks)) memoryStore.webhooks = data.webhooks;
      if (Array.isArray(data.sessions)) memoryStore.sessions = data.sessions;
      if (Array.isArray(data.users) && data.users.length) memoryStore.users = data.users;
    }
  } catch (err) {
    console.warn('Using default in-memory store:', err.message);
  }
}
loadLocalStore();

function saveLocalStore() {
  try {
    fs.writeFileSync(JSON_STORE_PATH, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving local store:', err.message);
  }
}

// ==========================================
// 4. MONGOOSE INITIALIZATION
// ==========================================
let isMongoConnected = false;
let mongoInitPromise = null;

export async function initMongo() {
  if (isMongoConnected) return { isConnected: true, mode: 'mongodb' };
  if (mongoInitPromise) return mongoInitPromise;

  mongoInitPromise = (async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return { isConnected: false, mode: 'local_json' };

    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
      isMongoConnected = true;

      // Seed if empty
      const configCount = await ConfigModel.countDocuments();
      if (configCount === 0) {
        await ConfigModel.create(SEED_CONFIG);
        for (const lead of SEED_LEADS) await LeadModel.create(lead);
        for (const user of DEFAULT_USERS) await UserModel.create(user);
      }
      return { isConnected: true, mode: 'mongodb' };
    } catch (err) {
      isMongoConnected = false;
      return { isConnected: false, mode: 'local_json' };
    }
  })();

  return mongoInitPromise;
}

export function getDatabaseStatus() {
  return {
    connected: isMongoConnected,
    mode: isMongoConnected ? 'mongodb' : 'local_json',
    storage_file: isMongoConnected ? null : 'estimator_database.json',
  };
}

// ==========================================
// 5. CRUD API METHODS
// ==========================================

// Config
export async function getMongoConfig() {
  await initMongo();
  if (isMongoConnected) {
    const doc = await ConfigModel.findOne().sort({ config_version: -1 }).lean();
    if (doc) return doc;
  }
  return memoryStore.configs.reduce((prev, curr) =>
    curr.config_version > (prev?.config_version || 0) ? curr : prev, memoryStore.configs[0]
  );
}

export async function saveMongoConfig(newConfigData) {
  await initMongo();
  const current = await getMongoConfig();
  const nextVersion = (current?.config_version || 1) + 1;
  const configDoc = {
    ...newConfigData,
    config_version: nextVersion,
    updated_at: new Date().toISOString(),
  };

  if (isMongoConnected) await ConfigModel.create(configDoc);
  memoryStore.configs.push(configDoc);
  saveLocalStore();
  return configDoc;
}

export async function getMongoConfigHistory() {
  await initMongo();
  if (isMongoConnected) {
    return await ConfigModel.find().sort({ config_version: -1 }).lean();
  }
  return [...memoryStore.configs].sort((a, b) => b.config_version - a.config_version);
}

export async function rollbackMongoConfig(targetVersion, updatedBy = 'Dale Whitmore') {
  await initMongo();
  const history = await getMongoConfigHistory();
  const target = history.find((c) => Number(c.config_version) === Number(targetVersion));
  if (!target) throw new Error(`Version v${targetVersion} not found.`);

  return await saveMongoConfig({
    ...target,
    updated_by: updatedBy,
    change_notes: `Rollback to v${targetVersion}`,
  });
}

// Leads
export async function getMongoLeads() {
  await initMongo();
  if (isMongoConnected) {
    return await LeadModel.find().sort({ captured_at: -1 }).lean();
  }
  return [...memoryStore.leads].sort((a, b) => new Date(b.captured_at) - new Date(a.captured_at));
}

export async function saveMongoLead(leadData) {
  await initMongo();
  const leadDoc = {
    ...leadData,
    id: leadData.id || `ld_${Date.now().toString(36)}`,
    captured_at: leadData.captured_at || new Date().toISOString(),
  };

  if (isMongoConnected) await LeadModel.create(leadDoc);
  memoryStore.leads.unshift(leadDoc);
  saveLocalStore();
  return leadDoc;
}

export async function deleteMongoLead(leadId) {
  await initMongo();
  if (isMongoConnected) await LeadModel.deleteOne({ id: leadId });
  memoryStore.leads = memoryStore.leads.filter((l) => l.id !== leadId);
  saveLocalStore();
  return true;
}

// Webhooks
export async function getMongoWebhooks() {
  await initMongo();
  if (isMongoConnected) return await WebhookModel.find().lean();
  return memoryStore.webhooks;
}

export async function saveMongoWebhook(webhookData) {
  await initMongo();
  const webhookDoc = {
    ...webhookData,
    id: webhookData.id || 'wh_default',
    updated_at: new Date().toISOString(),
  };

  if (isMongoConnected) {
    await WebhookModel.deleteMany({});
    if (webhookDoc.url) await WebhookModel.create(webhookDoc);
  }
  memoryStore.webhooks = webhookDoc.url ? [webhookDoc] : [];
  saveLocalStore();
  return webhookDoc;
}

export async function updateMongoWebhookStatus(id, status) {
  await initMongo();
  if (isMongoConnected) {
    await WebhookModel.updateOne({ id }, { $set: { last_status: status, last_triggered: new Date().toISOString() } });
  }
  const wh = memoryStore.webhooks.find((w) => w.id === id || w.id === 'wh_default');
  if (wh) {
    wh.last_status = status;
    wh.last_triggered = new Date().toISOString();
    saveLocalStore();
  }
}

// Sessions
export async function createMongoSession(username, name, role) {
  await initMongo();
  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  const session = {
    token,
    username,
    name,
    role,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  if (isMongoConnected) await SessionModel.create(session);
  memoryStore.sessions.push(session);
  saveLocalStore();
  return token;
}

export async function validateMongoSession(token) {
  if (!token) return null;
  await initMongo();

  if (isMongoConnected) {
    const doc = await SessionModel.findOne({ token }).lean();
    if (doc && new Date(doc.expires_at) > new Date()) return doc;
  }
  const session = memoryStore.sessions.find((s) => s.token === token);
  return session && new Date(session.expires_at) > new Date() ? session : null;
}

export async function deleteMongoSession(token) {
  await initMongo();
  if (isMongoConnected) await SessionModel.deleteOne({ token });
  memoryStore.sessions = memoryStore.sessions.filter((s) => s.token !== token);
  saveLocalStore();
}

// User Registration & Authentication
export async function createMongoUser({ username, name, email, password, role = 'Owner', company_name = '' }) {
  await initMongo();
  const cleanUsername = String(username).trim().toLowerCase();
  const cleanEmail = String(email).trim().toLowerCase();

  const historyUsers = isMongoConnected
    ? await UserModel.find({ $or: [{ username: cleanUsername }, { email: cleanEmail }] }).lean()
    : memoryStore.users.filter((u) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail);

  if (historyUsers.some((u) => u.username.toLowerCase() === cleanUsername)) {
    throw new Error(`Username "${cleanUsername}" is already taken.`);
  }
  if (historyUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
    throw new Error(`Email "${cleanEmail}" is already registered.`);
  }

  const userDoc = {
    id: 'usr_' + crypto.randomBytes(6).toString('hex'),
    username: cleanUsername,
    name: name.trim(),
    email: cleanEmail,
    password: hashPassword(password),
    role: role.trim(),
    company_name: company_name.trim(),
    created_at: new Date().toISOString(),
  };

  if (isMongoConnected) await UserModel.create(userDoc);
  memoryStore.users.push(userDoc);
  saveLocalStore();

  return {
    id: userDoc.id,
    username: userDoc.username,
    name: userDoc.name,
    email: userDoc.email,
    role: userDoc.role,
    company_name: userDoc.company_name,
  };
}

export async function findMongoUserByUsername(username) {
  if (!username) return null;
  const clean = String(username).trim().toLowerCase();
  await initMongo();
  const user = isMongoConnected
    ? await UserModel.findOne({ username: clean }).lean()
    : memoryStore.users.find((u) => u.username.toLowerCase() === clean);
  return user || null;
}

export async function findMongoUserByEmail(email) {
  if (!email) return null;
  const clean = String(email).trim().toLowerCase();
  await initMongo();
  const user = isMongoConnected
    ? await UserModel.findOne({ email: clean }).lean()
    : memoryStore.users.find((u) => u.email.toLowerCase() === clean);
  return user || null;
}

export async function validateUserCredentials(username, plainPassword) {
  if (!username || !plainPassword) return null;
  const clean = String(username).trim().toLowerCase();
  await initMongo();

  const user = isMongoConnected
    ? await UserModel.findOne({ username: clean }).lean()
    : memoryStore.users.find((u) => u.username.toLowerCase() === clean);

  if (!user || !verifyPassword(plainPassword, user.password)) return null;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    company_name: user.company_name,
  };
}
