# AI Usage & Development Log

## 1. AI Tools Used
* **Antigravity Coding Agent (powered by Gemini 3.7 Flash)**: Used for rapid scaffolding of modular TypeScript files, test suite generation, and responsive Tailwind UI styling.

## 2. What AI Was Used For
* **Scaffolding**: Generating initial TypeScript interface definitions and SQL table schemas.
* **Component Layouts**: Accelerating repetitive UI patterns like data tables, badges, and responsive form steppers.
* **Test Suite Synthesis**: Drafting calculation boundary condition test cases.

## 3. Specific Instance Where AI Output Was Deficient & How It Was Corrected
* **Problem**: Initially, the AI generated a client-side calculation function inside the React form component and embedded the unit rates directly into the form option definitions.
* **Correction**: This violated the hard requirement and security constraint that visitors must not be able to read pricing logic or tamper with results from the browser. We immediately refactored the architecture:
  1. Created a dedicated backend calculation engine in `/server/calculator.ts`.
  2. Implemented a `/api/public-config` endpoint that strips all sensitive pricing metadata before serving the question structure to the browser.
  3. Ensured that quote generation and lead persistence happen exclusively server-side via `POST /api/leads`.

## 4. Code Written & Substantially Reworked by Hand
* **Config Engine & Schema Handling**: The dynamic question rendering engine in `src/components/DynamicEstimator.tsx` was meticulously constructed to support any arbitrary question type, validation rule, unit badge, and custom options without hardcoded keys.
* **Seed Data Resilience**: Added defensive normalization logic for string numbers (e.g. `"1.12"`), dynamic multiplier chains, and legacy lead answer rendering.
* **Owner Panel Experience**: Designed the owner management experience with Marcus (the non-technical bookkeeper) in mind, including an interactive Calculation Playground and immediate rollbacks.
