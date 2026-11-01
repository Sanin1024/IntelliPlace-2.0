// Challenges 261–280: Frontend & User Experience Suite
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrcDir = path.resolve(__dirname, '../../frontend/src');

test('Frontend & UX: Challenges 261–280 Suite', async (t) => {

  // ============================================================
  // Challenge 261 & 271: useFetch Hook & Safe Data Unwrapping
  // ============================================================
  await t.test('Challenge 261/271/272: useFetch hook handles loading, error, and deduplication', () => {
    const useFetchPath = path.resolve(frontendSrcDir, 'hooks/useFetch.ts');
    assert.ok(fs.existsSync(useFetchPath), 'hooks/useFetch.ts must exist');

    const content = fs.readFileSync(useFetchPath, 'utf-8');
    assert.ok(content.includes('requestId'), 'Must maintain requestId ref for concurrent request deduplication');
    assert.ok(content.includes('refetch: fetchData') || content.includes('refetch'), 'Must expose refetch capability');
    assert.ok(content.includes('setIsLoading'), 'Must control loading state reliably');
    assert.ok(content.includes('response.data'), 'Must unwrap response data structure');
  });

  // ============================================================
  // Challenge 272 & 276: useDebounce Hook for High-Frequency Inputs
  // ============================================================
  await t.test('Challenge 272/276: useDebounce hook prevents excessive API calls', () => {
    const useDebouncePath = path.resolve(frontendSrcDir, 'hooks/useDebounce.ts');
    assert.ok(fs.existsSync(useDebouncePath), 'hooks/useDebounce.ts must exist');

    const content = fs.readFileSync(useDebouncePath, 'utf-8');
    assert.ok(content.includes('setTimeout'), 'Must throttle with setTimeout timer');
    assert.ok(content.includes('clearTimeout'), 'Must clean up timeout on unmount or value change');
    assert.ok(content.includes('delay: number = 300') || content.includes('delay = 300'), 'Must default to 300ms debounce');
  });

  // ============================================================
  // Challenge 271: LoadingSpinner Component & ARIA Accessibility
  // ============================================================
  await t.test('Challenge 271: LoadingSpinner contains accessible role="status" and animation', () => {
    const spinnerPath = path.resolve(frontendSrcDir, 'components/LoadingSpinner.tsx');
    assert.ok(fs.existsSync(spinnerPath), 'components/LoadingSpinner.tsx must exist');

    const content = fs.readFileSync(spinnerPath, 'utf-8');
    assert.ok(content.includes('role="status"'), 'Must have role="status" for screen readers');
    assert.ok(content.includes('aria-label="Loading"'), 'Must have aria-label="Loading"');
    assert.ok(content.includes('@keyframes spin'), 'Must provide CSS spinning keyframes');
  });

  // ============================================================
  // Challenge 279: EmptyState Component & Informative Fallbacks
  // ============================================================
  await t.test('Challenge 279: EmptyState component prevents blank screens and provides CTAs', () => {
    const emptyStatePath = path.resolve(frontendSrcDir, 'components/EmptyState.tsx');
    assert.ok(fs.existsSync(emptyStatePath), 'components/EmptyState.tsx must exist');

    const content = fs.readFileSync(emptyStatePath, 'utf-8');
    assert.ok(content.includes('interface EmptyStateProps'), 'Must declare typed props');
    assert.ok(content.includes('action?: ReactNode'), 'Must support optional action button/CTA');
    assert.ok(content.includes('aria-hidden="true"'), 'Must mark decorative icon aria-hidden');
  });

  // ============================================================
  // Challenge 261: ErrorBoundary Component
  // ============================================================
  await t.test('Challenge 261: ErrorBoundary catches UI crashes and offers page reload', () => {
    const errorBoundaryPath = path.resolve(frontendSrcDir, 'components/common/ErrorBoundary.tsx');
    assert.ok(fs.existsSync(errorBoundaryPath), 'components/common/ErrorBoundary.tsx must exist');

    const content = fs.readFileSync(errorBoundaryPath, 'utf-8');
    assert.ok(content.includes('getDerivedStateFromError'), 'Must implement getDerivedStateFromError');
    assert.ok(content.includes('componentDidCatch'), 'Must log caught error in componentDidCatch');
    assert.ok(content.includes('Reload Page') || content.includes('window.location.reload'), 'Must provide reload action');
  });

  // ============================================================
  // Challenge 264 & 265: ProtectedRoute & Role-Based Redirection
  // ============================================================
  await t.test('Challenge 264/265: ProtectedRoute guards unauthenticated and unauthorized access', () => {
    const protectedRoutePath = path.resolve(frontendSrcDir, 'components/ProtectedRoute.tsx');
    assert.ok(fs.existsSync(protectedRoutePath), 'components/ProtectedRoute.tsx must exist');

    const content = fs.readFileSync(protectedRoutePath, 'utf-8');
    assert.ok(content.includes('to="/login"'), 'Unauthenticated users must be redirected to /login');
    assert.ok(content.includes('state={{ from: location }}'), 'Must preserve redirect path in state.from');
    assert.ok(content.includes('to="/unauthorized"'), 'Unauthorized roles must be redirected to /unauthorized');
  });

  // ============================================================
  // Challenge 268 & 269: Responsive Navigation & Mobile Drawer
  // ============================================================
  await t.test('Challenge 268/269/280: AppLayout includes mobile drawer, hamburger toggle, and ARIA labels', () => {
    const layoutPath = path.resolve(frontendSrcDir, 'layouts/AppLayout.tsx');
    assert.ok(fs.existsSync(layoutPath), 'layouts/AppLayout.tsx must exist');

    const content = fs.readFileSync(layoutPath, 'utf-8');
    assert.ok(content.includes('isMobileMenuOpen'), 'Must track mobile menu state');
    assert.ok(content.includes('mobileOverlay'), 'Must provide mobile backdrop overlay');
    assert.ok(content.includes('aria-label="Main navigation"'), 'Must contain aria-label for navigation');
    assert.ok(content.includes('@media (max-width: 768px)'), 'Must include mobile responsive media query');
  });

  // ============================================================
  // Challenge 274: 404 & Unauthorized Routes in App.tsx
  // ============================================================
  await t.test('Challenge 274: App.tsx mounts ErrorBoundary, /unauthorized, and wildcard 404 route', () => {
    const appPath = path.resolve(frontendSrcDir, 'App.tsx');
    assert.ok(fs.existsSync(appPath), 'App.tsx must exist');

    const content = fs.readFileSync(appPath, 'utf-8');
    assert.ok(content.includes('<ErrorBoundary>'), 'App must be wrapped in ErrorBoundary');
    assert.ok(content.includes('path="/unauthorized"'), 'Must mount /unauthorized route');
    assert.ok(content.includes('path="*" element={<NotFoundPage />}'), 'Must mount wildcard 404 route');
  });
});

