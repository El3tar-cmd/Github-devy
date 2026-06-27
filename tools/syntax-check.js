#!/usr/bin/env node

/**
 * Syntax Check Tools
 * Runs syntax validation for TypeScript, JavaScript, and CSS files
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Configuration
const config = {
  directories: (() => {
    const dirs = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
    return dirs.length > 0 ? dirs : ['src', 'server', 'tools'];
  })(),
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  excludeDirs: ['node_modules', 'dist', '.git', '.agent_workspace'],
  strict: process.argv.includes('--strict'),
  rules: {
    // Syntax rules
    noTrailingComma: true,
    noSemicolon: false,
    preferConst: true,
    noConsoleLog: false,
    
    // Import rules
    noUnusedImports: true,
    noDefaultImports: false,
    
    // Code style rules
    maxLineLength: 120,
    indentSize: 2
  }
};

// Error tracking
let errors = [];
let warnings = [];
let filesChecked = 0;

/**
 * Get all files with specified extensions recursively
 */
function getFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!config.excludeDirs.includes(file)) {
        getFiles(filePath, fileList);
      }
    } else if (config.extensions.includes(extname(file))) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

/**
 * Basic syntax check using regex patterns
 */
function checkSyntax(content, filePath) {
  const lines = content.split('\n');
  const fileErrors = [];
  const fileWarnings = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmedLine = line.trim();
    
    // Skip comments and empty lines
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine === '') {
      return;
    }
    
    // Check for trailing commas in objects/arrays
    if (config.rules.noTrailingComma) {
      if (/[,\s]+$/.test(line) && !trimmedLine.endsWith(',')) {
        fileWarnings.push({
          line: lineNum,
          message: 'Potential trailing whitespace',
          type: 'style'
        });
      }
    }
    
    // Check line length
    if (line.length > config.rules.maxLineLength) {
      fileWarnings.push({
        line: lineNum,
        message: `Line exceeds ${config.rules.maxLineLength} characters (${line.length})`,
        type: 'style'
      });
    }
    
    // Check for console.log (optional)
    if (config.rules.noConsoleLog && /console\.log\(/.test(line)) {
      fileWarnings.push({
        line: lineNum,
        message: 'console.log statement found',
        type: 'quality'
      });
    }
    
    // Basic bracket matching
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;
    
    // This is a simplified check - real parsing would be more complex
    if (openBraces !== closeBraces && !trimmedLine.includes('//')) {
      fileErrors.push({
        line: lineNum,
        message: 'Unbalanced braces detected',
        type: 'syntax'
      });
    }
  });
  
  return { fileErrors, fileWarnings };
}

/**
 * Check for common import issues
 */
function checkImports(content, filePath) {
  const importRegex = /^import\s+.*from\s+['"]([^'"]+)['"]/gm;
  const imports = [];
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  const issues = [];
  
  // Check for potential unused imports (simplified)
  if (config.rules.noUnusedImports) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const importMatch = line.match(/^import\s+{([^}]+)}\s+from/);
      if (importMatch) {
        const importedItems = importMatch[1].split(',').map(s => s.trim());
        // Very basic check - real unused import detection needs AST parsing
        if (importedItems.length > 5) {
          issues.push({
            line: index + 1,
            message: 'Many imports in single statement - consider splitting',
            type: 'style'
          });
        }
      }
    });
  }
  
  return issues;
}

/**
 * Main check function
 */
function runChecks() {
  console.log(`${colors.cyan}🔍 Starting Syntax Checks${colors.reset}\n`);
  
  const allFiles = [];
  config.directories.forEach(dir => {
    try {
      const files = getFiles(dir);
      allFiles.push(...files);
    } catch (error) {
      console.error(`${colors.red}Error reading directory ${dir}: ${error.message}${colors.reset}`);
    }
  });
  
  console.log(`${colors.blue}Found ${allFiles.length} files to check${colors.reset}\n`);
  
  allFiles.forEach(filePath => {
    try {
      const content = readFileSync(filePath, 'utf-8');
      
      // Run syntax checks
      const { fileErrors, fileWarnings } = checkSyntax(content, filePath);
      
      // Run import checks
      const importIssues = checkImports(content, filePath);
      
      if (fileErrors.length > 0) {
        errors.push({
          file: filePath,
          issues: [...fileErrors, ...importIssues.filter(i => i.type === 'syntax')]
        });
      }
      
      if (fileWarnings.length > 0 || importIssues.some(i => i.type !== 'syntax')) {
        warnings.push({
          file: filePath,
          issues: [...fileWarnings, ...importIssues.filter(i => i.type !== 'syntax')]
        });
      }
      
      filesChecked++;
    } catch (error) {
      errors.push({
        file: filePath,
        issues: [{
          line: 0,
          message: `Failed to read file: ${error.message}`,
          type: 'system'
        }]
      });
    }
  });
  
  // Print results
  printResults();
}

/**
 * Print check results
 */
function printResults() {
  // Print errors
  if (errors.length > 0) {
    console.log(`${colors.red}❌ ERRORS (${errors.length} files):${colors.reset}\n`);
    errors.forEach(({ file, issues }) => {
      console.log(`${colors.red}  ${file}${colors.reset}`);
      issues.forEach(issue => {
        console.log(`${colors.red}    Line ${issue.line}: ${issue.message}${colors.reset}`);
      });
    });
    console.log('');
  }
  
  // Print warnings
  if (warnings.length > 0) {
    console.log(`${colors.yellow}⚠️  WARNINGS (${warnings.length} files):${colors.reset}\n`);
    warnings.forEach(({ file, issues }) => {
      console.log(`${colors.yellow}  ${file}${colors.reset}`);
      issues.forEach(issue => {
        console.log(`${colors.yellow}    Line ${issue.line}: ${issue.message}${colors.reset}`);
      });
    });
    console.log('');
  }
  
  // Print summary
  console.log(`${colors.cyan}📊 Summary:${colors.reset}`);
  console.log(`  Files checked: ${filesChecked}`);
  console.log(`  Errors: ${errors.reduce((sum, f) => sum + f.issues.length, 0)}`);
  console.log(`  Warnings: ${warnings.reduce((sum, f) => sum + f.issues.length, 0)}`);
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log(`\n${colors.green}✅ All checks passed!${colors.reset}`);
    process.exit(0);
  } else if (errors.length > 0) {
    console.log(`\n${colors.red}❌ Syntax checks failed${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.yellow}⚠️  Syntax checks passed with warnings${colors.reset}`);
    process.exit(0);
  }
}

// Run the checks
runChecks();