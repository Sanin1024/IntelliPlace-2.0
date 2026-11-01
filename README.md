# IntelliPlace

> **Personalized Placement Training and Career Readiness Platform**  
> A full-stack web application designed for higher education institutions to monitor student career readiness, administer structured placement mock tests, and deliver data-driven aptitude and technical preparation.

---

## 1. System Overview

IntelliPlace is an enterprise-grade placement preparation and analytics portal designed for engineering colleges. It bridges the gap between students, technical trainers, and the institutional Training & Placement Officer (TPO) by establishing a transparent, unified source of truth for campus placement readiness.

### Key Capabilities
- **Institutional Hierarchy**: Organizes students by Academic Branch and Graduation Batch with granular activation/deactivation controls.
- **Unified Readiness Engine**: Computes deterministic, three-factor readiness scores ($[0, 100]$) classifying students into strict readiness bands.
- **Mock Examination Portal**: Server-enforced timed tests with windowed scheduling, batch isolation, real-time keyboard navigation, and immediate scoring.
- **Adaptive Practice & Diagnostics**: Topic-wise practice sessions identifying weak areas (<50% accuracy) and generating targeted study recommendations.
- **Placement Officer Intelligence**: Cohort analytics, interactive drive publishing, at-risk student intervention lists, and CSV export shielded against formula injection.
- **Multi-Role RBAC**: Strict separation of concerns across Administrator, Placement Officer, Trainer, and Student personas.

---

## 2. Architecture

```mermaid
flowchart TB
    subgraph Client["Frontend Client (React 19 + Vite)"]
        UI["Tailored Role Portals\n(Admin, PO, Trainer, Student)"]
        Axios["Axios API Client\n(Bearer Interceptor & Global Error Toast)"]
        A11y["Accessible Components\n(WCAG Compliant, 375px+ Mobile Responsive)"]
    end

    subgraph Gateway["API Server (Express 5 + TypeScript)"]
        Helmet["Helmet & CORS Security"]
        RateLimit["Multi-Tier Rate Limiters\n(Auth, Submits, Global API)"]
        AuthMid["JWT Authentication & RBAC Middleware"]
        OwnershipMid["Trainer & Student Ownership Guards"]
        Validation["Zod Schema Validation Middleware"]
    end

    subgraph Services["Core Application Services"]
        ReadinessSvc["services/readiness.ts\n(Unified 60/30/10 Readiness Formula)"]
        AnalyticsSvc["Cohort Analytics & Weak Topic Detector"]
        ExportSvc["CSV Exporter\n(Neutralizes Formula Injection)"]
        RunnerService["LocalProcessRunner\n(Semaphore, 2s Timeout, 64KB Max)"]
    end

    subgraph DataTier["Data Tier"]
        Prisma["Prisma 7 ORM (@prisma/adapter-pg)"]
        Postgres[(PostgreSQL 17 Database)]
        Storage[("Secure File Storage\n(/uploads - No Direct Public Execution)")]
    end

    UI --> Axios
    Axios --> Gateway
    Gateway --> Helmet --> RateLimit --> AuthMid --> OwnershipMid --> Validation
    Validation --> Services
    Services --> Prisma
    Prisma --> Postgres
    Services --> Storage
    Services -.->|"When CODE_RUNNER_ENABLED=true"| RunnerService
```

---

## 3. Technology Stack

| Layer | Technologies | Rationale / Key Libraries |
|---|---|---|
| **Frontend Framework** | React 19, TypeScript 5.9 | Concurrent rendering, typed state management |
| **Build & Tooling** | Vite 7, TypeScript (`tsc -b`) | Sub-second HMR, optimized production chunks |
| **Routing & Navigation** | React Router v7 | Nested route configurations, layout wrappers |
| **Data Visualization** | Recharts 3.10 | Responsive SVG charting for analytics & score trends |
| **Iconography & Styling** | Lucide React, Vanilla CSS | Lightweight icons, responsive design system, zero bloated CSS runtime |
| **E2E & Accessibility** | Playwright, `@axe-core/playwright` | Automated browser regressions & WCAG 2.1 compliance |
| **Backend Runtime** | Node.js (v20+), Express 5 | High-throughput asynchronous REST API |
| **Database & ORM** | PostgreSQL 17, Prisma 7 | Strict relational integrity, `@prisma/adapter-pg` driver adapter |
| **Authentication & Auth** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` | Stateless authentication with 64-byte rotating secrets, 10-round salt hashing |
| **Validation & Security** | Zod 4, Helmet 8, `express-rate-limit` 8 | Request contract validation, secure HTTP headers, abusive request throttling |

---

## 4. Environment Variables

### Backend (`backend/.env`)

| Variable | Type | Default / Example | Purpose / Constraints |
|---|---|---|---|
| `DATABASE_URL` | String | `postgresql://intelliplace:intelliplace_dev_only@localhost:5433/intelliplace` | PostgreSQL connection string with credentials |
| `PORT` | Number | `4000` | Port for the Express application server |
| `NODE_ENV` | String | `development` | Runtime mode: `development`, `production`, or `test` |
| `CORS_ORIGIN` | String | `http://localhost:5173` | Allowed origin for Cross-Origin Resource Sharing |
| `JWT_SECRET` | Hex String | *(64-byte cryptographically secure random string)* | Secret key for signing and verifying authentication tokens |
| `JWT_EXPIRES_IN` | String | `7d` | Token validity duration |
| `CODE_RUNNER_ENABLED` | Boolean | `false` | Gate for local process code execution (keep `false` unless testing) |
| `RUNNER_MAX_CONCURRENCY` | Number | `2` | Maximum concurrent compilation/execution worker processes |
| `RUNNER_TIMEOUT_MS` | Number | `2000` | Execution timeout in milliseconds before killing process |
| `RUNNER_MAX_SOURCE_BYTES` | Number | `65536` | Maximum accepted submission payload size (64 KB) |

### Frontend (`frontend/.env`)

| Variable | Type | Default / Example | Purpose |
|---|---|---|---|
| `VITE_API_URL` | String | `http://localhost:4000/api` | Base URL for REST API requests |

---

## 5. npm Scripts Reference

Run from repository root or using `--workspace <backend|frontend>`.

