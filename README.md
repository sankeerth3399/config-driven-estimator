# Northline Roofing — Config-Driven Estimator & Owner Panel
> Take-Home Build for Wantace · SDE Intern Assessment

A production-ready, config-driven cost estimator for homeowners paired with a password-protected owner portal for pricing administration and lead management.

---

## 🌟 Key Architecture & Highlights

1. **Strict Config-Driven Front-End**:
   - The public estimator contains **zero hardcoded questions, options, units, or rates**.
   - All questions, steps, and options are loaded dynamically from `/api/public-config`.
   - Modifying a price or toggling a question off in the Owner Panel updates the live homeowner tool immediately without redeploying.

2. **Server-Authoritative Pricing & Calculation**:
   - Pricing formulas and rates are kept strictly server-side.
   - Front-end visitors cannot inspect raw rates, reverse-engineer margins, or tamper with quotes.

3. **Protected Owner & Bookkeeper Panel**:
   - Protected with token-based authentication session management.
   - Built specifically for non-technical users (Dale the owner and Marcus the bookkeeper).
   - Live Question & Modifier Editor (rates, multipliers, tear-off costs, waste factor, permit fees, range spread).
   - Lead Tracking with search, detail modal, and CSV export.
   - Config Version History with one-click Rollback.
   - Interactive Calculation Playground for testing quotes before publishing.
   - Outbound Lead Webhook integration with live test pinging.

4. **MongoDB Persistence with Mongoose**:
   - Built on MongoDB via Mongoose with structured schemas for configurations, version history, captured leads, sessions, and webhooks.
   - Includes automatic embedded storage fallback for seamless execution in isolated preview environments and full support for `MONGODB_URI` / MongoDB Atlas in production.

---

## 🔐 Test Login Credentials

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Owner (Dale)** | `dale` | `northline2026` | Full administrative & pricing access |
| **Bookkeeper (Marcus)** | `marcus` | `books2026` | Financial review & calculation sandbox |
| **Administrator** | `admin` | `password123` | System admin access |

*(Quick-fill buttons are provided on the login page for evaluator convenience)*

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18+)
- npm or bun

### Setup Steps
```bash
# 1. Clone the repository
git clone <repo-url>
cd <repo-folder>

# 2. Install dependencies
npm install

# 3. Run the automated calculation test suite
npm test

# 4. Start development server (both Express API & React Vite on Port 3000)
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## 🛠️ Environment Variables
Defined in `.env.example`:
- `GEMINI_API_KEY`: Server-side API key configuration
- `APP_URL`: Hosted application URL

---

## 🧪 Running Tests
To verify the pricing engine calculation logic across all edge cases:
```bash
npm test
```
