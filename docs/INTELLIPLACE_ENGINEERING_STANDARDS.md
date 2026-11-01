# IntelliPlace Engineering Standards

This document defines the engineering standards for IntelliPlace, synthesized from the provided resource catalog. All development must adhere to these principles to ensure maintainability, security, and high-quality user experience.

## 1. Frontend Standards (React + Vite + TypeScript)

### Architecture & Components
- **Function Components Only:** Use functional components with Hooks. No class components.
- **TypeScript Strict Mode:** All props, state, and API responses must be strictly typed. Avoid `any`.
- **Reusable Components:** Extract UI elements (Buttons, Inputs, Cards) into `src/components`. Do not duplicate inline styles when a shared component exists.
- **API Layer:** All backend calls must go through the `src/api/client.ts` Axios instance. Do not use `fetch` directly in components.

### UI/UX & Design System
- **CSS Variables:** Use the CSS variables defined in `src/index.css` (`--color-primary`, `--shadow-md`, etc.) for consistency.
- **Responsive Design:** Use CSS Grid and Flexbox. Mobile layouts must use drawer menus and stacked grids. Do not just shrink desktop layouts.
- **States:** Every asynchronous view must handle Loading (`<LoadingSpinner />`), Empty (`<EmptyState />`), and Error states gracefully.
- **Worst-Case Data:** Tables and text containers must use `text-overflow: ellipsis` to handle long names/emails without breaking layout (`break-ui` principle).

### Accessibility
- **Semantic HTML:** Use `<table>`, `<thead>`, `<nav>`, `<main>`, `<button>` appropriately.
- **ARIA:** Add `aria-live="polite"` to toasts, `aria-label` to icon-only buttons, and `role="status"` to loaders.
- **Keyboard Navigation:** Ensure all interactive elements are accessible via Tab and Enter.

## 2. Backend Standards (Node.js + Express + Prisma)

### API Design & Validation
- **Standardized Responses:** All success responses must be `{ success: true, data: any, meta?: any }`. All errors must be `{ success: false, error: string }`.
- **Zod Validation:** Every POST/PUT/PATCH route must have a Zod validation schema applied via `validate()` middleware. Never trust `req.body` directly.
- **RBAC:** Every protected route must use `requireAuth`. Sensitive routes must use `requireRole('admin', 'po', etc.)`.

### Database (Prisma & PostgreSQL)
- **Transactions:** Multi-table updates (e.g., applying for a drive, submitting a test) must use `prisma.$transaction` to ensure atomicity.
- **N+1 Prevention:** Never query inside a loop. Use `findMany` with `in: [ids]` and map results in memory.
- **Indexing:** Ensure foreign keys and frequently queried fields (e.g., `status`, `studentId`) have `@@index` defined in the Prisma schema.
- **Soft Deletes:** Use `deletedAt` timestamps for Users, Companies, and Drives. Never hard-delete records that affect placement history or audit logs.

### Error Handling & Security
- **Centralized Handler:** All async routes must be wrapped in `asyncHandler`. Errors must be forwarded to `next(err)`.
- **Prisma Errors:** Handle `P2002` (Unique Constraint) as 409 Conflict, `P2025` (Not Found) as 404, and `P2034` (Deadlock) with retry logic.
- **Rate Limiting:** Auth routes (`/login`, `/register`) must use `express-rate-limit`.
- **File Uploads:** Use `multer` with memory storage for small files, disk storage for large files. Validate MIME types and magic bytes, not just extensions.

## 3. Security & Privacy Standards

- **Authentication:** JWT with `tokenVersion` for instant session revocation. Passwords hashed with `bcrypt` (10 salt rounds).
- **IDOR Prevention:** Always verify ownership (`req.user.id === resource.userId`) before returning or updating data.
- **Data Minimization:** API responses must use Prisma `select` to exclude sensitive fields (e.g., `passwordHash`, `internalNotes`) unless explicitly required.
- **Audit Logging:** All sensitive administrative actions (role changes, status updates, drive publication) must call `audit()`.

## 4. Testing Standards

- **Backend:** Jest + Supertest. Tests must clean up `e2e-` prefixed data in `afterAll`.
- **Frontend:** Vitest + React Testing Library for component logic. Playwright for E2E workflows (login, apply for drive).
- **Coverage:** Target 60% global coverage, with 70%+ on services and controllers.