| Script | Working Directory | Command / Action |
|---|---|---|
| `npm run dev:backend` | Root | Starts backend server in watch mode via `tsx` (`http://localhost:4000`) |
| `npm run dev:frontend` | Root | Starts frontend Vite dev server (`http://localhost:5173`) |
| `npm run build` | Root | Type-checks and compiles both backend (`tsc`) and frontend (`vite build`) |
| `npm run seed` | Root / Backend | Executes base seeder: branches, batches, foundational topics, initial users |
| `npm run seed:reset` | Root / Backend | Truncates all tables and re-executes base seed |
| `npm run seed:demo` | Root / Backend | Populates full 6-week activity seed, test questions, problems, and student personas |
| `npm run demo:reset` | Root / Backend | Idempotent one-command reset: executes `seed:reset` followed by `seed:demo` |
| `npm run validate:content` | Root / Backend | Programmatic validation verifying zero question arithmetic or key mismatches |
| `npm run db:counts` | Root / Backend | Verifies database integrity against exact expected record counts across 14 tables |
| `npm run e2e` | Root / Backend | Executes comprehensive 24-point backend API integration and security regression suite |
| `npm run smoke` | Root / Frontend | Executes Playwright browser smoke test across all roles, pages, and take-test flow |
| `npm run lint` | Root | Runs ESLint across all backend and frontend TypeScript source files |
| `npm run typecheck` | Root | Runs TypeScript compiler (`tsc --noEmit`) across both backend and frontend |

### Documented Repository Scripts

All scripts residing under `backend/scripts/` and `frontend/scripts/` are strictly maintained and documented:

| Directory | Script File | Description / Purpose | Invocation / Usage |
|---|---|---|---|
| `backend/scripts/` | `dbCounts.ts` | Queries PostgreSQL to verify record counts across all 14 database tables against expected baselines. | `npm run db:counts` |
| `backend/scripts/` | `e2e.mjs` | Comprehensive 50-check API integration, security, rate limit, and code execution test runner. | `npm run e2e` |
| `backend/scripts/` | `runReferenceSolutions.ts` | Database-driven solution validator; tests Python, JavaScript, and negative cases across coding problems. | `npx tsx scripts/runReferenceSolutions.ts` |
| `backend/scripts/` | `scanSecrets.cjs` | Repository-wide security hygiene scanner inspecting working tree and git log for credentials and secrets. | `node scripts/scanSecrets.cjs` |
| `backend/scripts/` | `start-test-server.mjs` | Process wrapper to launch isolated test server instances with custom environment flags. | `node scripts/start-test-server.mjs` |
| `frontend/scripts/` | `smoke.mjs` | Automated Playwright browser smoke test across all 4 role portals, page navigation, and timed test taking. | `npm run smoke` |
| `frontend/scripts/` | `run-all-routes-a11y.mjs` | Automated accessibility and mobile responsiveness auditor testing all routes at 375x667 with axe-core. | `node scripts/run-all-routes-a11y.mjs` |

*(Note: All legacy or undocumented scratch verification scripts have been cleaned and removed).*

---

## 6. Setup from a Clean Clone

### Prerequisites
- **Node.js**: `v20.0.0` or higher (Node 24 LTS verified)
- **npm**: `v10.0.0` or higher
- **PostgreSQL**: `17` running on port `5433` (or configured port)

### Step-by-Step Instructions

1. **Clone and Install Dependencies**:
   ```bash
   git clone <repository-url> intelliplace
   cd intelliplace
   npm install
   ```

2. **Configure Environment Variables**:
   ```bash
   # Backend configuration from template
   cp backend/.env.example backend/.env

   # Frontend configuration from template
   cp frontend/.env.example frontend/.env
   ```
   Generate a secure 64-byte JWT secret and append it:
   ```bash
   node -e "console.log('JWT_SECRET=\"' + require('crypto').randomBytes(64).toString('hex') + '\"')" >> backend/.env
   ```

3. **Initialize Database Schema & Generate Prisma Client**:
   ```bash
   # Generate Prisma client artifacts
   npm run prisma:generate --workspace backend

   # Apply schema migrations (production/fresh install)
   npx prisma migrate deploy --schema backend/prisma/schema.prisma

   # (Alternatively, for rapid prototyping in development):
   # npm run db:push --workspace backend
   ```

4. **Seed Demo Dataset**:
   ```bash
   npm run demo:reset
   ```

5. **Verify Database Counts**:
   ```bash
   npm run db:counts
   ```

6. **Start Local Development Servers**:
   ```bash
   # Terminal 1: Backend API
   npm run dev:backend

   # Terminal 2: Frontend Client
   npm run dev:frontend
   ```
   Open `http://localhost:5173` in your browser.

---

## 7. Demo Accounts & Student Personas

> [!WARNING]
> **Demo Credentials Security Notice**: The passwords listed below (`Admin@123`, `Po@12345`, `Trainer@123`, `Student@123`) and seed commands (`seed`, `seed:demo`, `demo:reset`) are strictly for **local development and demonstration use only**. Both seeders automatically refuse execution when `NODE_ENV=production`. In production deployments, real passwords and rotating secrets must be managed securely through environment variables.

