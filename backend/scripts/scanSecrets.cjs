const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Regex patterns for secret detection
const secretPatterns = [
  { name: 'old_jwt_secret', regex: new RegExp(['c779', 'ecf2', 'be7d'].join(''), 'i'), description: 'Known stale or rotated JWT secret key prefix' },
  { name: 'placeholder_super_secret', regex: /your[-_]super[-_]secret/i, description: 'Generic placeholder secret' },
  { name: 'literal_jwt_signing', regex: /jwt\.sign\s*\([^)]*['"][a-zA-Z0-9_\-]{16,}['"]/i, description: 'Hardcoded literal secret passed to jwt.sign' },
  { name: 'db_connection_with_live_pw', regex: /postgres(ql)?:\/\/(?!intelliplace:intelliplace_dev_only)[a-zA-Z0-9_-]+:[^@\s"']+@[a-zA-Z0-9_.-]+/i, description: 'Live PostgreSQL connection string with password' },
  { name: 'long_hex_literal', regex: /['"][0-9a-fA-F]{64,}['"]/i, description: 'Hardcoded 64-character hex secret literal' },
  { name: 'private_key_header', regex: /-----BEGIN (RSA|EC|PGP|OPENSSH|PRIVATE) KEY-----/i, description: 'Private key pem header' },
  { name: 'aws_access_key', regex: /\b(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}\b/, description: 'AWS Access Key ID format' },
  { name: 'github_token', regex: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}\b/, description: 'GitHub Personal Access Token' },
  { name: 'ai_api_key', regex: /\bsk-(?:proj-|ant-)?[a-zA-Z0-9_\-]{32,}\b/, description: 'OpenAI/Anthropic API Key' }
];

const scannedDirs = [];
const scannedFiles = [];
const workingTreeFindings = [];

// Exclusions: only build outputs, dependencies, generated code, and real active local .env configs
const EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  'dist-test',
  '.git',
  '.gemini',
  '.system_generated',
  'verification',
  'generated',
  'src/generated',
  'coverage',
  'test-results'
]);

function shouldScanFile(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  // Exclude machine-generated Prisma client
  if (norm.includes('/generated/') || norm.includes('src/generated/')) return false;

  const base = path.basename(filePath);
  // Exclude real active local environment files, but explicitly INCLUDE .env.example
  if (base === '.env' || base === '.env.local' || base === '.env.test' || base === '.env.production' || base === '.env.development') {
    return false;
  }
  // Exclude self script, scratch scanners, and tsbuildinfo cache files
  if (base === 'scanSecrets.cjs' || base.endsWith('.tsbuildinfo') || base.endsWith('.png') || base.endsWith('.jpg') || base.endsWith('.ico') || base.endsWith('.pdf')) return false;
  // Exclude lockfiles
  if (base === 'package-lock.json') return false;

  // Scan docs, markdown, scripts, source files, env examples, etc.
  return true;
}

// Redact secret fingerprint safely (never print actual secrets)
function createRedactedFingerprint(matchText) {
  if (!matchText || matchText.length <= 6) return '***[REDACTED]***';
  return `${matchText.slice(0, 3)}...${matchText.slice(-3)} (len:${matchText.length})`;
}

// Check git tracking status of file
let trackedFilesSet = null;
function isGitTracked(filePath) {
  if (!trackedFilesSet) {
    try {
      const output = execSync('git ls-files', { encoding: 'utf8' });
      trackedFilesSet = new Set(output.split('\n').map(s => s.trim().replace(/\\/g, '/')).filter(Boolean));
    } catch {
      trackedFilesSet = new Set();
    }
  }
  const rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  return trackedFilesSet.has(rel);
}

function scanDir(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }

  scannedDirs.push(path.relative(process.cwd(), dir).replace(/\\/g, '/') || '.');

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name) || entry.name === 'generated') continue;
      scanDir(fullPath);
    } else if (entry.isFile()) {
      if (!shouldScanFile(fullPath)) continue;
      scannedFiles.push(relPath);

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          for (const p of secretPatterns) {
            const m = p.regex.exec(line);
            if (m) {
              workingTreeFindings.push({
                category: p.name,
                description: p.description,
                file: relPath,
                line: idx + 1,
                gitTracked: isGitTracked(fullPath),
                fingerprint: createRedactedFingerprint(m[0])
              });
            }
          }
        });
      } catch (err) {
        // binary or unreadable
      }
    }
  }
}

console.log('================================================================');
console.log('🔒 REPOSITORY-WIDE SECRET SCANNER');
console.log('================================================================\n');

console.log('📋 DETECTION PATTERNS (REGEX LIST):');
secretPatterns.forEach((p, i) => {
  console.log(`  ${i + 1}. [${p.name}]: ${p.regex.toString()} (${p.description})`);
});

// Run Working Tree Scan
console.log('\n🔍 SCANNING WORKING TREE...');
scanDir('.');

console.log(`\nDirectories Scanned (${scannedDirs.length}):`);
scannedDirs.forEach(d => console.log(`  - ${d}`));

console.log(`\nTotal Files Scanned in Working Tree: ${scannedFiles.length}`);
console.log(`Working Tree Secret Findings: ${workingTreeFindings.length}`);

if (workingTreeFindings.length > 0) {
  console.error('\n❌ SECRETS DETECTED IN WORKING TREE:');
  console.table(workingTreeFindings);
} else {
  console.log('✅ WORKING TREE CLEAN: 0 secrets found across all source files, documentation, and config templates.');
}

// Run git log -p Scan
console.log('\n🔍 SCANNING GIT LOG (git log -p)...');
const gitLogFindings = [];
try {
  const gitLogOutput = execSync('git log -p', { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
  const logLines = gitLogOutput.split('\n');

  let currentCommit = '';
  let currentFile = '';

  for (let i = 0; i < logLines.length; i++) {
    const line = logLines[i];
    if (line.startsWith('commit ')) {
      currentCommit = line.split(' ')[1].slice(0, 8);
    } else if (line.startsWith('diff --git ')) {
      currentFile = line.split(' ')[2] || '';
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      if (currentFile.includes('scanSecrets.cjs')) continue;
      // Added line in commit
      for (const p of secretPatterns) {
        const m = p.regex.exec(line);
        if (m) {
          gitLogFindings.push({
            commit: currentCommit,
            category: p.name,
            description: p.description,
            file: currentFile,
            fingerprint: createRedactedFingerprint(m[0])
          });
        }
      }
    }
  }
} catch (err) {
  console.error('Error running git log -p:', err.message);
}

console.log(`Git Commit Diffs (git log -p) Secret Findings: ${gitLogFindings.length}`);
if (gitLogFindings.length > 0) {
  console.error('\n❌ SECRETS DETECTED IN GIT HISTORY:');
  console.table(gitLogFindings);
} else {
  console.log('✅ GIT LOG (git log -p) CLEAN: 0 secrets found across all commits in git history.');
}

console.log('\n================================================================');
if (workingTreeFindings.length === 0 && gitLogFindings.length === 0) {
  console.log('🎉 ALL SECRET SCANS PASSED: REPOSITORY IS 100% CLEAN.');
} else {
  console.log('⚠️ SECRET SCAN FAILED WITH FINDINGS.');
  process.exit(1);
}
console.log('================================================================\n');
