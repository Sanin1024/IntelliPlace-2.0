process.env.CODE_RUNNER_ENABLED = 'true';
process.env.NODE_ENV = 'test';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from '../src/config/prisma.js';
import { codeRunner } from '../src/services/codeRunner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAllReferenceSolutions() {
  console.log('================================================================');
  console.log('💻 REAL DATABASE REFERENCE SOLUTIONS & CODE RUNNER VERIFICATION');
  console.log('   Process Environment: CODE_RUNNER_ENABLED=true, NODE_ENV=test');
  console.log('================================================================\n');

  // 1. Read problem titles and test cases directly from the DATABASE
  const allDbProblems = await prisma.codingProblem.findMany({
    include: {
      testCases: {
        select: {
          id: true,
          input: true,
          expectedOutput: true,
          isHidden: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('1. DATABASE CODING PROBLEM TITLE LIST (Queried from PostgreSQL):');
  console.log('----------------------------------------------------------------');
  allDbProblems.forEach((p, idx) => {
    console.log(`  ${(idx + 1).toString().padStart(2)}. Title: "${p.title}" | TestCases: ${p.testCases.length}`);
  });
  console.log('----------------------------------------------------------------\n');

  const refPath = path.resolve(__dirname, 'fixtures', 'referenceSolutions.json');
  if (!fs.existsSync(refPath)) {
    throw new Error('referenceSolutions.json not found at ' + refPath);
  }
  const refSolutions = JSON.parse(fs.readFileSync(refPath, 'utf8'));

  // Mapping from DB title to slug in referenceSolutions.json
  const titleToSlugMap: Record<string, string> = {
    'Array Element Sum': 'array-sum',
    'Find Maximum in Array': 'find-maximum',
    'Second Largest Element': 'second-largest',
    'Move Zeroes to End': 'move-zeroes',
    'Check Array Duplicates': 'contains-duplicate',
    'Reverse a String': 'reverse-string',
    'Valid Palindrome': 'is-palindrome',
    'Count Vowels and Consonants': 'count-vowels',
    'Check Valid Anagram': 'check-anagram',
    'First Non-Repeating Character': 'first-non-repeating',
  };

  const demoProblems = allDbProblems.filter((p) => titleToSlugMap[p.title]);
  console.log(`Matched ${demoProblems.length} demo coding problems from DB with reference solutions.\n`);

  console.log('2. REFERENCE SOLUTIONS RUNNER EXECUTION TABLE:');
  console.log('| Problem Title                   | Language   | Verdict       | Measured Time | Expected Verdict | Match |');
  console.log('|---------------------------------|------------|---------------|---------------|------------------|-------|');

  let allPass = true;
  let totalRuns = 0;

  for (const prob of demoProblems) {
    const slug = titleToSlugMap[prob.title];
    const ref = refSolutions[slug];
    if (!ref) {
      console.error(`Missing reference solution for ${prob.title} (${slug})`);
      allPass = false;
      continue;
    }

    const testCases = prob.testCases.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: tc.isHidden,
    }));

    // 1. Python solution
    const t0Py = Date.now();
    const pyResult = await codeRunner.run('python', ref.python, testCases);
    const timePy = Date.now() - t0Py;
    const pyPass = pyResult.verdict === 'Accepted';
    if (!pyPass) allPass = false;
    totalRuns++;
    console.log(
      `| ${prob.title.padEnd(31)} | ${'Python'.padEnd(10)} | ${pyResult.verdict.padEnd(13)} | ${(timePy + 'ms').padEnd(13)} | ${'Accepted'.padEnd(16)} | ${pyPass ? 'PASS ✅' : 'FAIL ❌'} |`
    );

    // 2. JavaScript solution
    const t0Js = Date.now();
    const jsResult = await codeRunner.run('javascript', ref.javascript, testCases);
    const timeJs = Date.now() - t0Js;
    const jsPass = jsResult.verdict === 'Accepted';
    if (!jsPass) allPass = false;
    totalRuns++;
    console.log(
      `| ${prob.title.padEnd(31)} | ${'JavaScript'.padEnd(10)} | ${jsResult.verdict.padEnd(13)} | ${(timeJs + 'ms').padEnd(13)} | ${'Accepted'.padEnd(16)} | ${jsPass ? 'PASS ✅' : 'FAIL ❌'} |`
    );

    // 3. Deliberate Wrong solution
    const t0Wrong = Date.now();
    const wrongResult = await codeRunner.run('python', ref.wrong, testCases);
    const timeWrong = Date.now() - t0Wrong;
    const wrongPass = wrongResult.verdict === 'Wrong Answer';
    if (!wrongPass) allPass = false;
    totalRuns++;
    console.log(
      `| ${prob.title.padEnd(31)} | ${'Wrong (Py)'.padEnd(10)} | ${wrongResult.verdict.padEnd(13)} | ${(timeWrong + 'ms').padEnd(13)} | ${'Wrong Answer'.padEnd(16)} | ${wrongPass ? 'PASS ✅' : 'FAIL ❌'} |`
    );
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: Total Runs = ${totalRuns} (30 runs across 10 problems)`);
  console.log(`ALL VERDICTS MATCH EXPECTED: ${allPass ? 'YES (30/30 PASS ✅)' : 'NO ❌'}`);
  console.log('================================================================\n');

  await prisma.$disconnect();

  if (allPass && totalRuns === 30) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testAllReferenceSolutions().catch((e) => {
  console.error('Fatal error running reference solutions:', e);
  process.exit(1);
});
