import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  getConfig,
  saveConfig,
  getConfigHistory,
  rollbackConfig,
  getLeads,
  saveLead,
  deleteLead,
  getWebhooks,
  saveWebhook,
  updateWebhookStatus,
  createSession,
  validateSession,
  deleteSession,
  createUser,
  validateCredentials,
  getDatabaseStatus,
  initMongo,
} from './server/db.js';
import { calculateEstimate } from './server/calculator.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper auth middleware
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const user = await validateSession(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }

  req.user = user;
  next();
}

// ---------------- API ROUTES ----------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database status
app.get('/api/db-status', (req, res) => {
  res.json(getDatabaseStatus());
});

// 1. Fetch Complete Estimator Configuration (Questions, Rates, Modifiers)
app.get(['/api/config', '/api/estimator/config', '/api/estimator-config'], async (req, res) => {
  try {
    const config = await getConfig();
    if (!config) {
      return res.status(404).json({ error: 'Estimator configuration not found' });
    }
    res.json({
      success: true,
      config_version: config.config_version,
      business: config.business,
      questions: config.questions,
      modifiers: config.modifiers,
      updated_at: config.updated_at,
      updated_by: config.updated_by,
      change_notes: config.change_notes,
    });
  } catch (error) {
    console.error('Error fetching estimator configuration:', error);
    res.status(500).json({ error: 'Failed to retrieve estimator configuration from database' });
  }
});

// 2. Public Estimator Config (Questions, Options, Business Info - Rates stripped)
app.get('/api/public-config', async (req, res) => {
  try {
    const fullConfig = await getConfig();
    const publicQuestions = fullConfig.questions
      .filter((q) => q.active)
      .map((q) => ({
        key: q.key,
        label: q.label,
        type: q.type,
        unit: q.unit,
        required: q.required,
        min: q.min,
        max: q.max,
        active: q.active,
        description: q.description,
        options: q.options?.map((opt) => ({
          value: opt.value,
          label: opt.label,
        })),
      }));

    const publicConfig = {
      config_version: fullConfig.config_version,
      business: fullConfig.business,
      questions: publicQuestions,
    };

    res.json(publicConfig);
  } catch (error) {
    console.error('Error fetching public config:', error);
    res.status(500).json({ error: 'Failed to load estimator configuration' });
  }
});

// 2. Submit Lead & Calculate Quote
app.post('/api/leads', async (req, res) => {
  try {
    const { name, phone, email, notes, answers } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }
    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      return res.status(400).json({ error: 'Please enter your phone number.' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Missing estimator question answers.' });
    }

    const currentConfig = await getConfig();
    const result = calculateEstimate(answers, currentConfig);

    if (!result.success || result.estimate_low === undefined || result.estimate_high === undefined) {
      return res.status(400).json({
        error: 'Validation failed for answers',
        details: result.errors || ['Calculation failed'],
      });
    }

    const leadId = 'ld_' + Math.floor(1000 + Math.random() * 9000);
    const now = new Date().toISOString();

    const newLead = {
      id: leadId,
      captured_at: now,
      config_version: currentConfig.config_version,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      notes: notes ? String(notes).trim() : undefined,
      answers,
      estimate_low: result.estimate_low,
      estimate_high: result.estimate_high,
      breakdown: result.breakdown,
    };

    await saveLead(newLead);

    // Asynchronously trigger any active webhooks
    (async () => {
      try {
        const webhooks = await getWebhooks();
        for (const wh of webhooks) {
          if (!wh.active || !wh.url) continue;
          try {
            const payload = JSON.stringify({
              event: 'lead.created',
              lead: newLead,
              timestamp: now,
            });
            const headers = {
              'Content-Type': 'application/json',
              'User-Agent': 'Wantace-Estimator-Engine/1.0',
            };
            if (wh.secret) {
              const signature = crypto
                .createHmac('sha256', wh.secret)
                .update(payload)
                .digest('hex');
              headers['X-Signature-SHA256'] = signature;
            }
            const fetchRes = await fetch(wh.url, {
              method: 'POST',
              headers,
              body: payload,
            });
            await updateWebhookStatus(wh.id, fetchRes.status);
          } catch (whErr) {
            console.warn(`Webhook ${wh.url} delivery failed:`, whErr);
            await updateWebhookStatus(wh.id, 500);
          }
        }
      } catch (err) {
        console.error('Webhook execution error:', err);
      }
    })();

    res.json({
      success: true,
      lead_id: leadId,
      estimate_low: result.estimate_low,
      estimate_high: result.estimate_high,
      currency: currentConfig.business.currency || 'USD',
      business_name: currentConfig.business.name,
      answers,
    });
  } catch (error) {
    console.error('Error submitting lead:', error);
    res.status(500).json({ error: 'Internal server error processing lead' });
  }
});