| Role / Persona | Email | Password | Readiness | Characteristics & Demonstration Scope |
|---|---|---|---|---|
| **Administrator** | `admin@intelliplace.edu` | `Admin@123` | N/A | System administration: academic branches, batches, user lifecycle & role forcing. |
| **Placement Officer (PO)** | `po@intelliplace.edu` | `Po@12345` | N/A | Executive dashboard, readiness breakdown, CSV roster export, company drive publisher. |
| **Trainer 1 (Aptitude)** | `trainer1@intelliplace.edu` | `Trainer@123` | N/A | Aptitude question bank author, PDF study material manager, timed test creator. |
| **Trainer 2 (Technical)** | `trainer2@intelliplace.edu` | `Trainer@123` | N/A | Technical problem author, coding test cases & starter template manager. |
| **Student: Alice Johnson** | `alice@student.edu` | `Student@123` | **Ready (72/100)** | CSE 2025 (CGPA 9.1). High achiever: 5 distinct coding problems solved (10 pts), 3 mock attempts (avg 86.67% = 52 pts), complete profile (10 pts). Eligible for all Tier-1 company drives. |
| **Student: Bob Smith** | `bob@student.edu` | `Student@123` | **Almost Ready (54/100)** | CSE 2025 (CGPA 7.8). Moderate readiness: 4 coding problems solved (8 pts), 1 mock attempt (60% = 36 pts), complete profile (10 pts). Demonstrates weak topic diagnostic in Verbal Ability (33% accuracy) with targeted resource recommendations. |
| **Student: Carol Williams** | `carol@student.edu` | `Student@123` | **Almost Ready (43/100)** | IT 2026 (CGPA 6.5). Demonstrates consistent 6-week upward progression across 5 mock tests (avg 56% = 33.6 pts), 2 coding solved (4 pts), profile (5 pts). |
| **Student: Dave Brown** | `dave@student.edu` | `Student@123` | **Not Ready (5/100)** | ECE 2025 (CGPA 8.2). High academic CGPA but disengaged from placement prep: 1 coding problem attempted (0 solved), 0 mock attempts, profile (5 pts). Top candidate on PO "Needs Attention" list. |
| **Student: Eve Davis** | `eve@student.edu` | `Student@123` | **Not Ready (5/100)** | IT 2026 (CGPA 8.9). Zero mock tests and zero coding attempts, profile (5 pts). Showcases seamless empty states and onboarding guidance. |

---

## 8. Readiness Scoring: One Source of Truth

Student readiness is calculated deterministically by a single function (`backend/src/services/readiness.ts`) utilized identically by the student dashboard, student analytics endpoint, and the Placement Officer cohort summary.

### Mathematical Formula

$$\text{Readiness Score} = \text{round}(\text{Aptitude Component} + \text{Coding Component} + \text{Profile Component})$$

Clamped strictly within the integer range $[0, 100]$.

1. **Aptitude Component (Maximum 60 points)**:
   - Proportional to the student's average percentage across all mock test attempts:
     $$\text{Aptitude Points} = 60 \times \text{avgMockPercentage}$$
   - Where $\text{avgMockPercentage} = \frac{\sum (\text{attemptMarks} / \text{testTotal})}{\text{attemptCount}}$. If no mock tests have been attempted, points $= 0$.

2. **Coding Component (Maximum 30 points)**:
   - Evaluates distinct coding problems solved against total published coding problems:
     $$\text{Coding Points} = 30 \times \frac{\text{Distinct Solved Problems}}{\text{Total Published Coding Problems}}$$
   - Only accepted submissions count. Repeated solves of the same problem do not grant duplicate points.

3. **Profile Component (Maximum 10 points)**:
   - Evaluates profile completeness across 4 verified schema fields:
     - **+3 points**: Valid academic CGPA entered ($> 0.0$).
     - **+3 points**: Valid Resume uploaded / linked.
     - **+2 points**: Academic branch configured.
     - **+2 points**: Target career role selected.

### Exact Readiness Bands
- **`Not Ready`**: Score strictly less than 40 ($< 40$).
- **`Almost Ready`**: Score from 40 up to 70 inclusive ($40 - 70$).
- **`Ready`**: Score strictly greater than 70 ($> 70$).

*(Note: Score 39 maps to `Not Ready`; score 40 maps to `Almost Ready`; score 70 maps to `Almost Ready`; score 71 maps to `Ready`).*

---

## 9. API Endpoint Summary by Module

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Authentication (`/api/auth`)
- `POST /register`: Student registration with batch/branch validation.
- `POST /login`: Credential verification; returns JWT and user profile.
- `GET /me`: Authenticated identity and role verification.
- `POST /change-password`: Self-service password change.

### Student Portal (`/api/student`)
- `GET /profile`: Fetch student academic profile, resume, and skills.
- `PUT /profile`: Update profile fields (recomputes profile score).
- `GET /dashboard`: Aggregated dashboard metrics, active tests, upcoming drives, and readiness breakdown.

### Practice Module (`/api/practice`)
- `GET /topics`: List question bank topics with question counts.
- `POST /start`: Generate an un-timed practice session for selected topic.
- `POST /submit`: Score practice session, update student history, return answer rationales.

### Test Engine (`/api/tests`)
- `GET /`: List eligible mock tests for authenticated student's batch.
- `GET /:id`: Fetch test details and sanitized questions (answers stripped).
- `POST /:id/start`: Initialize timed attempt; creates attempt timestamp.
- `POST /:id/submit`: Grade submitted answers; enforces server-side time window.
- `GET /:id/results`: Fetch detailed post-submission score and question breakdown.

### Coding Problems (`/api/problems`)
- `GET /`: List coding problems with difficulty and tags.
- `GET /:id`: Fetch problem details and visible sample cases (hidden cases strictly omitted).
- `POST /:id/submit`: Submit solution; evaluated by code runner or test simulator.

### Analytics (`/api/analytics`)
- `GET /student/:id/readiness`: Comprehensive readiness components and band.
- `GET /student/:id/weak-topics`: Identified weak areas ($<50\%$ accuracy) with minimum attempt threshold.
- `GET /student/:id/trend`: Historical chronological score progression.

### Placement Officer (`/api/po`)
- `GET /summary`: Aggregated institutional readiness statistics and band distribution.
- `GET /students`: Filterable student roster with readiness scores and eligibility.
- `GET /attention`: At-risk students requiring placement intervention.
- `GET /export-csv`: Export student roster with formula injection sanitization.

### Company Drives (`/api/companies`)
- `GET /`: List active recruitment drives and eligibility criteria.
- `POST /`: Create company drive (PO only).
- `PUT /:id`: Update drive details and deadlines (PO only).
- `POST /:id/target`: Student bookmarking/targeting of drive.

### Trainer Management (`/api/trainer`)
- `POST /questions`: Create aptitude questions with explanations.
- `POST /tests`: Create mock test with time limit, window, and batch assignment.
- `POST /resources`: Upload study PDFs with metadata and ownership tracking.
- `GET /resources`: List resources authored by authenticated trainer.

### Administration (`/api/admin`)
- `GET /branches`, `POST /branches`: Manage institutional branches.
- `GET /batches`, `POST /batches`: Manage graduation batches.
- `GET /users`, `PATCH /users/:id/toggle-active`: User activation control.

---

## 10. Security Measures Implemented

