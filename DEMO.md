# IntelliPlace 15-Minute Live Demonstration Walkthrough Script

This script provides a precise, step-by-step 15-minute walkthrough for the IntelliPlace Placement Training & Career Readiness platform.

---

## ⏱ Time Allocation Overview

| Segment | Role / Persona | Focus Areas | Duration |
|---------|---------------|-------------|----------|
| **1** | **Admin** | Users, Branches, Batches management | 2 min |
| **2** | **Trainer** | Question Bank, Test Builder, Resource Upload | 2.5 min |
| **3** | **Student: Alice** | Dashboard (Ready >70), Mock Test taking, Results, Practice, Target Company | 4 min |
| **4** | **Student: Bob** | Weak Topic (Verbal Ability) & Rule-Based Recommendations | 1.5 min |
| **5** | **Student: Carol** | Score Progress Trend (5 mock tests history) | 1 min |
| **6** | **Students: Dave & Eve** | Clean Empty States (0 attempts, zero NaN/undefined) | 1 min |
| **7** | **Placement Officer (PO)** | Summary, Attention List, Publish Drive, CSV Export (formula-neutralized) | 2 min |
| **8** | **Code Runner** | Live Python & JS Execution, Submissions, Isolated Sandbox | 1 min |

---

## 🎭 Step-by-Step Walkthrough

### 1. Admin Walkthrough (2 Minutes)
- **URL**: `http://localhost:5173/login`
- **Credentials**: `admin@intelliplace.edu` / `Admin@123`
- **Steps**:
  1. **Login & Dashboard**: Click **Sign In**.
     - Point out: Total users metric card (9 users), Quick Links to Branches, Batches, and Users.
  2. **Branches**: Navigate to `/admin/branches` via sidebar.
     - Element: Point out existing branches: **CSE**, **IT**, **ECE** with student counts.
     - Action: In the form, enter `MECH` into Branch Name and click **Add Branch**. Point out that MECH appears in the table immediately. Click **Delete** on MECH to leave seed data clean.
  3. **Batches**: Navigate to `/admin/batches`.
     - Element: Point out batches: **2025** (Final Year) and **2026** (Pre-Final Year).
  4. **User Management**: Navigate to `/admin/users`.
     - Element: Point out role badges (**Admin**, **PO**, **Trainer**, **Student**).
     - Action: Demonstrate status toggle: Click **Disable** on Trainer 2 (`trainer2@intelliplace.edu`). Point out the badge changes to red **Disabled**. Click **Enable** to restore.
  5. **Logout**: Click **Logout** in top-right navbar.

---

