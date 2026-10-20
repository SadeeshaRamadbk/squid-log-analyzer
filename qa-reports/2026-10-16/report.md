# Web QA Test Report

**Date:** 2026-10-16  
**Environment:** http://localhost:3000 (Local Next.js Development Server with SQLite WAL Telemetry Storage)  
**Result:** **PASS**

---

## Tested Flows & Viewports

### Flows Tested
1. **Authentication & Access Control Flow (`/login`)**
   - **Happy Path:** Valid administrator credentials (`admin` / `ramam@123`) -> Successfully authenticated, session established, redirected to `/`.
   - **Bad Input (Empty Fields):** Submitting empty username/password -> HTML5 required field validation prevented submission.
   - **Bad Input (Invalid Credentials):** Submitted invalid username (`nonexistent_user`) & password (`wrongpassword`) -> API returned HTTP 401 with on-screen error banner: *"Invalid username or password"*.
   - **Bad Input (Boundary / Long String):** Inputted 200+ character string into username field -> Handled safely without overflow, crash, or 500 error.
   - **Navigation & Direct URL Access:** Direct access to protected routes (`/`, `/settings`) redirected to `/login?from=...` when unauthenticated.

2. **Squid Proxy Dashboard Flow (`/`)**
   - Metric cards loaded accurately from SQLite WAL storage: Total Bandwidth (9.58 GB), Total Requests (110,474), Failed Requests & Error Rates (48.1%), SQLite Storage (140.19 MB).
   - Date range presets tested: "Last 30 Min", "Last 1 Hour", "Today", "Last 7 Days", "Last 30 Days", "All Recorded".
   - Client IP filter dropdown verified with active workstation mappings.
   - Squid Live Feed modal (`SquidLiveFeedModal`) launched, controls inspected (streaming interval, pause, method filter, result filter, CSV export), and closed via Esc and close button.

3. **pfSense NetFlow Flows (`/softflowd` / Tab View)**
   - Switching to pfSense (Flows) tab: Protocols (TCP, UDP, ICMP, GRE, ESP), Ports, and flow tables rendered.
   - Collector status indicators reflected active UDP 2055 / TCP 3128 listeners.

4. **Settings & User Management Flow (`/settings`)**
   - User Accounts & Roles tab: Rendered existing accounts (`admin` [ADMIN], `viewer` [VIEWER]). Verified delete self-protection button is disabled for active user.
   - Bad Input on User Creation: Form validated password minimum length (<6 chars) and showed validation message: *"Password must be at least 6 characters"*.
   - Change My Password tab: Validated input fields (current password, new password, confirm password).
   - Data Retention & Storage tab: Loaded storage footprint metrics, Squid log retention duration input (60 days), and NetFlow flow retention input (7 days).

5. **Navigation & Session Resilience**
   - Browser Back Button: Successfully navigated back from `/settings` to `/`.
   - Page Refresh Mid-flow: Full page reload on `/` maintained authenticated session state without redirection or data loss.

6. **Viewports Tested**
   - **Desktop (1280px × 800px):** Verified full multi-panel dashboard, filter bar, metric cards, data tables, and modals.
   - **Mobile (390px × 844px):** Emulated standard mobile device (deviceScaleFactor: 3, touch enabled). Verified stacked card layout, collapsible header navigation, and absence of horizontal page overflow (`scrollWidth === innerWidth`).

---

## Test Results Summary

### Passed
- [x] Login authentication with valid test credentials.
- [x] Login error handling for empty, invalid, and excessively long inputs.
- [x] Unauthenticated redirect to `/login` for protected routes.
- [x] Telemetry dashboard loading with SQLite WAL database queries.
- [x] Squid Live Stream modal interaction and filtering.
- [x] Tab switching between Squid (Proxy), pfSense (Flows), and Split View.
- [x] Collector Health Diagnostics popover and IP Aliases modal.
- [x] Settings tabs (User Accounts, Change Password, Retention & Storage).
- [x] User creation client-side validation rules.
- [x] Browser back-button navigation and page reload mid-flow.
- [x] Desktop (1280px) and Mobile (390px) responsive layouts.
- [x] Zero JavaScript runtime console errors (`console.error = 0`).
- [x] Zero unexpected HTTP 4xx/5xx network failures across internal APIs (`/api/auth/me`, `/api/collector/health`, `/api/retention`, `/api/alerts`, `/api/stats`, `/api/requests`, `/api/blocked`, `/api/netflow/stats`, `/api/netflow/flows`).

### Failed
*None.* All primary flows, bad input handling, navigation states, and responsive viewports passed verification.

---

## Observations & Minor Notes (Non-blocking)
1. **Date Picker `maxDate` Bound:**
   - **Observation:** `DateRangeSelector` sets `max={maxDate}` based on the latest ingested record in SQLite. When the collector is idle or testing on dates past the database timestamp, selecting "Today" can cause native HTML5 input validation to briefly flag the date field as exceeding max range until new logs are ingested.
   - **Suspected File:** `src/components/common/DateRangeSelector.tsx` and `src/components/dashboard/DashboardFilters.tsx`.
2. **Form Accessibility Lints:**
   - **Observation:** Browser logged accessibility warnings for input fields lacking explicit `id` attributes or matching `<label for="...">` associations on the login and settings forms.
   - **Suspected Files:** `src/app/login/page.tsx`, `src/app/settings/page.tsx`.

---

## Artifacts & Evidence
The following screenshots were captured during the QA session and saved to `qa-reports/2026-10-16/`:
- **Desktop Dashboard:** `qa-reports/2026-10-16/dashboard-desktop.png`
- **Squid Live Feed Modal:** `qa-reports/2026-10-16/squid-live-feed-modal.png`
- **pfSense Flows View:** `qa-reports/2026-10-16/pfsense-desktop.png`
- **Settings Page (Desktop):** `qa-reports/2026-10-16/settings-desktop.png`
- **Split View (NOC Mode):** `qa-reports/2026-10-16/split-view-desktop.png`
- **Collector Health Modal:** `qa-reports/2026-10-16/collector-health-modal.png`
- **IP Aliases Modal:** `qa-reports/2026-10-16/ip-aliases-modal.png`
- **Mobile Dashboard (390px):** `qa-reports/2026-10-16/dashboard-mobile-390.png`
- **Mobile Settings (390px):** `qa-reports/2026-10-16/settings-mobile-390.png`

---

## Not Tested
- **Live User Deletion & Active Role Modification:** Skipped executing real deletion or role demotion of existing accounts (`admin`, `viewer`) in SQLite database to preserve test accounts and test data integrity according to QA guidelines (*"Never delete data or change settings outside the project"*).
