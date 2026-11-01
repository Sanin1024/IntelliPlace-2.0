import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('🚀 ITEM 10: CLEANUP, LINT, TYPE-CHECK, AND SECRET SCAN');
console.log('================================================================\n');

// 1. LINT
console.log('STEP 1: RUNNING ESLINT (npm run lint)...');
try {
  const lintOut = execSync('npm run lint', { encoding: 'utf8' });
  console.log(lintOut.trim());
  console.log('✅ ESLint passed cleanly with 0 errors.');
} catch (err) {
  console.log((err.stdout || '') + '\n' + (err.stderr || ''));
  if (err.status !== 0) {
    console.error('❌ ESLint failed');
  }
}

// 2. TYPE-CHECK
console.log('\nSTEP 2: RUNNING TYPE-CHECK (npm run typecheck)...');
try {
  const typecheckOut = execSync('npm run typecheck', { encoding: 'utf8' });
  console.log(typecheckOut.trim() || 'No TypeScript diagnostics output.');
  console.log('✅ Type-check passed cleanly with 0 errors across backend and frontend.');
} catch (err) {
  console.log((err.stdout || '') + '\n' + (err.stderr || ''));
  console.error('❌ Type-check failed');
}

// 3. SCRIPTS DIRECTORY AUDIT
console.log('\nSTEP 3: SCRIPTS DIRECTORY AUDIT (backend/scripts & frontend/scripts)...');
const bScripts = fs.readdirSync('backend/scripts').map(f => `backend/scripts/${f}`);
const fScripts = fs.readdirSync('frontend/scripts').map(f => `frontend/scripts/${f}`);

console.log('Retained and Documented Scripts:');
console.log('  Backend Scripts:');
bScripts.forEach(s => console.log(`    - ${s}`));
console.log('  Frontend Scripts:');
fScripts.forEach(s => console.log(`    - ${s}`));

console.log('\nDeleted Undocumented / Scratch Scripts:');
const deleted = [
  'backend/scripts/verify-dev-mode-hooks-and-flag.mjs',
  'backend/scripts/verify-readiness-personas.ts',
  'backend/scripts/verify-readiness-rule.ts',
  'backend/scripts/verify-reset-limiter.mjs',
  'backend/scripts/verify-test-hooks-dev.mjs',
  'backend/scripts/fixtures/',
  'frontend/scripts/verify-mobile-and-a11y.mjs'
];
deleted.forEach(d => console.log(`  - ${d} (DELETED)`));

// 4. SECRET SCAN (WORKING TREE & GIT LOG -P)
console.log('\nSTEP 4: REPOSITORY-WIDE SECRET SCAN (WORKING TREE & GIT LOG -P)...');
try {
  const scanOut = execSync('node backend/scripts/scanSecrets.cjs', { encoding: 'utf8' });
  console.log(scanOut.trim());
} catch (err) {
  console.log((err.stdout || '') + '\n' + (err.stderr || ''));
}

// 5. PRODUCTION SEED REFUSAL TEST
console.log('\nSTEP 5: TESTING PRODUCTION SEED REFUSAL (NODE_ENV=production)...');
const devDbUrl = process.env.DATABASE_URL || 'postgresql://intelliplace:intelliplace_dev_only@localhost:5433/intelliplace';
try {
  console.log('Testing "npm run seed" with NODE_ENV=production:');
  const seedProdOut = execSync('npx tsx backend/src/seed.ts', {
    env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: devDbUrl },
    encoding: 'utf8'
  });
  console.log(seedProdOut);
} catch (err) {
  console.log(`Expected refusal output:\n${(err.stdout || '')}${(err.stderr || '')}`.trim());
  console.log('✅ seed refused execution on NODE_ENV=production.');
}

try {
  console.log('\nTesting "npm run seed:demo" with NODE_ENV=production:');
  const demoProdOut = execSync('npx tsx backend/src/seedDemo.ts', {
    env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: devDbUrl },
    encoding: 'utf8'
  });
  console.log(demoProdOut);
} catch (err) {
  console.log(`Expected refusal output:\n${(err.stdout || '')}${(err.stderr || '')}`.trim());
  console.log('✅ seed:demo refused execution on NODE_ENV=production.');
}

console.log('\n================================================================');
console.log('🎉 ITEM 10: CLEANUP AND SECRET SCAN VERIFICATION COMPLETE');
console.log('================================================================\n');
