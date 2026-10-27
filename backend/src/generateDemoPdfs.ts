import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

interface PdfMetadata {
  filename: string;
  title: string;
  subtitle: string;
  topicName: string;
  sections: Array<{ heading: string; bullets: string[] }>;
}

const pdfDefinitions: PdfMetadata[] = [
  {
    filename: 'quant_mastery_guide.pdf',
    title: 'Quantitative Aptitude Quick Reference',
    subtitle: 'Essential placement arithmetic, algebra, and commercial mathematics formulas',
    topicName: 'Quantitative Aptitude',
    sections: [
      {
        heading: '1. Speed, Distance & Time',
        bullets: [
          'Speed = Distance / Time (convert km/h to m/s by multiplying with 5/18).',
          'Average Speed for equal distance covered at speeds x and y = 2xy / (x + y).',
          'Relative Speed: same direction = (u - v); opposite directions = (u + v).',
          'Boats & Streams: Downstream speed = u + v; Upstream speed = u - v.',
        ],
      },
      {
        heading: '2. Commercial Mathematics & Profit/Loss',
        bullets: [
          'Profit % = (Profit / Cost Price) * 100.',
          'Simple Interest = (Principal * Rate * Time) / 100.',
          'Compound Interest Amount = Principal * (1 + Rate/100)^Time.',
          'Discounted Price = Marked Price * (1 - Discount/100).',
        ],
      },
      {
        heading: '3. Work & Pipes Calculation',
        bullets: [
          'If A takes x days and B takes y days, together they take (x * y) / (x + y) days.',
          'Efficiency is inversely proportional to time taken.',
          'Filling and emptying pipes: Net Rate = 1/T_in - 1/T_out.',
        ],
      },
    ],
  },
  {
    filename: 'logical_reasoning_cheatsheet.pdf',
    title: 'Logical Reasoning & Deduction Cheatsheet',
    subtitle: 'Systematic approaches for placement aptitude reasoning assessments',
    topicName: 'Logical Reasoning',
    sections: [
      {
        heading: '1. Syllogisms & Venn Logic',
        bullets: [
          'Universal Affirmative: "All A are B" implies "Some B are A".',
          'Universal Negative: "No A is B" implies "No B is A" and "Some A are not B".',
          'Always construct minimal-overlap Venn diagrams before verifying conclusions.',
        ],
      },
      {
        heading: '2. Seating Arrangements & Order',
        bullets: [
          'Circular tables facing center: Left moves clockwise; Right moves counter-clockwise.',
          'Linear rows facing North: Left is West; Right is East.',
          'Mark definite positions first before testing conditional branches.',
        ],
      },
      {
        heading: '3. Blood Relations & Direction Sense',
        bullets: [
          'Break complex generational descriptions from the end ("son of the only son...").',
          'Direction checks: 4 cardinal directions (N, S, E, W) and 4 diagonals (NE, NW, SE, SW).',
          'Turning right = 90 degrees clockwise; turning left = 90 degrees counter-clockwise.',
        ],
      },
    ],
  },
  {
    filename: 'verbal_ability_prep.pdf',
    title: 'Verbal Ability & Grammar Essentials',
    subtitle: 'Rules for corporate verbal screening tests and placement comprehension',
    topicName: 'Verbal Ability',
    sections: [
      {
        heading: '1. Subject-Verb Agreement',
        bullets: [
          '"Neither... nor" and "Either... or": verb agrees with the nearest subject.',
          'Indefinite pronouns ("Each", "Every", "Neither", "Everyone") take singular verbs.',
          'Phrases like "along with", "as well as" do not alter the number of the main subject.',
        ],
      },
      {
        heading: '2. Prepositions & Time Usage',
        bullets: [
          'Use "since" for specific point in time (since 2020, since morning).',
          'Use "for" for duration of time (for 3 hours, for 6 months).',
          'Common errors: "comprise of" is invalid (use "comprise" or "consist of").',
        ],
      },
      {
        heading: '3. Conditional Sentences',
        bullets: [
          'Zero conditional: If water reaches 100 degrees, it boils (scientific fact).',
          'First conditional: If it rains, we will cancel the drive (real possibility).',
          'Third conditional (past hypothetical): If she had known, she would have applied.',
        ],
      },
    ],
  },
  {
    filename: 'array_algorithms_handbook.pdf',
    title: 'Arrays & Two-Pointers Algorithm Handbook',
    subtitle: 'Core patterns for coding rounds: two pointers, prefix sums, and sorting',
    topicName: 'Arrays',
    sections: [
      {
        heading: '1. Two-Pointer Technique',
        bullets: [
          'Opposite-direction pointers for sorted arrays (e.g. Two-Sum in O(N)).',
          'Same-direction pointers for partitioning and in-place removal (Move Zeroes).',
          'Dutch National Flag algorithm for 3-way partition in O(N) time and O(1) space.',
        ],
      },
      {
        heading: '2. Prefix Sums & Sliding Window',
        bullets: [
          'Prefix array enables O(1) range sum queries: sum(L, R) = prefix[R] - prefix[L - 1].',
          'Fixed sliding window for maximum subarray sum of length K.',
          'Dynamic sliding window for longest subarray meeting constraint with hash map.',
        ],
      },
      {
        heading: '3. Space and Time Complexity Rules',
        bullets: [
          'N <= 10^3 allows O(N^2) algorithms comfortably within 2.0s limit.',
          'N <= 10^5 requires O(N log N) or O(N) linear scan.',
          'Avoid repetitive memory allocations inside hot loops.',
        ],
      },
    ],
  },
  {
    filename: 'string_manipulation_notes.pdf',
    title: 'String Algorithms & Character Hashing',
    subtitle: 'Fundamental string manipulation, palindrome checking, and anagrams',
    topicName: 'Strings',
    sections: [
      {
        heading: '1. Palindrome & Symmetry Checking',
        bullets: [
          'Two pointers starting from opposite ends skipping non-alphanumeric characters.',
          'Time complexity O(N), auxiliary space O(1).',
          'Remember to convert characters to lowercase uniformly before comparisons.',
        ],
      },
      {
        heading: '2. Frequency Counting & Anagrams',
        bullets: [
          'Use a fixed-size integer array of length 26 or 128 for ASCII character counts.',
          'Two strings are anagrams if and only if their character count vectors match.',
          'Strip whitespace and normalize line endings (CRLF vs LF) when reading multiline inputs.',
        ],
      },
      {
        heading: '3. First Non-Repeating Character',
        bullets: [
          'First pass: construct frequency count map in O(N) time.',
          'Second pass: scan string from left-to-right to find first char with count == 1.',
          'Return -1 if all characters have frequency >= 2.',
        ],
      },
    ],
  },
  {
    filename: 'placement_interview_playbook.pdf',
    title: 'Engineering Campus Placement Playbook',
    subtitle: 'Technical interview guidelines, resume readiness, and behavioral STAR framework',
    topicName: 'Quantitative Aptitude',
    sections: [
      {
        heading: '1. Technical Interview Preparation',
        bullets: [
          'Always clarify problem constraints, edge cases, and expected scale before writing code.',
          'Think aloud: explain your thought process from brute-force to optimized approach.',
          'Walk through a concrete example with sample inputs before claiming your solution works.',
        ],
      },
      {
        heading: '2. Resume & Profile Readiness',
        bullets: [
          'Keep your technical resume concise (1 page), highlighting measurable impact.',
          'List projects with concrete tech stack details, architecture, and live links.',
          'Verify CGPA, contact details, and branch eligibility before applying for company drives.',
        ],
      },
      {
        heading: '3. Behavioral STAR Technique',
        bullets: [
          'Situation: describe the background and project context clearly.',
          'Task: explain your specific role and the problem that needed solving.',
          'Action: explain the technical actions, trade-offs, and initiatives you executed.',
          'Result: quantify the outcome (reduced latency by 30%, delivered project on time).',
        ],
      },
    ],
  },
];