1. **Cryptographic Authentication**:
   - Passwords hashed using `bcryptjs` with salt work factor of 10.
   - JWT tokens signed with high-entropy 64-byte secrets; invalid or expired tokens rejected uniformly.

2. **Role-Based Access Control (RBAC)**:
   - Dedicated `requireRole(['ADMIN', 'PO', 'TRAINER', 'STUDENT'])` middleware.
   - Role boundaries enforced at the controller layer; students cannot access trainer test creation or administrative routes.

3. **Ownership Verification**:
   - Trainers can only edit, inspect, or delete tests and resources they personally authored.
   - Students can only view their own test submissions, attempts, and diagnostic profiles.

4. **Multi-Tier Rate Limiting**:
   - `authLimiter`: 10 requests per 15-minute window on `/api/auth/login` to prevent credential brute-forcing.
   - `submitLimiter`: 10 test submits per minute per IP to mitigate flood attacks.
   - `apiLimiter`: 300 general API requests per 15-minute window.

5. **Student Answer-Key & Hidden Case Protection**:
   - Student test endpoints (`GET /api/tests/:id`) utilize Prisma projection filtering to strip `isCorrect` and `explanation` flags.
   - Coding problem endpoints (`GET /api/problems/:id`) deliver only `isSample: true` test cases; hidden test cases never leave the database server.

6. **Malicious File Upload Validation**:
   - Resources upload restricted strictly to `.pdf` MIME types.
   - Dangerous extensions (`.exe`, `.sh`, `.bat`, `.cmd`, `.js`) immediately rejected with HTTP 400.
   - Upload directory isolated outside public static web roots; downloads streamed through authenticated endpoint verifying file existence and path traversal guards.

7. **CSV Formula Injection Neutralization**:
   - Placement Officer CSV exports sanitize all string fields. Any field starting with spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) is automatically prepended with a single quote (`'`).

8. **Test Window & Timer Integrity**:
   - Tests enforce start and end date-time windows. Attempts outside window are rejected.
   - Attempt duration is tracked server-side; submissions exceeding the test duration by more than the 30-second network grace window are graded based on answers submitted at time of expiry.

---

## 11. Code Runner: Security Limits & Architecture

> **IMPORTANT SECURITY DISCLOSURE:**  
> A child process spawned on the host OS is **NOT** a virtualization sandbox.

The local runner (`LocalProcessRunner` in `backend/src/services/codeRunner.ts`) is designed for local offline development, demonstration, and evaluation without requiring cloud dependencies or container daemons.

### Guardrails Implemented
- **Gated by Default**: `CODE_RUNNER_ENABLED=false` in standard development and production environments.
- **Process Semaphore**: Concurrency hard-capped (`RUNNER_MAX_CONCURRENCY=2`) using an asynchronous counting semaphore to prevent CPU exhaustion.
- **Strict Execution Timeouts**: Host execution capped at `RUNNER_TIMEOUT_MS=2000` (2 seconds). Subprocesses exceeding this limit are terminated via `SIGKILL`.
- **Payload Size Limits**: Source code payloads exceeding `RUNNER_MAX_SOURCE_BYTES=65536` (64 KB) are rejected prior to execution.
- **Path Sanitization**: Compiler error messages and runtime stack traces are scrubbed to mask local host filesystem paths with `<sandbox>`.
- **Environment Scrubbing**: Subprocesses run with an empty environment dictionary (`env: {}`), preventing access to `process.env` or database credentials.

### Production Recommendation
For enterprise production environments accepting untrusted student code, the runner service should be replaced with an isolated container sandbox provider (e.g., Judge0 API, AWS Lambda, or an isolated gVisor/Docker runner). A stub interface `Judge0Runner` is included in `codeRunner.ts` to facilitate this integration.

---

## 12. Known Limitations

- **Shared Question Bank**: Aptitude questions reside in a common institutional pool organized by topic rather than isolated per department.
- **Local Runner Isolation**: As noted above, the local process runner relies on OS-level process management rather than hardware virtualization.
- **Mocked Notifications**: System announcements and reminders are persisted to the database and displayed in-app; external SMTP email delivery is stubbed.
- **Single Concurrent Session**: Session tracking relies on standard JWT lifecycles rather than Redis-backed single-device revocation.

---

## 13. Future Scope

In alignment with the institutional project abstract, planned enhancements include:
1. **MicroVM Execution**: Integrating Firecracker or gVisor for millisecond-latency, fully hardware-isolated code execution.
2. **AI Resume Parser & Matcher**: Utilizing LLM-assisted vector embeddings to match student project experiences against published job descriptions.
3. **Automated Proctoring**: Optional browser tab-switch detection and webcam snapshot verification during formal mock placement tests.
4. **Adaptive Item Response Theory (IRT)**: Dynamically selecting aptitude practice questions based on real-time student ability estimates.

---

## 14. Performance, Scalability & Cache Reliability (Module 18)

### Architecture & Optimization Highlights
1. **In-Memory TTL Caching & Pattern Invalidation (`src/utils/cache.ts`)**:
   - High-computation endpoints (such as `getPlacementStats` and cohort analytics) utilize an in-memory TTL store.
   - Mutations to offers, drives, or student records automatically invalidate relevant cache partitions via wildcard pattern matching (e.g., `invalidatePattern('stats:placement')`).

2. **N+1 Query Elimination**:
   - Placement reporting (`src/services/reporting.service.ts`) executes a single batched `prisma.offer.findMany({ where: { studentId: { in: ids } } })`, mapping entries in an in-memory hash map for $O(1)$ lookup rather than per-row queries.
   - Company distribution analytics batch lookups using `prisma.company.findMany({ where: { id: { in: companyIds } } })`.

3. **Bulk Onboarding Throughput**:
   - `bulkImportStudents` computes bcrypt password hashes once per batch instead of per row, eliminating event loop blocking.
   - Existing email addresses and university roll numbers are pre-fetched into indexed Sets, converting per-row DB existence checks into $O(1)$ memory evaluations.

4. **Concurrency & Row Locking (`src/services/scoring.service.ts`)**:
   - Exam submission evaluation executes inside `prisma.$transaction` utilizing `SELECT id FROM test_attempts WHERE id = $1 FOR UPDATE`.
   - Prevents race conditions and duplicate submission grading under high concurrent test traffic.

