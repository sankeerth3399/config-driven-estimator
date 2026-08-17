# Architectural & Business Decisions

## 1. Stack Architecture: React + Node.js + MongoDB
* **Frontend (React 19 + TypeScript + Tailwind CSS)**: Modern, single-page application with responsive layout, instant form validation, animated price range displays, and accessible interactive controls.
* **Backend (Node.js + Express + TypeScript)**: Server-authoritative architecture hosting the dynamic configuration endpoints, proprietary calculation engine, session authentication, lead management, and outbound webhook dispatchers.
* **Database (MongoDB via Mongoose)**: Schema-backed persistence using Mongoose models for application configurations, version audit history, captured leads with dynamic answer payloads, webhook endpoints, and authenticated sessions. Includes an automatic embedded store fallback when running in standalone container environments without an external MongoDB server URI.

## 2. Assumptions Made Where the Brief Was Silent & Rationale
* **Dynamic Form Architecture (Strict Zero-Hardcoding Rule)**: The front-end renders all inputs, options, labels, units, and ranges dynamically from the `/api/public-config` endpoint. If Dale toggles a question off or adds a new material, the UI immediately updates without requiring code changes or redeployments.
* **Pricing Obfuscation**: The public endpoint explicitly strips out internal unit costs (`rate_per_sqft`), tear-off rates (`tear_off_per_sqft`), and slope/story multipliers. Calculation happens solely on the Express server (`POST /api/leads` and `POST /api/owner/test-calc`) so competitors or users cannot scrape Dale's proprietary margins or reverse-engineer formulas.
* **Lead Persistence**: Even when Dale modifies or drops questions in future configuration versions (e.g., historical version 1 contained `chimney_count` and `gutter_replace`), all leads preserve their historical answers and the exact `config_version` used at quote generation time.
* **Non-Technical Bookkeeper Accessibility**: Marcus is not technical. The owner panel features intuitive controls (steppers, badges, toggles, inline currency symbols, live validation, and a test calculation sandbox) rather than raw JSON editors.
* **Authentication**: Token-based session authentication with predefined roles for Dale (Owner) and Marcus (Bookkeeper) with credential presets for instant evaluation.

---

## 2. Calculation Formula in Plain Language
The roofing estimate formula represents standard residential contractor estimation:

1. **Effective Surface Area (with Waste Factor)**:
   $$\text{Effective Area} = \text{Roof Area} \times (1 + \text{Waste Factor})$$
   *(e.g., $2,000\text{ sq ft} \times (1 + 0.10) = 2,200\text{ sq ft}$)*

2. **Base Material Cost**:
   $$\text{Material Cost} = \text{Effective Area} \times \text{Material Rate per sq ft}$$

3. **Tear-Off / Demolition Cost**:
   $$\text{Tear-Off Cost} = \text{Roof Area} \times \text{Tear-Off Rate per sq ft}$$
   *(Calculated on gross surface area for existing layers)*

4. **Multipliers (Pitch & Stories)**:
   $$\text{Combined Multiplier} = \text{Pitch Multiplier} \times \text{Stories Multiplier} \times \prod \text{Dynamic Question Multipliers}$$

5. **Subtotal**:
   $$\text{Subtotal} = (\text{Material Cost} + \text{Tear-Off Cost}) \times \text{Combined Multiplier}$$

6. **Base Total (including Local Permits/Fees)**:
   $$\text{Base Total} = \text{Subtotal} + \text{Permit Flat Fee}$$

7. **Estimate Range Spread**:
   $$\text{Estimate Low} = \text{round}_{\$10}\left(\text{Base Total} \times \left(1 - \frac{\text{Range Spread \%}}{100}\right)\right)$$
   $$\text{Estimate High} = \text{round}_{\$10}\left(\text{Base Total} \times \left(1 + \frac{\text{Range Spread \%}}{100}\right)\right)$$

---

## 3. What Was Deliberately Not Built & Why
* **Complex Multi-Tenant SaaS Hierarchy**: The client is a single roofing company (Northline Roofing & Exteriors). Adding multi-tenant account provisioning would introduce unnecessary complexity and distract from rock-solid reliability for Dale and Marcus.
* **Heavyweight Third-Party OAuth Dependency**: Avoided requiring Google/GitHub OAuth logins for Dale and Marcus to ensure zero third-party setup friction during review and offline development.
* **WYSIWYG Drag-and-Drop Page Builder**: Dale asked to edit prices and question toggles, not redesign page layouts. A focused, high-clarity settings matrix is far more reliable and easier for Marcus to use without breaking UI styling.

---

## 4. Questionable Seed Data Quirks & How We Handled Them
1. **Type Mismatch in Seed Multipliers (`multiplier: "1.12"`)**: In the pitch question options, `"1.12"` was provided as a string while other multipliers were numbers. We implemented strict, defensive parsing (`parseFloat(String(val))`) with fallback to `1.0` to ensure no `NaN` contamination occurs.
2. **Schema Drift in Historical Seed Leads**: Lead `ld_0917` from `config_version: 1` had fields (`slate_natural`, `chimney_count`, `gutter_replace`) that no longer exist in version 3. Our lead breakdown component was built to dynamically render *any* key-value answer pair without crashing on legacy schema differences.
3. **Seed Lead Estimate Divergence**: As noted in the brief, the seed lead estimates are historical. Our formula is explicitly documented, deterministic, fully tested, and configurable through modifiers in the owner panel.

---

## 5. Questions We Would Ask Dale Before Starting the Real Build
1. **Material-Specific Waste Rates**: Do complex materials like Standing Seam Metal or Cedar Shake require higher waste factors (e.g., 15–20%) compared to standard 3-tab shingles (10%)?
2. **Steep Slope Safety Charges**: Are there fixed steep-slope setup surcharges beyond the multiplier (e.g., scaffolding fees for 3+ stories or >8/12 pitch)?
3. **Notification Channels**: Would you prefer SMS alerts via Twilio in addition to outbound webhooks/email notifications when a high-value lead arrives?
4. **CRM Integration**: Which CRM or job management tool (e.g., JobNimbus, AccuLynx, HubSpot) does Marcus use to manage customer quotes?

---

## 6. What We Would Do Next With Another Week
* **Address Autocomplete & Aerial Satellite Measurement**: Integrate Google Maps / Solar API or rooftop imagery to auto-estimate roof square footage from the homeowner's street address.
* **Automated PDF Quote Generator**: Instant branded PDF proposal with Dale's company logo, itemized scope, and one-click "Accept Quote & Schedule Consultation" link.
* **CRM Bidirectional Sync**: Direct webhook integrations and two-way sync with JobNimbus, Zapier, and QuickBooks Online.
* **A/B Testing Framework**: Enable Dale to test different headline copy, question orders, and range spreads to measure lead conversion rate improvements.
