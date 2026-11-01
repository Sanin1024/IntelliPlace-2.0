import zlib from 'zlib';
import { prisma } from '../config/prisma.js';

export interface ParsedEducation {
  degree?: string;
  institution?: string;
  year?: string;
  score?: string;
}

export interface ParsedResumeData {
  email: string | null;
  phone: string | null;
  skills: string[];
  education: ParsedEducation[];
  links: string[];
  summary: string | null;
  rawTextChars: number;
  confidence: {
    email: 'high' | 'medium' | 'low' | 'none';
    phone: 'high' | 'medium' | 'low' | 'none';
    skills: 'high' | 'medium' | 'low' | 'none';
    education: 'high' | 'medium' | 'low' | 'none';
    links: 'high' | 'medium' | 'low' | 'none';
    overall: 'high' | 'medium' | 'low' | 'none';
  };
}

export interface PrivacyFinding {
  type: 'aadhaar' | 'pan' | 'address' | 'dob';
  description: string;
  severity: 'warning' | 'info';
  matchedSnippet?: string;
}

export interface ProfileComparisonResult {
  matches: Array<{ field: string; resumeValue: any; profileValue: any }>;
  differences: Array<{ field: string; resumeValue: any; profileValue: any; explanation: string }>;
  verifiedConflicts: Array<{ field: string; resumeValue: any; profileValue: any; warning: string }>;
}

export const DEFAULT_SKILL_DICTIONARY: string[] = [
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'C', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'SQL', 'HTML', 'CSS',
  // Frameworks & Libraries
  'React', 'React Native', 'Angular', 'Vue.js', 'Next.js', 'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'ASP.NET', 'Bootstrap', 'Tailwind CSS',
  // Databases & Stores
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Cassandra', 'DynamoDB', 'Elasticsearch',
  // Cloud, DevOps & Tools
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'GitHub', 'GitLab', 'CI/CD', 'Linux', 'Terraform',
  // Concepts & Architecture
  'REST APIs', 'GraphQL', 'Microservices', 'Object-Oriented Programming', 'Data Structures', 'Algorithms', 'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'Pandas', 'NumPy',
  // Testing
  'Jest', 'Mocha', 'Cypress', 'Playwright', 'Selenium', 'Unit Testing'
];

/**
 * Retrieves skill dictionary from system settings or built-in defaults.
 */
export async function getSkillDictionary(): Promise<string[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'RESUME_SKILL_DICTIONARY' },
    });
    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Fall back to defaults
  }
  return DEFAULT_SKILL_DICTIONARY;
}

/**
 * Extracts plain text from a DOCX buffer (PKZIP with word/document.xml).
 */