5. **Redis Reliability Strategy (Horizontal Scale-out)**:
   - In single-instance deployment, the native in-memory TTL cache operates with zero external infrastructure overhead.
   - For multi-instance clustered deployments, the cache layer abstracts seamlessly to a Redis cluster with automatic Sentinel failover, connection retries with exponential backoff, and in-memory fallback if Redis is temporarily unreachable.

6. **Load Testing Verification (`tests/loadTest.k6.js`)**:
   - Automated k6 load testing suite benchmarks the system up to 50 concurrent virtual users.
   - Server-side response thresholds enforce 95th percentile latency $p(95) < 500\text{ms}$ and error rate $< 1\%$.

---

## 15. Deployment & Production Infrastructure (Module 19: Challenges 296–310)

### 1. Production Docker Architecture (`docker-compose.yml`)
- **Database (`postgres:16-alpine`)**:
  - Health checks with `pg_isready -U postgres` every 5 seconds.
  - Persistent named storage volume (`pgdata:/var/lib/postgresql/data`).
  - Container-level log rotation (`json-file`, max-size 10MB, max-file 3).
- **Backend Service (`backend/Dockerfile`)**:
  - Multi-stage build (`node:18-alpine`).
  - Deterministic dependency resolution via `npm ci`.
  - Compile-time type check (`npx tsc --noEmit`) and TypeScript compilation.
  - Startup orchestration ensuring safe migration deployment (`npx prisma migrate deploy && node dist/app.js`).
  - Service health dependency `depends_on: db: condition: service_healthy`.
  - Persistent uploads storage volume (`uploads:/app/uploads`).
- **Frontend Reverse Proxy (`frontend/Dockerfile` & `nginx.conf`)**:
  - Multi-stage build producing optimized production bundle.
  - Production `nginx:alpine` image serving static assets and SPA fallback routing (`try_files $uri $uri/ /index.html`).
  - Internal reverse-proxying of `/api/` traffic directly to `http://backend:4000/api/` on isolated Docker bridge network `intelliplace-net`, eliminating production CORS complexity.

### 2. Operational & Deployment Runbooks
- **Zero-Downtime Deployment (`deploy/update.sh`)**:
  - Pulls latest main branch and builds updated images.
  - Runs database migrations in an isolated temporary container (`docker-compose run --rm backend npx prisma migrate deploy`).
  - Performs rolling zero-downtime service restarts using `docker-compose up -d --no-deps --build`.
- **Disk Space Management (`deploy/cleanup.sh`)**:
  - Prunes dangling and aged Docker images, stopped containers, build caches, and unused networks while safeguarding named database and upload volumes.
- **SSL / TLS Production Configuration (`deploy/nginx-production.conf.example`)**:
  - Enforces HTTP-to-HTTPS 301 redirection.
  - Configures Let's Encrypt certificates with modern TLSv1.2 and TLSv1.3 protocols.
- **Infrastructure Verification (`tests/infra_test.sh`)**:
  - Validates Docker Compose file syntax, image builds, container health probes, and reverse proxy connectivity.

---

## 16. Testing & Quality Assurance (Module 20: Challenges 311–325)

### 1. Unified Test Architecture & Environment Safety
- **Dedicated Test Environment (`.env.test`)**:
  - Configures isolated test database connection (`DATABASE_URL=...intelliplace_test`).
  - Pre-test verification enforces safety guards ensuring test suites never run against production data.
- **Global Lifecycle & Teardown (`tests/setup.ts`, `tests/teardown.ts`)**:
  - Seeds minimal required referential baseline (branches, batches, topics, admin and officer users).
  - Automatically sweeps temporary test fixtures and ephemeral student data post-run.
- **Coverage & Reporting (`jest.config.cjs`, `jest.config.js`)**:
  - Global statements and line coverage thresholds enforced at 60%+, with core services targeted at 70%+.
  - Diagnostic capture enabled with verbose reporting and LCOV/text output.

### 2. Specialized Test Suites
- **Test Factories & Mock Infrastructure (`tests/factories.ts`, `tests/mocks.ts`)**:
  - Referential entity generators (`createStudent`, `createCompany`, `createDrive`, `createMockTest`).
  - Controlled stubs for external dependencies (`mockEmailTransporter`, `mockWebPush`, `mockExternalApi`).
- **Comprehensive RBAC Matrix (`tests/testingQualityAssurance.test.ts`)**:
  - Enforces role-based endpoint permissions, IDOR guards, and prevents self-demotion or privilege escalation.
- **Concurrency & Race Conditions**:
  - Verifies idempotency keys on test submissions and notifications.
  - Ensures capacity constraints and prevents duplicate concurrent application entries.
- **Cross-Browser & Mobile E2E Testing (`frontend/playwright.config.ts`, `frontend/e2e/workflows.e2e.spec.ts`)**:
  - Playwright matrix covering Desktop Chromium, Firefox, WebKit, Mobile Chrome, and Mobile Safari.
  - End-to-end user journeys for registration, drive discovery, application review, and role-based redirect protection.
- **CI/CD Automation & Smoke Testing (`.github/workflows/ci.yml`, `deploy/smoke-test.sh`)**:
  - GitHub Actions multi-job workflow running migrations, type checks, backend coverage, frontend builds, and E2E suites.
  - Post-deployment smoke test probing backend health, auth handlers, and proxy connectivity.

---

## 17. Data Privacy & Compliance (Module 21: Challenges 326–335)

### 1. Granular Consent Management (Challenge 329)
- **Model**: `ConsentRecord` with composite unique constraint `@@unique([studentId, type])`.
- **Consent Types**:
  - `placement_sharing`: Authorizes sharing verified academic history and resume files with recruiter companies for active campus placement drives.
  - `data_processing`: Authorizes automated AI profiling, skill radar calculations, and readiness scoring.
  - `marketing_communications`: Authorizes career webinar notifications and non-essential advisory mailers.
- **Audit & Governance**: Every grant and revocation updates `grantedAt` / `revokedAt` timestamps and records an immutable entry in `AuditLog`.

