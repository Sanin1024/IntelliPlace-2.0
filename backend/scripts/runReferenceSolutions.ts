process.env.CODE_RUNNER_ENABLED = 'true';
process.env.NODE_ENV = 'test';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { demoCodingProblems } from '../src/fixtures/demoProblems.js';
import { codeRunner } from '../src/services/codeRunner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAllReferenceSolutions() {
  console.log('================================================================');
  console.log('💻 REFERENCE SOLUTIONS RUNNER TABLE (10 PROBLEMS x 3 RUNS = 30)');
  console.log('   CODE_RUNNER_ENABLED=true (isolated test process only)');
  console.log('================================================================\n');

  const refPath = path.resolve(__dirname, 'fixtures', 'referenceSolutions.json');
  if (!fs.existsSync(refPath)) {
    throw new Error('referenceSolutions.json not found at ' + refPath);
  }
  const refSolutions = JSON.parse(fs.readFileSync(refPath, 'utf8'));

  console.log('| #  | Slug / Title               | Python Verdict | JS Verdict  | Wrong Verdict | Status |');
  console.log('|----|----------------------------|----------------|-------------|---------------|--------|');

  let allPass = true;
  let count = 0;

  for (let i = 0; i < demoCodingProblems.length; i++) {
    const prob = demoCodingProblems[i];
    const ref = refSolutions[prob.slug];
    if (!ref) {
      console.error(`Missing reference solutions for ${prob.slug}`);
      allPass = false;
      continue;
    }

    // Run Python solution
    const pyResult = await codeRunner.run('python', ref.python, prob.testCases);

    // Run JavaScript solution
    const jsResult = await codeRunner.run('javascript', ref.javascript, prob.testCases);

    // Run Wrong solution
    const wrongResult = await codeRunner.run('python', ref.wrong, prob.testCases);

    const pyVerdict = pyResult.verdict;
    const jsVerdict = jsResult.verdict;
    const wrongVerdict = wrongResult.verdict;

    const probPass =
      pyVerdict === 'Accepted' &&
      jsVerdict === 'Accepted' &&
      wrongVerdict === 'Wrong Answer';

    if (!probPass) allPass = false;
    count++;

    const statusStr = probPass ? 'PASS ✅' : 'FAIL ❌';
    console.log(
      `| ${(i + 1).toString().padEnd(2)} | ${prob.slug.padEnd(26)} | ${pyVerdict.padEnd(14)} | ${jsVerdict.padEnd(11)} | ${wrongVerdict.padEnd(13)} | ${statusStr} |`
    );
  }

  console.log('\n================================================================');
  if (allPass && count === 10) {
    console.log(`\x1b[32m✅ ALL 10 PROBLEMS VERIFIED WITH EXACT VERDICTS (30/30 runs passed)!\x1b[0m\n`);
    process.exit(0);
  } else {
    console.error(`\x1b[31m❌ REFERENCE SOLUTIONS FAILED!\x1b[0m\n`);
    process.exit(1);
  }
}

testAllReferenceSolutions().catch((e) => {
  console.error('Fatal error running reference solutions:', e);
  process.exit(1);
});