export async function generateDemoPdfs(): Promise<string[]> {
  const generatedPaths: string[] = [];

  for (const def of pdfDefinitions) {
    const destPath = path.join(uploadsDir, def.filename);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(destPath);

      doc.pipe(stream);

      // Title header
      doc.fontSize(22).fillColor('#1e3a8a').text(def.title, { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor('#64748b').text(def.subtitle);
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor('#0284c7').text(`IntelliPlace Placement Preparation Library • Topic: ${def.topicName}`);
      doc.moveDown(0.8);
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // Sections
      for (const sec of def.sections) {
        doc.fontSize(14).fillColor('#0f172a').text(sec.heading);
        doc.moveDown(0.4);

        for (const bullet of sec.bullets) {
          doc.fontSize(10).fillColor('#334155').text(`•  ${bullet}`, {
            indent: 10,
            lineGap: 3,
          });
        }
        doc.moveDown(0.8);
      }

      // Footer
      doc.moveDown(1.5);
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#94a3b8').text('IntelliPlace Platform Verified Placement Study Notes • For internal academic and training use only.', { align: 'center' });

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', (err) => reject(err));
    });

    generatedPaths.push(destPath);
  }

  return generatedPaths;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateDemoPdfs().then((paths) => {
    console.log(`Generated ${paths.length} PDF files in uploads directory:`);
    paths.forEach((p) => console.log(`  - ${path.basename(p)} (${fs.statSync(p).size} bytes)`));
  }).catch((err) => {
    console.error('Error generating PDFs:', err);
    process.exit(1);
  });
}