### 2. Recruiter Data Sharing Gate & Access Logging (Challenges 326, 328, 332, 333)
- **Recruiter Sharing Gate (`logDataShare`)**:
  - Strictly verifies that the student possesses active `placement_sharing` consent before allowing application exports or candidate shortlists to be transmitted to employers. Throws 403 Forbidden if consent is missing or revoked.
  - Generates immutable `DataShareLog` entries capturing `studentId`, `companyId`, `driveId`, `dataTypes`, and `sharedBy`.
- **Data Access Auditing (`logDataAccess`)**:
  - Automatically captures whenever administrators, trainers, or recruiters view academic profiles or download student resume versions.
  - Records `actorId`, `targetUserId`, `resourceType`, `action` (`view` / `download`), and `requestId`.
- **Student Access Transparency**:
  - Students can review their personal data access ledger in real time via `GET /api/privacy/me/access-logs` and the Student Privacy Dashboard.
  - Enforces strict user isolation: students cannot inspect logs belonging to other candidates.

### 3. Data Subject Rights & GDPR Workflows (Challenge 331)
- **Model**: `DataRequest` (`type`: `correction`, `deletion`, `data_export`, `status`: `pending`, `approved`, `rejected`, `completed`).
- **Workflow**:
  - Students submit formal privacy requests specifying the rectification details or deletion justification (`POST /api/privacy/me/data-requests`).
  - Administrators review pending requests (`GET /api/privacy/data-requests`), evaluate academic veracity, and issue decisions with resolution notes (`PATCH /api/privacy/data-requests/:id`).
  - Automated in-app notifications notify the student upon resolution.

### 4. Data Retention Policies & Account Anonymization (Challenges 330, 334, 335)
- **Model**: `RetentionPolicy` (`dataCategory`, `retentionDays`, `action`: `anonymize` / `delete`, `isActive`).
- **Configurable Retention Windows**:
  - Administrators configure retention durations across entities (`AuditLog`, `Notification`, `StudentProfile`, `ResumeVersion`).
- **Automated Lifecycle Worker (`evaluateRetention`)**:
  - Background worker scheduled in `backend/src/app.ts` sweeps records exceeding retention cutoffs.
- **Account Anonymization (`anonymizeStudent`)**:
  - Replaces personally identifiable names, emails (`anonymized+<id>@deleted.intelliplace`), and resets sensitive profile attributes while preserving referential integrity for historical placement metrics.

---

## 18. Reporting & Analytics (Module 22: Challenges 336–350)

### 1. Centralized Placement Metrics & Unique Placed Deduplication (Challenges 336, 337, 342)
- **Mathematical Accuracy**: `placementPercentage = (uniquePlacedStudents / eligibleStudents) * 100`.
- **Duplicate Prevention**: Leverages `Set` lookups on `studentId` across offers and applications, ensuring multi-offer candidates are counted as a single unique placed individual.
- **Conversion Funnel Analytics**: End-to-end recruitment funnel tracking:
  - Registered Students -> Unique Applicants -> Shortlisted Candidates -> Final Selections -> Unique Placed.

### 2. High-Performance Cohort & Enterprise Aggregations (Challenges 338, 339, 341, 343, 349)
- **Branch-wise Distribution**: Aggregates total vs placed candidates across academic disciplines with batch-fetching (`findMany` + Map) to eliminate N+1 overhead.
- **Company-wise Metrics**: Tracks active drives, total offers, unique placed candidates, and average CTC per employer.
- **Salary Analytics**: Computes arithmetic mean, median, min, max, and offer volume for verified, accepted offers.
- **Assessment Analytics**: Calculates average mock assessment scores, 50%+ competency pass rates, and institutional participation rates.

### 3. Caching & Cache Invalidation Hooks (Challenge 340)
- **In-Memory TTL Caching**: High-frequency dashboard metrics are cached for 300 seconds using `setCache`.
- **Automatic Invalidation**: `invalidateAnalyticsCache()` (`invalidatePattern('analytics:')`) hooked directly into `offer.service.ts` and `application.service.ts` to guarantee instant freshness upon offer or application status transitions.

### 4. Advanced Multi-Format Reporting (Challenges 345, 346)
- **CSV Export**: Sanitized with formula injection guards (`csvCell`).
- **Excel Export (`exceljs`)**: Multi-sheet formatted workbook containing Executive Summary, Branch-wise breakdown, and Student placement details.
- **PDF Export (`pdfkit`)**: Formatted institutional placement document featuring executive KPI summaries and branch distribution tables.

### 5. Centralized Integration & RBAC Protection (Challenges 347, 348, 350)
- **Unified Filtering**: `AnalyticsFilters` (`batchId`, `branchId`, `companyId`, `academicYear`) applied across all analytical endpoints.
- **Dashboard Synchronization**: Unified `analytics.service.ts` powers both API endpoints and frontend Recharts visualizations in `AdminDashboard.tsx`.
- **Strict Role-Based Access Control**: Student accounts receive 403 Forbidden on PO/Admin analytical and export routes.

---

## 19. Institutional Context: LBS College of Engineering (APJKTU 2019 Scheme)

### 1. Academic Department Mapping & Department Codes
IntelliPlace is customized to reflect the exact engineering departments of **LBS College of Engineering, Kasaragod (LBSCEK)** under the **APJ Abdul Kalam Technological University (APJKTU) 2019 Scheme**:
- `CS`: Computer Science and Engineering
- `ME`: Mechanical Engineering
- `CE`: Civil Engineering
- `EC`: Electronics and Communication Engineering
- `EE`: Electrical and Electronics Engineering
- `IT`: Information Technology
- `CSBS`: Computer Science and Business Systems (approved and offered from 2024 onwards)
- `CAID`: Artificial Intelligence and Data Science (approved and offered from 2024 onwards)

### 2. KTU Register Number (`KTUID`) Convention & Validation Engine
- **Regex Specification**: `^(L?)(KSD)(\d{2})(CSBS|CAID|CS|ME|CE|EC|EE|IT)(\d{3,4})$`
  - **Lateral Entry Prefix (`L`)**: Identifies lateral entry students joining in the 3rd semester (`entryType: "LATERAL"`).
  - **College Code (`KSD`)**: Enforces institutional affiliation with LBS College of Engineering, Kasaragod.
  - **Admission Year (`\d{2}`)**: Two-digit year component converted to `2000 + YY`.
  - **Department Code**: Validated against institutional department offerings with longest-match precedence (`CSBS` and `CAID` prioritized before `CS`).
  - **Student Sequence Number (`\d{3,4}`)**: Roll number component.
