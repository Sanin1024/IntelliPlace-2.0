import fs from 'fs';

// Read file handling UTF-16LE BOM from PowerShell Tee-Object
const buffer = fs.readFileSync('verification/2-fresh-raw-runs.log');
const encoding = (buffer[0] === 0xff && buffer[1] === 0xfe) ? 'utf16le' : 'utf8';
let rawText = fs.readFileSync('verification/2-fresh-raw-runs.log', encoding);

// Strip ANSI color codes
const cleanText = rawText.replace(/\u001b\[[0-9;]*m/g, '');

const requiredBehaviors = [
  { behavior: 'register role forcing', checkName: 'Reg-RegisterRoleForcing' },
  { behavior: 'disabled user', checkName: 'Reg-DisabledUser' },
  { behavior: 'ownership on every :id route', checkName: 'Reg-Ownership' },
  { behavior: 'answer-key leak scan', checkName: 'Reg-AnswerKeyLeak' },
  { behavior: 'hidden-case leak scan', checkName: 'Reg-HiddenCaseLeak' },
  { behavior: 'timer expiry (save and submit)', checkName: 'Reg-TimerExpiry' },
  { behavior: 'past and future test windows', checkName: 'Reg-PastFutureWindows' },
  { behavior: 'max attempts', checkName: 'Reg-MaxAttempts' },
  { behavior: 'batch isolation', checkName: 'Reg-BatchIsolation' },
  { behavior: 'double submit', checkName: 'Reg-DoubleSubmit' },
  { behavior: 'practice mode', checkName: 'Reg-PracticeMode' },
  { behavior: 'weak-topic minimum sample', checkName: 'Reg-WeakTopicMinSample' },
  { behavior: 'eligibility (three cases)', checkName: 'Reg-Eligibility' },
  { behavior: 'notifications', checkName: 'Reg-Notifications' },
  { behavior: 'trainer ownership on tests and resources', checkName: 'Reg-TrainerOwnership' },
  { behavior: '.exe upload rejection', checkName: 'Reg-ExeUpload' },
  { behavior: 'secure download and traversal', checkName: 'Reg-SecureDownloadTraversal' },
  { behavior: 'CSV injection and filters', checkName: 'Reg-CsvInjectionFilters' },
  { behavior: 'trainer/summary and po/summary role guards', checkName: 'Reg-RoleGuards' },
  { behavior: 'login rate limit (11th request returns 429)', checkName: 'Reg-LoginRateLimit' },
  { behavior: 'submit rate limit', checkName: 'Reg-SubmitRateLimit' },
  { behavior: 'oversized source', checkName: 'Reg-OversizedSource' },
  { behavior: 'bad language', checkName: 'Reg-BadLanguage' },
  { behavior: 'concurrency peak', checkName: 'Reg-ConcurrencyPeak' },
  { behavior: 'code runner test (a) - Python Accepted', checkName: 'Reg-CodeRunner-A-PyAccepted' },
  { behavior: 'code runner test (b) - JS Accepted', checkName: 'Reg-CodeRunner-B-JsAccepted' },
  { behavior: 'code runner test (c) - Wrong Answer', checkName: 'Reg-CodeRunner-C-PyWrongAnswer' },
  { behavior: 'code runner test (d) - Syntax Error & Sanitization', checkName: 'Reg-CodeRunner-D-SyntaxError' },
  { behavior: 'code runner test (e) - Time Limit Exceeded', checkName: 'Reg-CodeRunner-E-TimeLimit' },
  { behavior: 'code runner test (f) - Output Limit Exceeded', checkName: 'Reg-CodeRunner-F-OutputLimit' },
  { behavior: 'code runner test (g) - Non-Zero Exit Code', checkName: 'Reg-CodeRunner-G-NonZeroExit' },
  { behavior: 'code runner test (h) - Exception Raised', checkName: 'Reg-CodeRunner-H-ExceptionRaised' },
  { behavior: 'code runner test (i) - Empty Input Handling', checkName: 'Reg-CodeRunner-I-EmptyInput' },
  { behavior: 'code runner test (j) - Multi-Line Input', checkName: 'Reg-CodeRunner-J-MultiLineInput' },
  { behavior: 'code runner test (k) - Environment Stripping', checkName: 'Reg-CodeRunner-K-EnvStripped' },
  { behavior: 'code runner test (l) - Temp Directory Cleanup', checkName: 'Reg-CodeRunner-L-TempDirCleanup' },
  { behavior: 'code runner test (m) - Concurrency Limiter', checkName: 'Reg-CodeRunner-M-ConcurrencyLimiter' },
];

console.log('========================================================================================================');
console.log('E2E TEST RUNNER COVERAGE MATRIX (ITEM 3)');
console.log('========================================================================================================\n');

let table = '| # | Required Behavior | Exact Runner Check Name | Runner Verdict | Evidence / Snippet |\n';
table += '|---|-------------------|-------------------------|----------------|--------------------|\n';

let allPassed = true;
requiredBehaviors.forEach((row, i) => {
  const regex = new RegExp(`\\[(PASS|FAIL)\\]\\s+${row.checkName}:\\s+([^|\\r\\n]+)\\|?\\s*([^\\r\\n]*)`);
  const match = cleanText.match(regex);
  const verdict = match ? match[1] : 'NOT FOUND';
  const detail = match ? (match[3] || match[2]).trim().slice(0, 65) : 'Check missing from log';
  if (verdict !== 'PASS') allPassed = false;
  table += `| ${i + 1} | ${row.behavior} | \`${row.checkName}\` | ${verdict === 'PASS' ? 'PASS ✅' : 'FAIL ❌'} | ${detail} |\n`;
});

console.log(table);
console.log(`\nAll ${requiredBehaviors.length} required behaviors verified in runner output: ${allPassed ? 'YES (100% PASS)' : 'NO'}`);

fs.writeFileSync('verification/3-e2e-matrix.log', table + `\nAll ${requiredBehaviors.length} required behaviors verified in runner output: ${allPassed ? 'YES (100% PASS)' : 'NO'}\n`, 'utf8');
