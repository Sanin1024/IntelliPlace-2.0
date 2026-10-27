const fs = require('fs');
const path = require('path');

const secretPatterns = [
  { name: 'old_jwt_secret', regex: /c779ecf2be7d/i },
  { name: 'placeholder_secret', regex: /your[-_]super[-_]secret/i },
  { name: 'literal_jwt_signing', regex: /jwt\.sign\s*\([^)]*['"][a-zA-Z0-9_\-]{16,}['"]/i },
  { name: 'db_connection_with_password', regex: /postgres(ql)?:\/\/[a-zA-Z0-9_-]+:[^@\s"']+@[a-zA-Z0-9_.-]+/i },
  { name: 'long_hex_literal', regex: /['"][0-9a-fA-F]{48,}['"]/i }
];

const results = [];

function scanDir(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
    if (['node_modules', '.git', 'dist', 'dist-test', '.gemini', 'package-lock.json'].includes(entry.name)) {
      continue;
    }
    if (entry.name === 'scanSecrets.cjs') {
      continue;
    }
    // Ignore .env files since .env is environment config
    if (entry.name.startsWith('.env')) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && /\.(js|mjs|cjs|ts|tsx|json|sh|py)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const p of secretPatterns) {
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (p.regex.test(line)) {
            // Check if it's an environment fallback or comment or harmless
            results.push({
              file: relPath,
              line: idx + 1,
              pattern: p.name,
              preview: line.trim().slice(0, 100)
            });
          }
        });
      }
    }
  }
}

scanDir('.');
console.log('=== SECRET HYGIENE SCAN RESULTS ===');
console.log(`Total Findings: ${results.length}`);
if (results.length > 0) {
  console.table(results);
} else {
  console.log('CLEAN: No hardcoded secrets, literal JWT signing keys, or connection strings found.');
}