- **Automated Graduating Batch Calculation**:
  - Regular Entry: `graduatingBatch = admissionYear + 4` (e.g., `KSD23CS007` -> 2027 batch).
  - Lateral Entry: `graduatingBatch = admissionYear + 3` (e.g., `LKSD23EE019` -> 2026 batch).
- **Curricular Introduction Guards**:
  - Rejects registration with modern branches (`CSBS` or `CAID`) for admission batches prior to 2024 (`validFromYear: 2024`).

### 3. Database Schema Hardening
- **`Branch` Model**:
  - `code String? @unique @map("code")`: KTU department code.
  - `isActive Boolean @default(true) @map("is_active")`: Department activation status.
- **`StudentProfile` Model**:
  - `ktuid String? @unique @map("ktuid")`: KTU University Register Number.
  - `entryType String @default("REGULAR") @map("entry_type")`: `REGULAR` or `LATERAL`.
  - `graduatingBatch String? @map("graduating_batch")`: Computed graduation year cohort.
  - `academicScheme String @default("APJKTU_2019") @map("academic_scheme")`: Academic regulation scheme.
  - `currentSemester Int? @map("current_semester")`: Current semester of study (1–8).

### 4. Auth & Profile Integration
- **Registration Pipeline (`POST /api/auth/register`)**:
  - Optional `ktuid` validated in `auth.validators.ts` with APJKTU regex pattern.
  - `validateAndParseKTUID` auto-determines branch, entry type, admission year, and graduating batch, ensuring single-step onboarding consistency without manual data entry.
- **Self-Service & Verification**:
  - `GET /api/students/me` and `GET /api/students/:id` return full APJKTU metadata alongside branch code and semester.

### 5. Institutional Analytics & Cohort Filtering
- **Enhanced `AnalyticsFilters`**:
  - Extended to accept `graduatingBatch?: string` and `entryType?: string`.
  - Placement metrics (`/api/analytics/stats`), branch statistics, and exports can be filtered to compare Regular vs Lateral placement outcomes and track individual KTU graduating cohorts.

### 6. User Experience & Verification
- **Frontend Registration (`RegisterPage.tsx`)**:
  - University Register Number input with real-time pattern validation and LBSCEK format helper text.
- **Frontend Student Profile (`ProfilePage.tsx`)**:
  - Dedicated "APJKTU Academic Information" card displaying KTUID, Entry Type, Admission Year, Graduating Batch, Academic Scheme, and Current Semester.
- **Test Certification (`tests/institutionalContext.test.ts`)**:
  - Comprehensive suite verifying KTUID parsing, lateral calculations, 2024 department restrictions, registration flows, profile retrievals, and analytics filtering.
  - Suite execution passes with 100% compliance across all 23 backend challenge suites (240 pass, 0 fail).

---

## 20. Enterprise Mass Notification System (EMNS)

### 1. Dynamic Recipient Revalidation at Send Time
- **Dynamic Candidate Resolution**: The system avoids pre-generating static notification recipient lists. Instead, `scheduleDriveReminders` persists abstract reminder schedules (`NotificationSchedule`), and `getEligibleNonApplicants` queries the live applicant pool *at send time*.
- **Applicant Exclusion**: Candidates who submit an active application (`status !== 'withdrawn'`) even 1 second prior to schedule execution are excluded dynamically from subsequent reminder broadcasts.
- **Eligibility Recalculation**: Integrates `evaluateForDrive` to verify current academic status, backlogs, and CGPA requirements before message dispatch.

### 2. Automated Deadline Intervals & Idempotency
- **Interval Hierarchy**: On placement drive publication or deadline modification, `scheduleDriveReminders` calculates scheduled timestamps across standard intervals:
  - `initial`: Immediate broadcast upon publication
  - `7d`: 7 days prior to registration deadline
  - `3d`: 3 days prior to registration deadline
  - `24h`: 24 hours prior to registration deadline
  - `6h`: 6 hours prior to registration deadline (critical priority)
  - `1h`: 1 hour prior to registration deadline (critical priority)
- **Idempotency Safeguard**: Each broadcast is stamped with an atomic `idempotencyKey` formatted as `emns:<driveId>:<scheduleId>`, preventing duplicate notifications even across process restarts or worker retries.

### 3. Atomic Job Locking & Background Worker
- **Concurrency & Worker Safety**: Employs an atomic status transition lock (`UPDATE notification_schedules SET status = 'processing', locked_at = NOW() WHERE id = :id AND status = 'pending'`).
- **Autonomous Polling Worker**: A lightweight non-blocking background loop (`setInterval` every 60 seconds with `.unref()`) scans due schedules in batches of 10, dispatches notifications, and releases locks upon unexpected failure.
- **Persistence Across Restarts**: Database-backed `NotificationCampaign` and `NotificationSchedule` models survive server crashes, maintaining scheduled state without requiring Redis or BullMQ.

### 4. Lifecycle Hooks & Drive Status Synchronization
- **Lifecycle Integration (`drive.controller.ts`)**:
  - `publishDrive`: Automatically provisions campaign schedules when a valid `registrationDeadline` is present.
  - `updateDrive`: Dynamically reschedules pending reminders if the registration deadline is extended, or cancels pending reminders if the deadline is removed.
  - `cancelDrive`, `withdrawDrive`, `archiveDrive`: Instantly transitions all pending schedules to `cancelled`, suppressing further candidate outreach.

### 5. PO Campaign Dashboard & Manual Broadcasts
- **Dashboard API (`GET /api/emns/dashboard`)**:
  - Aggregates active placement drives, total application volumes, live eligible non-applicant counts, and next scheduled reminder metadata.
- **Manual Urgent Broadcasts (`POST /api/emns/trigger/:driveId`)**:
  - Permits Placement Officers to trigger immediate manual reminder campaigns with dynamic student revalidation.
- **Role-Based Access Control**: Strict `requireRole('po', 'admin')` protection restricts student access with `403 Forbidden`.

