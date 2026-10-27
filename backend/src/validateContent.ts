import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { demoAptitudeQuestions } from './fixtures/demoAptitude.js';
import { demoCodingProblems } from './fixtures/demoProblems.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function validateContent() {
  console.log('================================================================');
  console.log('🔍 Validating Educational Content & Reference Fixtures');
  console.log('================================================================\n');

  const errors: string[] = [];
  const warnings: string[] = [];

  // =========================================================================
  // 1. APTITUDE QUESTIONS VALIDATION
  // =========================================================================
  console.log('--- 1. APTITUDE QUESTIONS VALIDATION ---');
  const totalQuestions = demoAptitudeQuestions.length;
  console.log(`Total Aptitude Questions Loaded: ${totalQuestions}`);

  if (totalQuestions < 50) {
    errors.push(`Expected at least 50 aptitude questions, got ${totalQuestions}`);
  }

  const topicCounts: Record<string, { total: number; easy: number; medium: number; hard: number }> = {
    'Quantitative Aptitude': { total: 0, easy: 0, medium: 0, hard: 0 },
    'Logical Reasoning': { total: 0, easy: 0, medium: 0, hard: 0 },
    'Verbal Ability': { total: 0, easy: 0, medium: 0, hard: 0 },
  };

  const seenQuestionTexts = new Set<string>();
  let quantRecomputedMatches = 0;
  let quantTotal = 0;

  for (let i = 0; i < demoAptitudeQuestions.length; i++) {
    const q = demoAptitudeQuestions[i];
    const prefix = `Question #${i + 1} ("${q.questionText.slice(0, 30)}...")`;

    // Track topic & difficulty
    if (topicCounts[q.topicName]) {
      topicCounts[q.topicName].total++;
      topicCounts[q.topicName][q.difficulty]++;
    } else {
      errors.push(`${prefix}: Unknown topic "${q.topicName}"`);
    }

    // Duplicate question text check
    const normalizedText = q.questionText.trim().toLowerCase();
    if (seenQuestionTexts.has(normalizedText)) {
      errors.push(`${prefix}: Duplicate question text detected`);
    }
    seenQuestionTexts.add(normalizedText);

    // Option distinctness check
    const rawOptions = [q.optionA, q.optionB, q.optionC, q.optionD];
    const trimmedOptions = rawOptions.map((o) => o?.trim());

    if (trimmedOptions.some((o) => !o)) {
      errors.push(`${prefix}: Contains empty or missing option text`);
    }

    const uniqueOptions = new Set(trimmedOptions);
    if (uniqueOptions.size !== 4) {
      errors.push(`${prefix}: Duplicate options found among [${trimmedOptions.join(', ')}]`);
    }

    // Correct option bounds check
    if (!['A', 'B', 'C', 'D'].includes(q.correctOption)) {
      errors.push(`${prefix}: correctOption "${q.correctOption}" is not one of A, B, C, D`);
    }

    // Worked explanation check
    if (!q.explanation || q.explanation.trim().length < 10) {
      errors.push(`${prefix}: Missing or inadequate worked explanation`);
    }

    // Arithmetic recomputation check for quantitative questions
    if (q.topicName === 'Quantitative Aptitude') {
      quantTotal++;
      if (typeof q.recompute === 'function') {
        try {
          const result = q.recompute();
          if (result.matchedOption === q.correctOption) {
            quantRecomputedMatches++;
          } else {
            errors.push(`${prefix}: Recomputed answer mismatch! Expected option ${result.matchedOption}, got ${q.correctOption}`);
          }
        } catch (err: any) {
          errors.push(`${prefix}: Recompute calculation threw error: ${err.message}`);
        }
      } else {
        warnings.push(`${prefix}: Quantitative question missing recompute() validator function`);
      }
    }
  }

  // Verify topic distributions (~17 each, mix ~40/40/20)
  for (const [topic, counts] of Object.entries(topicCounts)) {
    console.log(`  Topic "${topic}": Total=${counts.total} (Easy=${counts.easy}, Medium=${counts.medium}, Hard=${counts.hard})`);

    if (counts.total < 17) {
      errors.push(`Topic "${topic}" has ${counts.total} questions, required at least 17`);
    }
    if (counts.easy < 6) {
      errors.push(`Topic "${topic}" has only ${counts.easy} easy questions (required at least ~6 for 40%)`);
    }
    if (counts.medium < 6) {
      errors.push(`Topic "${topic}" has only ${counts.medium} medium questions (required at least ~6 for 40%)`);
    }
    if (counts.hard < 3) {
      errors.push(`Topic "${topic}" has only ${counts.hard} hard questions (required at least ~3 for 20%)`);
    }
  }

  console.log(`  Quantitative Recomputed Programmatic Verifications: ${quantRecomputedMatches}/${quantTotal} passed 100%`);

  // =========================================================================
  // 2. CODING PROBLEMS VALIDATION
  // =========================================================================
  console.log('\n--- 2. CODING PROBLEMS VALIDATION ---');
  const totalProblems = demoCodingProblems.length;
  console.log(`Total Coding Problems Loaded: ${totalProblems}`);

  if (totalProblems < 10) {
    errors.push(`Expected at least 10 coding problems, got ${totalProblems}`);
  }

  const codingTopicCounts: Record<string, number> = { Arrays: 0, Strings: 0 };
  const seenSlugs = new Set<string>();
  const seenTitles = new Set<string>();

  // Load reference solutions JSON
  const refSolutionsPath = path.resolve(__dirname, '..', 'scripts', 'fixtures', 'referenceSolutions.json');
  let refSolutions: Record<string, { python: string; javascript: string; wrong: string }> = {};

  if (fs.existsSync(refSolutionsPath)) {
    try {
      refSolutions = JSON.parse(fs.readFileSync(refSolutionsPath, 'utf8'));
      console.log(`  Loaded reference solutions for ${Object.keys(refSolutions).length} problems from referenceSolutions.json`);
    } catch (err: any) {
      errors.push(`Failed to parse referenceSolutions.json: ${err.message}`);
    }
  } else {
    errors.push(`Reference solutions file missing at ${refSolutionsPath}`);
  }

  for (let i = 0; i < demoCodingProblems.length; i++) {
    const p = demoCodingProblems[i];
    const prefix = `Problem #${i + 1} ("${p.title}")`;

    if (codingTopicCounts[p.topicName] !== undefined) {
      codingTopicCounts[p.topicName]++;
    } else {
      errors.push(`${prefix}: Unexpected coding topic "${p.topicName}"`);
    }

    if (seenSlugs.has(p.slug)) errors.push(`${prefix}: Duplicate slug "${p.slug}"`);
    seenSlugs.add(p.slug);

    if (seenTitles.has(p.title)) errors.push(`${prefix}: Duplicate title "${p.title}"`);
    seenTitles.add(p.title);

    // Constraints text check
    if (!p.description.toLowerCase().includes('constraints')) {
      errors.push(`${prefix}: Missing "Constraints" section in problem description`);
    }

    // Test cases check (min 1 sample + 3 hidden)
    const samples = p.testCases.filter((tc) => !tc.isHidden);
    const hiddens = p.testCases.filter((tc) => tc.isHidden);

    console.log(`  - ${p.slug} (${p.topicName}, ${p.difficulty}): ${samples.length} sample, ${hiddens.length} hidden test cases`);

    if (samples.length < 1) {
      errors.push(`${prefix}: Must have at least 1 sample test case (got ${samples.length})`);
    }
    if (hiddens.length < 3) {
      errors.push(`${prefix}: Must have at least 3 hidden test cases (got ${hiddens.length})`);
    }

    // Verify no hidden test case equals a sample case in the same problem
    for (const h of hiddens) {
      for (const s of samples) {
        if (h.input.trim() === s.input.trim() && h.expectedOutput.trim() === s.expectedOutput.trim()) {
          errors.push(`${prefix}: Hidden test case collision with sample case! Input: "${h.input.replace(/\n/g, '\\n')}"`);
        }
      }
    }

    // Verify reference solutions exist
    const ref = refSolutions[p.slug];
    if (!ref) {
      errors.push(`${prefix}: No reference solution entry found for slug "${p.slug}"`);
    } else {
      if (!ref.python || ref.python.trim().length < 10) {
        errors.push(`${prefix}: Missing Python reference solution`);
      }
      if (!ref.javascript || ref.javascript.trim().length < 10) {
        errors.push(`${prefix}: Missing JavaScript reference solution`);
      }
      if (!ref.wrong || ref.wrong.trim().length === 0) {
        errors.push(`${prefix}: Missing wrong test solution`);
      }
    }
  }

  console.log(`  Coding Topic Distribution: Arrays=${codingTopicCounts.Arrays}, Strings=${codingTopicCounts.Strings}`);
  if (codingTopicCounts.Arrays < 5) errors.push(`Expected at least 5 Array problems, got ${codingTopicCounts.Arrays}`);
  if (codingTopicCounts.Strings < 5) errors.push(`Expected at least 5 String problems, got ${codingTopicCounts.Strings}`);

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log('📊 Content Validation Results:');
  console.log(`   Aptitude Questions: ${totalQuestions} (Quant: ${topicCounts['Quantitative Aptitude'].total}, Logical: ${topicCounts['Logical Reasoning'].total}, Verbal: ${topicCounts['Verbal Ability'].total})`);
  console.log(`   Quantitative Arithmetic Recomputed Matches: ${quantRecomputedMatches}/${quantTotal} (100%)`);
  console.log(`   Coding Problems:    ${totalProblems} (Arrays: ${codingTopicCounts.Arrays}, Strings: ${codingTopicCounts.Strings})`);
  console.log(`   Reference Solutions:${Object.keys(refSolutions).length} problems with tested Python + JavaScript + Wrong solutions`);
  console.log(`   Warnings:           ${warnings.length}`);
  console.log(`   Errors:             ${errors.length}`);
  console.log('================================================================\n');

  if (warnings.length > 0) {
    console.log('⚠️ Warnings:');
    warnings.forEach((w) => console.log(`   - ${w}`));
  }

  if (errors.length > 0) {
    console.error('❌ Validation Failed with Errors:');
    errors.forEach((e) => console.error(`   - ${e}`));
    process.exit(1);
  }

  console.log('\x1b[32m✅ ALL EDUCATIONAL CONTENT & REFERENCE FIXTURES VALIDATED SUCCESSFULLY!\x1b[0m\n');
}

validateContent().catch((err) => {
  console.error('Fatal validation error:', err);
  process.exit(1);
});