export function extractDocxText(buf: Buffer): string {
  try {
    // Search for word/document.xml in local file headers
    let offset = 0;
    while (offset < buf.length - 30) {
      if (buf.readUInt32LE(offset) !== 0x04034b50) {
        // Not a local header, advance by 1
        offset++;
        continue;
      }

      const compressionMethod = buf.readUInt16LE(offset + 8);
      const compressedSize = buf.readUInt32LE(offset + 18);
      const fileNameLen = buf.readUInt16LE(offset + 26);
      const extraLen = buf.readUInt16LE(offset + 28);
      const fileNameStart = offset + 30;
      const fileNameEnd = fileNameStart + fileNameLen;

      if (fileNameEnd > buf.length) break;
      const fileName = buf.subarray(fileNameStart, fileNameEnd).toString('utf8');

      const dataStart = fileNameEnd + extraLen;
      const dataEnd = dataStart + compressedSize;

      if (fileName === 'word/document.xml') {
        const fileData = buf.subarray(dataStart, dataEnd);
        let xmlStr = '';
        if (compressionMethod === 8) {
          // Deflated
          const inflated = zlib.inflateRawSync(fileData);
          xmlStr = inflated.toString('utf8');
        } else if (compressionMethod === 0) {
          // Stored
          xmlStr = fileData.toString('utf8');
        }

        // Clean XML tags to text
        return xmlStr
          .replace(/<w:p[^>]*>/gi, '\n')
          .replace(/<w:tab[^>]*\/>/gi, '\t')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/[ \t]+/g, ' ')
          .replace(/\n\s*\n/g, '\n')
          .trim();
      }

      offset = dataEnd;
    }
  } catch (err) {
    // Best-effort fallback
  }

  // Fallback: extract ASCII printable runs
  return buf
    .toString('latin1')
    .replace(/[^\x20-\x7E\r\n\t]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Extracts plain text from a PDF buffer by decoding Flate streams and extracting text operators.
 */
export function extractPdfText(buf: Buffer): string {
  const textChunks: string[] = [];
  const latin = buf.toString('latin1');

  try {
    let streamIdx = 0;
    while ((streamIdx = latin.indexOf('stream', streamIdx)) !== -1) {
      // Find dictionary start before stream
      const dictStart = latin.lastIndexOf('<<', streamIdx);
      const isFlate = dictStart !== -1 && /FlateDecode/i.test(latin.substring(dictStart, streamIdx));

      // Advance past 'stream' and newline (\r\n or \n)
      let dataStart = streamIdx + 6;
      if (latin[dataStart] === '\r') dataStart++;
      if (latin[dataStart] === '\n') dataStart++;

      const endStreamIdx = latin.indexOf('endstream', dataStart);
      if (endStreamIdx === -1) break;

      const rawStream = buf.subarray(dataStart, endStreamIdx);

      let decodedStr = '';
      if (isFlate) {
        try {
          decodedStr = zlib.inflateSync(rawStream).toString('latin1');
        } catch {
          try {
            decodedStr = zlib.inflateRawSync(rawStream).toString('latin1');
          } catch {
            // Stream decompression failed; ignore this stream
          }
        }
      } else {
        decodedStr = rawStream.toString('latin1');
      }

      if (decodedStr) {
        // Extract text inside parentheses: (some text) Tj or inside [(text) -10 (more)] TJ
        const tjMatches = decodedStr.match(/\((?:\\\(|\\\)|[^)])*\)\s*Tj/g);
        if (tjMatches) {
          for (const m of tjMatches) {
            const inner = m.substring(1, m.lastIndexOf(')'));
            textChunks.push(inner.replace(/\\([()\\])/g, '$1'));
          }
        }

        const arrayTjMatches = decodedStr.match(/\[([^\]]+)\]\s*TJ/g);
        if (arrayTjMatches) {
          for (const arr of arrayTjMatches) {
            const strings = arr.match(/\((?:\\\(|\\\)|[^)])*\)/g);
            if (strings) {
              const joined = strings
                .map((s) => s.substring(1, s.length - 1).replace(/\\([()\\])/g, '$1'))
                .join('');
              textChunks.push(joined);
            }
          }
        }
      }

      streamIdx = endStreamIdx + 9;
    }
  } catch {
    // Non-fatal stream scanning failure
  }

  const result = textChunks.join(' ').replace(/[ \t]+/g, ' ').trim();
  if (result.length > 50) {
    return result;
  }

  // Fallback: extract ASCII runs of 4+ readable chars
  const asciiRuns = latin.match(/[\x20-\x7E\r\n\t]{4,}/g) || [];
  return asciiRuns.join(' ').replace(/[ \t]+/g, ' ').trim();
}

/**
 * Privacy scanning (Challenge 113).
 * Flags Aadhaar, PAN, residential address patterns, and DOB.
 */
export function scanPrivacy(text: string): PrivacyFinding[] {
  const findings: PrivacyFinding[] = [];

  // 1. Aadhaar (12 digits, often 4-4-4)
  const aadhaarRegex = /\b\d{4}\s\d{4}\s\d{4}\b/g;
  let match: RegExpExecArray | null;
  while ((match = aadhaarRegex.exec(text)) !== null) {
    const rawVal = match[0];
    if (rawVal) {
      findings.push({
        type: 'aadhaar',
        severity: 'warning',
        description: 'Potential 12-digit Aadhaar number detected. For privacy and identity protection, remove Aadhaar numbers from resumes.',
        matchedSnippet: rawVal.substring(0, 4) + ' **** ' + rawVal.substring(10),
      });
    }
  }

  // Labeled aadhaar without spaces
  const labeledAadhaar = /\b(?:aadhaar|aadhar|uidai)[:\s]*([0-9]{12})\b/i;
  const labeledMatch = labeledAadhaar.exec(text);
  if (labeledMatch && labeledMatch[1]) {
    findings.push({
      type: 'aadhaar',
      severity: 'warning',
      description: 'Aadhaar number detected after label. Mask or remove this sensitive identifier.',
      matchedSnippet: 'Aadhaar: ****' + labeledMatch[1].slice(-4),
    });
  }

  // 2. PAN (Permanent Account Number: 5 uppercase letters, 4 digits, 1 uppercase letter)
  const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
  while ((match = panRegex.exec(text)) !== null) {
    const rawVal = match[0];
    if (rawVal) {
      findings.push({
        type: 'pan',
        severity: 'warning',
        description: 'Indian PAN (Permanent Account Number) detected. Government tax IDs should not be shared on general placement resumes.',
        matchedSnippet: rawVal.substring(0, 3) + '****' + rawVal.slice(-2),
      });
    }
  }

  // 3. Residential Address cues
  const addressRegex = /\b(?:door\s*no|flat\s*no|house\s*no|street|road|pincode|pin\s*code|pin\s*:\s*[1-9][0-9]{5})\b/i;
  if (addressRegex.test(text)) {
    findings.push({
      type: 'address',
      severity: 'info',
      description: 'Physical residential address details detected. Specifying only City and State is recommended.',
    });
  }

  // 4. Date of Birth
  const dobRegex = /\b(?:dob|date\s*of\s*birth|birth\s*date)\s*[:\-]?\s*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/i;
  const dobMatch = dobRegex.exec(text);
  if (dobMatch) {
    findings.push({
      type: 'dob',
      severity: 'info',
      description: 'Full Date of Birth detected. Many recruiters recommend omitting exact DOB to prevent age bias.',
      matchedSnippet: dobMatch[0],
    });
  }

  return findings;
}