### 6. Verification & Test Certification
- **Dedicated Suite (`tests/emns.test.ts`)**:
  - 10 comprehensive tests covering schedule interval population, dynamic eligibility queries, applicant exclusion, atomic locking, drive cancellation hooks, and PO dashboard APIs.
  - 100% passing across all 24 backend test suites (250 tests passed, 0 failed, 8 skipped offline).

---

## 21. Centralized Student Master Profile & Dynamic Company Data Generation

### 1. Collect Once, Verify Centrally, Reuse Everywhere
- **Universal Onboarding Architecture**: Centralizes all placement-relevant student data collected immediately post-registration across 10 structured sections:
  - **Section A (Personal & Contact)**: Full Name, KTU ID / Register Number, Personal Email, College Email, Primary/Alternate Phone, Residential & Permanent Address, City, District, State, Pincode, Country, DOB, Gender, Blood Group, Nationality.
  - **Section B (Academic Program Information)**: College Name, University Affiliation (APJKTU), Degree, Department / Branch, Department Code, Admission Year, Expected Graduation Year, Current Semester, Current CGPA.
  - **Section C (Past Qualifications)**: 10th Standard (School, Board, Year, Percentage/CGPA), 12th Standard (School, Board, Stream, Year, Percentage/CGPA), 3-Year Diploma (Institution, Branch, Year, Percentage) with automated lateral entry exemption logic.
  - **Section D (Backlogs & Academic Gaps)**: Active Backlog Count, Historical Backlogs, Cleared Backlogs, Academic Gap Flag, Gap Duration (Months), Gap Reason.
  - **Section E (Technical Skills)**: Relational child model (`StudentTechnicalSkill`) storing skill category, name, proficiency level (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`), and years of experience.
  - **Section F (Academic & Personal Projects)**: Relational child model (`StudentProject`) storing project title, domain, technologies, duration, team flag, contribution description, project URL, and GitHub repository link.
  - **Section G (Internships & Experience)**: Relational child model (`StudentInternship`) capturing organization name, role, internship type, duration, responsibilities, tech stack, and certificate URL. Includes explicit `internshipNotApplicable` exemption toggle.
  - **Section H (Certifications & Badges)**: Relational child model (`StudentCertification`) with title, issuing body, credential ID, issue date, expiry date, and verification URL.
  - **Section I (Professional Profiles & Career Interests)**: Career interests, target roles, preferred job locations, GitHub URL, LinkedIn URL, Portfolio URL.
  - **Section J (Placement Documents)**: Relational child model (`StudentDocument`) capturing resume PDFs, academic transcripts, marksheets, ID proofs, with authenticated streaming downloads.

### 2. Mandatory Verification Gate & Preliminary Assessment Shield
- **Strict Verification Gate**: In `studentAssessment.controller.ts`, requests to `/api/students/me/assessment` are guarded against unverified profiles:
  ```ts
  if (profile && profile.masterStatus !== 'VERIFIED') {
    throw ApiError.forbidden(
      `Placement Training Officer assessment requires a complete and verified Student Master Profile. Current status: ${profile.masterStatus}.`
    );
  }
  ```
- **Completion Metric Calculator**: `calculateProfileCompletion` validates all mandatory fields across Sections A–J, handling conditional exemptions (e.g., 12th standard exempted if lateral diploma details exist, internship exempted if explicitly flagged Not Applicable). Incomplete submission attempts are rejected with HTTP 400 and an exhaustive list of missing required fields.
- **Officer Review Queue**: Placement Training Officers review submitted master profiles via `GET /api/master-profile/verification/queue`, inspect full candidate details, request revisions with constructive feedback (`REVISION_REQUIRED`), or approve profiles (`VERIFIED`). All actions record immutable entries in `StudentProfileVerificationHistory`.

### 3. Dynamic Company-Specific Data Requirements & Templates
- **Zero Hardcoded Schemas**: Placement Officers can define arbitrary combinations of student master profile fields for any placement drive or save them as reusable templates (`CompanyDataRequirementTemplate`).
- **Granular Customization**: Each field in a requirement configuration specifies:
  - `fieldKey`: Canonical master profile attribute key
  - `label`: Human-readable label
  - `customColumnName`: Recruiter-requested custom column header (e.g. `KTUID`, `UG CGPA`, `Candidate Name`)
  - `order`: Exact column ordering in export files
  - `required`: Mandatory extraction flag for compliance validation
- **Central Field Catalog**: `GET /api/company-requirements/catalog` delivers an exhaustive registry of all extractable master profile fields grouped by section.

### 4. One-Click Dataset Generation with Strict Data Minimization
- **Strict Data Minimization Engine**: `generateCompanyDataset` constructs candidate export records by extracting *strictly* the configured fields in exact order:
  - Unrequested fields (e.g., personal emails when only college emails were requested) are never extracted.
  - Internal assessment scores, trainer notes, and passwords are never leaked.
  - Generates candidate-level missing field diagnostics (`missingCount`, `isComplete`).

### 5. Multi-Stage PTO Approval Gate & Multi-Format Secure Export
- **Export Approval Gate**: Generated datasets begin in `GENERATED` or `INCOMPLETE` status. Direct download or external sharing is strictly forbidden (HTTP 403 `DatasetNotApproved`) until an authorized officer reviews and approves the dataset (`status === 'APPROVED'`).
- **Multi-Format Streaming**:
  - **Excel (`.xlsx`)**: Styled workbook via ExcelJS with header styling, auto-column widths, and metadata.
  - **CSV (`.csv`)**: Formula injection protected (sanitizes `=, +, -, @` characters) with RFC 4180 escaping.
  - **PDF (`.pdf`)**: Formatted landscape printable summary generated with PDFKit.
- **Audit & Compliance Logging**: Every export records an immutable entry in `DatasetExportHistory` and creates GDPR/DPDP-compliant data sharing logs (`DataShareLog` and `AuditLog`).

### 6. Test Suite Certification
- **Dedicated Suite (`tests/studentMasterProfile.test.ts`)**:
  - 11 comprehensive automated tests covering pure function completion math, catalog grouping, incomplete submission rejection, assessment 403 guard, child collections CRUD, PTO review queue, template definition, drive requirement configuration, one-click dataset generation with data minimization, unapproved export blocking, PTO approval, and multi-format exports.
  - 100% pass rate across all 25 challenge test suites (261 passing tests, 0 failures, 8 skipped offline).







