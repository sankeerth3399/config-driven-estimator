import mongoose, { Schema } from 'mongoose';

// ========================================================
// 1. ESTIMATOR CONFIGURATION SCHEMAS (QUESTIONS, RATES, MODIFIERS)
// ========================================================

export const OptionSchema = new Schema(
  {
    value: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    rate_per_sqft: { type: Number, min: 0, default: undefined },
    multiplier: { type: Number, min: 0, default: undefined },
    tear_off_per_sqft: { type: Number, min: 0, default: undefined },
  },
  { _id: false }
);

export const QuestionSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['number', 'select', 'radio', 'checkbox', 'text'],
      default: 'select',
    },
    unit: { type: String, trim: true, default: '' },
    required: { type: Boolean, default: true },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
    active: { type: Boolean, default: true },
    description: { type: String, default: '' },
    options: [OptionSchema],
  },
  { _id: false }
);

export const ModifiersSchema = new Schema(
  {
    waste_factor: { type: Number, required: true, default: 0.1, min: 0, max: 1 },
    permit_flat_fee: { type: Number, required: true, default: 350, min: 0 },
    range_spread_pct: { type: Number, required: true, default: 12, min: 0, max: 100 },
  },
  { _id: false }
);

export const BusinessSchema = new Schema(
  {
    name: { type: String, required: true, default: 'Northline Roofing & Exteriors' },
    region: { type: String, default: 'Columbus, OH' },
    currency: { type: String, default: 'USD' },
  },
  { _id: false }
);

export const ConfigSchema = new Schema(
  {
    config_version: { type: Number, required: true, index: true },
    business: { type: BusinessSchema, default: () => ({}) },
    questions: { type: [QuestionSchema], default: [] },
    modifiers: { type: ModifiersSchema, default: () => ({}) },
    updated_at: { type: Date, default: Date.now },
    updated_by: { type: String, default: 'Dale Whitmore' },
    change_notes: { type: String, default: 'Updated pricing configuration' },
  },
  { collection: 'roofing_configs', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// ========================================================
// 2. USER AUTHENTICATION & SESSIONS SCHEMAS
// ========================================================

export const UserSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['Owner', 'Financial Manager', 'Estimator', 'Admin'],
      default: 'Owner',
    },
    company_name: { type: String, trim: true, default: '' },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'users' }
);

export const SessionSchema = new Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, lowercase: true, index: true },
    name: { type: String, required: true },
    role: { type: String, default: 'Owner' },
    created_at: { type: Date, default: Date.now },
    expires_at: { type: Date, required: true, index: { expires: 0 } },
  },
  { collection: 'sessions' }
);

// ========================================================
// 3. CAPTURED LEADS & WEBHOOK INTEGRATION SCHEMAS
// ========================================================

export const LeadSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    captured_at: { type: Date, default: Date.now, index: true },
    config_version: { type: Number, required: true, default: 1 },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    notes: { type: String, trim: true },
    answers: { type: Schema.Types.Mixed, required: true },
    estimate_low: { type: Number, required: true },
    estimate_high: { type: Number, required: true },
    breakdown: { type: Schema.Types.Mixed },
  },
  { collection: 'leads', timestamps: { createdAt: 'captured_at' } }
);

export const WebhookSchema = new Schema(
  {
    id: { type: String, required: true, default: 'wh_default' },
    url: { type: String, required: true, trim: true },
    secret: { type: String, default: '' },
    active: { type: Boolean, default: true },
    last_status: { type: Number },
    last_triggered: { type: Date },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'webhooks' }
);

// Mongoose Model Instantiations
export const ConfigModel = mongoose.models.Config || mongoose.model('Config', ConfigSchema);
export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const SessionModel = mongoose.models.Session || mongoose.model('Session', SessionSchema);
export const LeadModel = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
export const WebhookModel = mongoose.models.Webhook || mongoose.model('Webhook', WebhookSchema);