/**
 * Deterministic heuristic structured extractor (Challenge 106).
 * No external AI dependencies. Returns extracted fields with per-field confidence scores.
 */
export async function extractStructured(text: string): Promise<ParsedResumeData> {
  const dictionary = await getSkillDictionary();

  // 1. Email extraction
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const emails = text.match(emailRegex) || [];
  const firstEmail = emails[0];
  const primaryEmail = firstEmail ? firstEmail.toLowerCase() : null;
  const emailConf: 'high' | 'medium' | 'low' | 'none' = primaryEmail ? 'high' : 'none';

  // 2. Phone extraction (10-digit Indian numbers or formatted phone numbers)
  const phoneRegex = /(?:\+?91[\s-]?)?[6-9]\d{9}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g;
  const phones = text.match(phoneRegex) || [];
  const firstPhone = phones[0];
  const primaryPhone = firstPhone ? firstPhone.replace(/^\+?91[\s-]*/, '').trim() : null;
  const phoneConf: 'high' | 'medium' | 'low' | 'none' = primaryPhone ? 'high' : 'none';

  // 3. Links extraction (LinkedIn, GitHub, Portfolio)
  const linkRegex = /(?:https?:\/\/)?(?:www\.)?(?:github\.com\/[A-Za-z0-9_-]+|linkedin\.com\/in\/[A-Za-z0-9_-]+|[a-zA-Z0-9-]+\.(?:github\.io|vercel\.app|dev|me|io))\b/gi;
  const links = Array.from(new Set(text.match(linkRegex) || []));
  const linkConf: 'high' | 'medium' | 'low' | 'none' = links.length > 0 ? (links.length >= 2 ? 'high' : 'medium') : 'none';

  // 4. Skills extraction against dictionary
  const matchedSkills: string[] = [];
  const lowerText = text.toLowerCase();
  for (const skill of dictionary) {
    // Word boundary check (handle special symbols like C++, C#, .NET, Node.js)
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, 'i');
    if (regex.test(text)) {
      matchedSkills.push(skill);
    }
  }
  const skillConf: 'high' | 'medium' | 'low' | 'none' =
    matchedSkills.length >= 5 ? 'high' : matchedSkills.length > 0 ? 'medium' : 'low';

  // 5. Education heuristic extraction
  const education: ParsedEducation[] = [];
  const degreeRegex = /\b(B\.?Tech|B\.?E\.?|B\.?Sc|BCA|M\.?Tech|M\.?E\.?|MCA|M\.?Sc|Bachelor|Master)[^\n.,]*/gi;
  let degMatch: RegExpExecArray | null;
  while ((degMatch = degreeRegex.exec(text)) !== null) {
    education.push({ degree: degMatch[0].trim() });
    if (education.length >= 3) break;
  }
  const eduConf: 'high' | 'medium' | 'low' | 'none' = education.length > 0 ? 'medium' : 'low';

  // 6. Summary heuristic extraction
  let summary: string | null = null;
  const summaryHeader = text.match(/\b(Summary|Professional Summary|Career Objective|About Me)\b[:\s]*([\s\S]{30,300}?)(?:\n\s*\n|[A-Z][a-z]+:|\bExperience\b|\bEducation\b|\bSkills\b)/i);
  if (summaryHeader && summaryHeader[2]) {
    summary = summaryHeader[2].replace(/[ \t\r\n]+/g, ' ').trim();
  }

  // Calculate overall confidence
  const scoreFor = (lvl: string) => (lvl === 'high' ? 3 : lvl === 'medium' ? 2 : lvl === 'low' ? 1 : 0);
  const avg = (scoreFor(emailConf) + scoreFor(phoneConf) + scoreFor(skillConf) + scoreFor(eduConf)) / 4;
  const overall: 'high' | 'medium' | 'low' | 'none' =
    avg >= 2.2 ? 'high' : avg >= 1.2 ? 'medium' : avg > 0.4 ? 'low' : 'none';

  return {
    email: primaryEmail,
    phone: primaryPhone,
    skills: matchedSkills,
    education,
    links,
    summary,
    rawTextChars: text.length,
    confidence: {
      email: emailConf,
      phone: phoneConf,
      skills: skillConf,
      education: eduConf,
      links: linkConf,
      overall,
    },
  };
}