### 2. Trainer Walkthrough (2.5 Minutes)
- **URL**: `http://localhost:5173/login`
- **Credentials**: `trainer1@intelliplace.edu` / `Trainer@123`
- **Steps**:
  1. **Dashboard Overview**:
     - Point out: Total Questions (67 questions), Coding Problems (15 problems), Tests Created (4 tests).
  2. **Question Bank**: Navigate to `/trainer/questions`.
     - Element: Topic filters (**Quantitative Aptitude**, **Logical Reasoning**, **Verbal Ability**).
     - Point out: Clean difficulty badges (Easy, Medium, Hard) and verified arithmetic questions.
  3. **Test Builder**: Navigate to `/trainer/tests`.
     - Point out: Tests list with creator attribution (Trainer ownership enforced: trainers cannot edit/delete each other's tests).
     - Action: Click **Build Test**. Choose Batch: **2025**, Duration: **20 mins**, Max Attempts: **2**, and select questions.
  4. **Resource Upload**: Navigate to `/trainer/resources`.
     - Element: Upload form with strict file extension filtering.
     - Note: `.pdf`, `.doc`, `.txt` allowed; `.exe` or executable binaries are blocked with 400 Bad Request by server-side Multer validation.
  5. **Logout**: Click **Logout**.

---

### 3. Student Walkthrough: Alice (4 Minutes)
- **URL**: `http://localhost:5173/login`
- **Credentials**: `alice@student.edu` / `Student@123`
- **Steps**:
  1. **Student Dashboard**:
     - **Element to Point Out**:
       - Readiness Score: **72 / 100**
       - Exact Readiness Band: **Ready (>70)** in green badge.
       - Breakdown components: **Aptitude: 52/60** (Avg 86.67%), **Coding: 10/30** (5 distinct solved), **Profile: 10/10** (CGPA 9.1, Resume, Branch, Target Role).
  2. **Take Mock Test**: Navigate to `/tests`.
     - Action: Click **Start Test** on available Batch 2025 Placement Mock Test.
     - Point out: Server-synchronized countdown timer in sticky header.
     - Action: Use keyboard navigation (press `ArrowRight`/`ArrowLeft` to navigate, `A`/`B`/`C`/`D` to select options). Point out the distinct `✓ Selected` blue badge on chosen options.
     - Action: Click **Submit Test** -> Click **Yes, Submit** on confirmation dialog.
  3. **Result Page**:
     - Point out: Overall score, percentage, time elapsed, and comprehensive question-by-question review with detailed explanations.
  4. **Practice Mode**: Navigate to `/practice`.
     - Action: Select topic **Quantitative Aptitude**.
     - Point out: Immediate feedback per answer (`isCorrect`, explanations) without timer pressure.
  5. **Target Companies**: Navigate to `/companies`.
     - Point out: Eligibility tags: Alice meets 7.0+ CGPA and CSE branch requirements for Infosys, TCS, and Google.
     - Action: Click **Target Company** on Google. Point out target status updates immediately.
  6. **Logout**: Click **Logout**.

---

### 4. Student Walkthrough: Bob (1.5 Minutes)
- **URL**: `http://localhost:5173/login`
- **Credentials**: `bob@student.edu` / `Student@123`
- **Steps**:
  1. **Student Dashboard**:
     - Point out: Readiness Score: **54 / 100** -> Band: **Almost Ready (40-70)**.
     - Placement Status: **Placed** (Infosys).
  2. **Weak Topic & Rule-Based Recommendations**:
     - Navigate to `/analytics`.
     - Point out: **Weak Topic Detected**: **Verbal Ability** (30% accuracy with 10 answered questions).
     - Point out: Rule-based recommendation card: `"Improve: Verbal Ability - Your accuracy is 30%. Review concepts and practice more questions."` with direct CTA button **Practice Verbal Ability**.
     - Highlight: Deterministic rule-based algorithm (minimum sample $\ge 5$ questions, threshold $<60\%$), completely explainable without non-deterministic AI hallucinations.
  3. **Logout**: Click **Logout**.

---

### 5. Student Walkthrough: Carol (1 Minute)
- **URL**: `http://localhost:5173/login`
- **Credentials**: `carol@student.edu` / `Student@123`
- **Steps**:
  1. **Score Progress Trend**:
     - Navigate to `/analytics`.
     - Point out: Recharts progress line chart showing clear upward trend across 5 distinct mock tests:
       - Test 1: **40%** (6/15)
       - Test 2: **47%** (7/15)
       - Test 3: **53%** (8/15)
       - Test 4: **67%** (10/15)
       - Test 5: **73%** (11/15)
     - Explain: Student trajectory tracking assists placement officers in identifying improving students.
  2. **Logout**: Click **Logout**.

---

### 6. Student Walkthrough: Dave & Eve (Empty States) (1 Minute)
- **URL**: `http://localhost:5173/login`
- **Credentials**: `dave@student.edu` / `Student@123` and `eve@student.edu` / `Student@123`
- **Steps**:
  1. **Dave's State**:
     - Point out: Readiness Score: **5 / 100** (`Not Ready (<40)`).
     - Coding Problems: 1 Attempted, 0 Solved (attempted-but-unsolved tracking).
  2. **Eve's Clean Empty State**:
     - Log in as `eve@student.edu`.
     - Point out: Clean empty dashboard. Zero mock tests taken. Helpful CTA `"Complete Your Profile"` and `"Take a Mock Test to Assess Your Readiness"`.
     - Point out: Total absence of `NaN`, `undefined`, or broken chart axes.
  3. **Logout**: Click **Logout**.

---

### 7. Placement Officer (PO) Walkthrough (2 Minutes)
- **URL**: `http://localhost:5173/login`
- **Credentials**: `po@intelliplace.edu` / `Po@12345`
- **Steps**:
  1. **PO Summary Dashboard**:
     - Point out:
       - Total Students: 5
       - Readiness Breakdown: **Not Ready (<40): 2**, **Almost Ready (40-70): 2**, **Ready (>70): 1**.
       - Batch-wise and branch-wise readiness distribution.
  2. **Attention List**:
     - Point out: Top attention students requiring intervention sorted by lowest readiness: **Dave Brown (5)** and **Eve Davis (5)**.
  3. **Publish Placement Drive**:
     - Navigate to `/po/companies`.
     - Action: Click **Publish New Drive**. Enter Company Name, Cutoff CGPA: `7.5`, Eligible Branches: `CSE, IT`, Drive Date.
     - Point out: Automatic student eligibility calculation and notifications dispatched to eligible batches.
  4. **Student Export (Security Demo)**:
     - Navigate to `/po/students`.
     - Click **Export CSV**.
     - Explain security feature: CSV Export formula injection protection: any field starting with `=`, `+`, `-`, or `@` (e.g. `=HYPERLINK(...)`) is automatically prefixed with `'` to neutralize formula injection attacks in Microsoft Excel.
  5. **Logout**: Click **Logout**.

---

### 8. Code Runner Demo (1 Minute)
- *Note*: Executed on the presenter's laptop where `CODE_RUNNER_ENABLED=true` is activated in test mode.
- **Problem**: Array Element Sum / Move Zeroes.
- **Languages Supported**: Python 3 and JavaScript (Node.js).
- **Security & Sandboxing**:
  1. Non-zero exit code or syntax errors sanitize stack traces, replacing Windows/POSIX filesystem paths (`Users`, `AppData`, `tempDir`) with `<sandbox>`.
  2. Execution limits enforced: 2-second timeout, 64KB maximum code size, max 2 concurrent interpreter processes.

---

## 🛠 "If Something Breaks" Quick Fallbacks

1. **Backend port 4000 already in use**:
   ```powershell
   netstat -ano | findstr :4000
   taskkill /F /PID <PID>
   npm run dev
   ```
2. **Database needs clean reset**:
   ```powershell
   cd backend
   npm run demo:reset
   npm run db:counts
   ```
3. **Frontend not loading or cached**:
   - Hard refresh in browser: `Ctrl + F5` or `Cmd + Shift + R`.
   - Clear localStorage: Open DevTools Console and execute `localStorage.clear(); location.reload();`.

---

## 💡 Likely Panel Questions & Defensible Answers

### Q1: Why rule-based recommendations instead of generative AI / LLMs?
**Answer**:
1. **Explainability & Transparency**: In institutional placement training, faculty and placement officers must justify why a student was recommended a specific remedial path. Rule-based triggers provide deterministic, verifiable reasons (e.g., accuracy $<60\%$ with sample size $\ge 5$).
2. **Deterministic Reproducibility**: High-stakes academic tracking requires reproducible metrics. Two students with identical test attempts will receive consistently identical recommendations, eliminating hallucination risks.
3. **Data Privacy & Cost**: No student academic data or performance logs are transmitted to third-party proprietary APIs, eliminating recurring operational costs and FERPA/data protection compliance issues.

### Q2: How is the Placement Readiness Score computed?
**Answer**:
The readiness score is governed by a single source of truth (`calculateStudentReadiness` in `backend/src/services/readiness.ts`) consisting of three weighted components totaling 100 points:
1. **Aptitude Component (60 points max)**: $\text{Average Percentage across all submitted mock tests} \times 0.60$.
2. **Coding Component (30 points max)**: Proportional points calculated as $\frac{\text{Distinct Solved Problems}}{\text{Total Coding Problems in System}} \times 30$.
3. **Profile Completeness (10 points max)**:
   - Valid CGPA recorded: **+3 points**
   - Resume uploaded: **+3 points**
   - Academic Branch assigned: **+2 points**
   - Target Career Role specified: **+2 points**

**Composite Score**: $\text{round}(\text{Aptitude} + \text{Coding} + \text{Profile})$, bounded $[0, 100]$.
**Exact Bands**:
- `Not Ready (<40)`
- `Almost Ready (40-70)`
- `Ready (>70)`

### Q3: How is test timer enforcement handled server-side?
**Answer**:
The client-side timer is purely a visual affordance. Server-side enforcement operates as follows:
1. When a test attempt starts, the database records `startTime = now()`.
2. When any answer is saved (`PATCH /api/tests/attempts/:id/answer`) or submitted (`POST /api/tests/attempts/:id/submit`), the backend calculates:
   $$\text{elapsedSeconds} = \frac{\text{now}() - \text{startTime}}{1000}$$
3. If $\text{elapsedSeconds} > \text{durationMins} \times 60$, the server rejects the request with HTTP 400 Bad Request, updates the attempt status to `'expired'`, auto-grades existing answers, and finalizes the score. Tampering with client JavaScript or freezing browser tabs cannot circumvent the timer.

### Q4: What security safeguards protect the Code Runner?
**Answer**:
1. **Disabled in Production/Dev by Default**: The runner is controlled via `CODE_RUNNER_ENABLED=false` in `.env`.
2. **Rate Limiting**: Dedicated rate limiter restricts rapid code submissions (max 10 submissions per minute per IP/student).
3. **Resource Caps**: Maximum source code size of 64 KB; process execution capped with a hard 2000 ms timeout via `child_process.spawn`.
4. **Concurrency Throttling**: Semaphore limits execution to at most 2 concurrent interpreter processes simultaneously to prevent CPU exhaustion.
5. **Trace Sanitization**: Regex scrubbers strip local user directories, temp file paths, and environment usernames, replacing them with `<sandbox>`.

### Q5: How does personalization leverage the Knowledge Level?
**Answer**:
During onboarding, students designate their level (**Beginner**, **Intermediate**, **Advanced**).
- **Beginners** receive fundamental concept prompts, simplified diagnostic tests, and step-by-step arithmetic explanations.
- **Intermediate & Advanced** students receive higher difficulty weightings (40% medium, 20% hard), timed challenges, and algorithm optimization recommendations.

### Q6: What is the future scope of IntelliPlace?
**Answer**:
1. Containerized sandboxing using Docker/gVisor micro-VMs for multi-language execution (Java, C++, Rust, Go).
2. Automated resume parsing (PDF text extraction with NLP keyword matching against targeted company job descriptions).
3. Proctoring integrity features (tab-switch detection, webcam gaze tracking, and IP subnet locking for on-campus drives).
4. Direct calendar integration for scheduling on-campus interview slots with visiting company HR teams.