// 3. Auth Endpoints
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, username, email, password, role, company_name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    const cleanUser = username.trim().toLowerCase();
    if (!/^[a-z0-9_.-]+$/.test(cleanUser)) {
      return res.status(400).json({
        error: 'Username can only contain alphanumeric characters, underscores, hyphens, and dots.',
      });
    }

    if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const newUser = await createUser({
      name: name.trim(),
      username: cleanUser,
      email: email.trim().toLowerCase(),
      password,
      role: role ? String(role).trim() : 'Owner',
      company_name: company_name ? String(company_name).trim() : '',
    });

    const token = await createSession(newUser.username, newUser.name, newUser.role);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        company_name: newUser.company_name,
      },
    });
  } catch (error) {
    console.error('Error during owner signup:', error);
    res.status(400).json({ error: error.message || 'Failed to create owner account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Please provide both username and password.' });
    }

    const cleanUser = String(username).trim().toLowerCase();
    const user = await validateCredentials(cleanUser, String(password));

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = await createSession(user.username, user.name, user.role);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        company_name: user.company_name,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    await deleteSession(token);
  }
  res.json({ success: true });
});

// 4. Protected Owner Routes
app.get('/api/owner/config', requireAuth, async (req, res) => {
  try {
    const config = await getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load owner configuration' });
  }
});

app.put('/api/owner/config', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { config, notes } = req.body;

    if (!config || !config.questions || !config.modifiers) {
      return res.status(400).json({ error: 'Invalid configuration format' });
    }

    const saved = await saveConfig(
      config,
      user?.name || 'Owner',
      notes || 'Updated pricing & question configuration'
    );
    res.json({ success: true, config: saved });
  } catch (error) {
    console.error('Failed to update config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

app.get('/api/owner/config/history', requireAuth, async (req, res) => {
  try {
    const history = await getConfigHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load configuration history' });
  }
});

app.post('/api/owner/config/rollback/:version', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const version = parseInt(req.params.version, 10);
    if (isNaN(version)) {
      return res.status(400).json({ error: 'Invalid version number' });
    }

    const restored = await rollbackConfig(version, user?.name || 'Owner');
    res.json({ success: true, config: restored });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Rollback failed' });
  }
});

app.get('/api/owner/leads', requireAuth, async (req, res) => {
  try {
    const search = req.query.search ? String(req.query.search) : undefined;
    const version = req.query.version ? parseInt(String(req.query.version), 10) : undefined;
    const leads = await getLeads(search, version);
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve leads' });
  }
});

app.delete('/api/owner/leads/:id', requireAuth, async (req, res) => {
  try {
    await deleteLead(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

app.get('/api/owner/leads/export-csv', requireAuth, async (req, res) => {
  try {
    const leads = await getLeads();
    const headers = [
      'Lead ID',
      'Captured Date (UTC)',
      'Config Version',
      'Customer Name',
      'Phone',
      'Email',
      'Notes',
      'Estimate Low (USD)',
      'Estimate High (USD)',
      'Answers (JSON)',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = leads.map((l) => [
      escapeCsv(l.id),
      escapeCsv(l.captured_at),
      escapeCsv(l.config_version),
      escapeCsv(l.name),
      escapeCsv(l.phone),
      escapeCsv(l.email),
      escapeCsv(l.notes || ''),
      escapeCsv(l.estimate_low),
      escapeCsv(l.estimate_high),
      escapeCsv(JSON.stringify(l.answers)),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=northline_leads_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Test Calculator endpoint (playground for Marcus & Dale)
app.post('/api/owner/test-calc', requireAuth, async (req, res) => {
  try {
    const { answers, config } = req.body;
    const activeConfig = config || (await getConfig());
    const result = calculateEstimate(answers, activeConfig);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to test calculation' });
  }
});

// Webhook management
app.get('/api/owner/webhooks', requireAuth, async (req, res) => {
  try {
    const webhooks = await getWebhooks();
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load webhooks' });
  }
});

app.post('/api/owner/webhooks', requireAuth, async (req, res) => {
  try {
    const { url, secret, active } = req.body;
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({ error: 'Please enter a valid HTTP/HTTPS webhook URL' });
    }
    const saved = await saveWebhook(url.trim(), secret?.trim() || '', active ?? true);
    res.json({ success: true, webhook: saved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save webhook' });
  }
});

app.post('/api/owner/webhooks/test', requireAuth, async (req, res) => {
  try {
    const { url, secret } = req.body;
    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const mockPayload = JSON.stringify({
      event: 'lead.test_ping',
      lead: {
        id: 'ld_test_9999',
        captured_at: new Date().toISOString(),
        config_version: 3,
        name: 'Test Customer',
        phone: '+1-614-555-0199',
        email: 'test@example.com',
        answers: {
          roof_area: 2000,
          material: 'asphalt_arch',
          pitch: 'medium',
          layers: '1',
          stories: '2',
        },
        estimate_low: 16570,
        estimate_high: 21090,
      },
    });

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Wantace-Estimator-Engine/1.0',
    };
    if (secret) {
      headers['X-Signature-SHA256'] = crypto
        .createHmac('sha256', secret)
        .update(mockPayload)
        .digest('hex');
    }

    const start = Date.now();
    const fetchRes = await fetch(url, {
      method: 'POST',
      headers,
      body: mockPayload,
    });
    const duration = Date.now() - start;

    res.json({
      success: true,
      status: fetchRes.status,
      statusText: fetchRes.statusText,
      duration_ms: duration,
    });
  } catch (error) {
    res.status(500).json({ error: `Webhook ping failed: ${error.message}` });
  }
});

// ---------------- VITE & FRONTEND SERVING ----------------

async function startServer() {
  await initMongo();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Wantace Estimator & Owner Server running on http://localhost:${PORT}`);
  });
}

startServer();