/**
 * Compares parsed resume content against the student's declared/verified profile (Challenge 108).
 * Never mutates the profile directly. Highlights differences, matches, and verified conflicts.
 */
export async function compareWithProfile(
  studentId: string,
  parsed: ParsedResumeData
): Promise<ProfileComparisonResult> {
  const result: ProfileComparisonResult = {
    matches: [],
    differences: [],
    verifiedConflicts: [],
  };

  const user = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      studentProfile: true,
      declaredSkills: true,
      studentResumeData: true,
    },
  });

  if (!user) return result;

  // 1. Email comparison
  if (parsed.email) {
    if (parsed.email.toLowerCase() === user.email.toLowerCase()) {
      result.matches.push({
        field: 'email',
        resumeValue: parsed.email,
        profileValue: user.email,
      });
    } else {
      result.differences.push({
        field: 'email',
        resumeValue: parsed.email,
        profileValue: user.email,
        explanation: 'Resume lists a different contact email than the registered institutional account.',
      });
    }
  }

  // 2. Skills comparison
  const declaredSkillNames = new Set([
    ...(user.declaredSkills?.map((s) => s.skill.toLowerCase()) || []),
    ...(user.studentResumeData?.skills?.map((s) => s.toLowerCase()) || []),
  ]);

  const resumeSkills = parsed.skills;
  const newSkills = resumeSkills.filter((s) => !declaredSkillNames.has(s.toLowerCase()));
  const missingFromResume = Array.from(declaredSkillNames).filter(
    (ds) => !resumeSkills.some((rs) => rs.toLowerCase() === ds.toLowerCase())
  );

  if (newSkills.length > 0) {
    result.differences.push({
      field: 'skills',
      resumeValue: newSkills,
      profileValue: Array.from(declaredSkillNames),
      explanation: `${newSkills.length} skill(s) detected on resume that are not in your profile (${newSkills.slice(0, 5).join(', ')}${newSkills.length > 5 ? '...' : ''}).`,
    });
  }

  // 3. Academic CGPA verification conflict check
  if (user.studentProfile?.cgpa && user.studentProfile.cgpaVerified) {
    // Check if raw text mentions a CGPA or percentage that disagrees with verified CGPA
    const cgpaMention = parsed.education.find((e) => e.score && /\b(?:cgpa|gpa)\b/i.test(e.score));
    if (cgpaMention?.score) {
      const match = cgpaMention.score.match(/([0-9]+\.?[0-9]*)/);
      if (match) {
        const val = parseFloat(match[1]);
        if (Math.abs(val - user.studentProfile.cgpa) > 0.05) {
          result.verifiedConflicts.push({
            field: 'cgpa',
            resumeValue: val,
            profileValue: user.studentProfile.cgpa,
            warning: `Resume mentions CGPA ${val}, but college verified record is ${user.studentProfile.cgpa}. Placement drives evaluate against verified college records.`,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Top-level parser for an uploaded file buffer.
 * Gracefully catches errors, returning parseStatus: 'failed' if extraction fails (Challenge 105).
 */
export async function parseResumeBuffer(
  buf: Buffer,
  detectedType: 'pdf' | 'docx'
): Promise<{
  parseStatus: 'parsed' | 'failed' | 'needs_review';
  parsedData: ParsedResumeData | null;
  privacyScan: PrivacyFinding[];
}> {
  try {
    if (buf.length < 50) {
      return {
        parseStatus: 'failed',
        parsedData: null,
        privacyScan: [],
      };
    }

    let text = '';
    if (detectedType === 'docx') {
      text = extractDocxText(buf);
    } else {
      text = extractPdfText(buf);
    }

    if (!text || text.trim().length < 30) {
      return {
        parseStatus: 'failed',
        parsedData: null,
        privacyScan: [],
      };
    }

    const privacyScan = scanPrivacy(text);
    const parsedData = await extractStructured(text);

    if (
      !parsedData.email &&
      !parsedData.phone &&
      parsedData.skills.length === 0 &&
      parsedData.education.length === 0
    ) {
      return {
        parseStatus: 'failed',
        parsedData: null,
        privacyScan,
      };
    }

    const parseStatus: 'parsed' | 'needs_review' =
      parsedData.confidence.overall === 'none' || parsedData.confidence.overall === 'low'
        ? 'needs_review'
        : 'parsed';

    return {
      parseStatus,
      parsedData,
      privacyScan,
    };
  } catch (err) {
    console.error('RESUME_PARSING_ERROR', err);
    return {
      parseStatus: 'failed',
      parsedData: null,
      privacyScan: [],
    };
  }
}
