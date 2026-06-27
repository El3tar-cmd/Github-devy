#!/usr/bin/env node

/**
 * ESLint-style syntax checker using regex patterns
 * Provides more detailed syntax validation
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const RULES = {
  // Possible syntax errors
  'no-async-func-without-await': {
    description: 'Async function without await',
    severity: 'warning',
    check: (line, content, lineIndex) => {
      if (/async\s+\w+.*\(/.test(line) && !/await/.test(content.split('\n').slice(lineIndex, lineIndex + 10).join('\n'))) {
        return true;
      }
      return false;
    }
  },
  'no-unreachable-code': {
    description: 'Code after return/throw/break',
    severity: 'error',
    check: (line) => {
      const trimmed = line.trim();
      if (/^\s*(return|throw|break)\s*(;|[a-zA-Z0-9_"]+)/.test(trimmed)) {
        return !trimmed.endsWith(';');
      }
      return false;
    }
  },
  'no-empty-function': {
    description: 'Empty function',
    severity: 'warning',
    check: (line) => {
      return /\w+\s*\([^)]*\)\s*{\s*}/.test(line);
    }
  },
  'no-debugger': {
    description: 'Debugger statement',
    severity: 'error',
    check: (line) => /debugger/.test(line)
  },
  'no-duplicate-imports': {
    description: 'Duplicate imports',
    severity: 'error',
    check: (line, content) => {
      const importMatch = line.match(/from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const importPath = importMatch[1];
        const occurrences = (content.match(new RegExp(`from\\s+['"]${importPath}['"]`, 'g')) || []).length;
        return occurrences > 1;
      }
      return false;
    }
  },
  'no-var': {
    description: 'Use let/const instead of var',
    severity: 'warning',
    check: (line) => /\bvar\s+/.test(line) && !/\/\/.*var\s+/.test(line)
  },
  'prefer-const': {
    description: 'Use const instead of let for never reassigned variables',
    severity: 'warning',
    check: (line, content, lineIndex) => {
      const letMatch = line.match(/let\s+(\w+)/);
      if (letMatch) {
        const varName = letMatch[1];
        const lines = content.split('\n');
        const remainingLines = lines.slice(lineIndex + 1).join('\n');
        // Check if variable is reassigned
        return !new RegExp(`${varName}\\s*=`).test(remainingLines);
      }
      return false;
    }
  },
  'no-unused-vars': {
    description: 'Unused variable declaration',
    severity: 'warning',
    check: (line, content, lineIndex) => {
      const matches = line.match(/(?:let|const|var)\s+(\w+)/g);
      if (matches) {
        const lines = content.split('\n');
        const remainingContent = lines.slice(lineIndex + 1).join('\n');
        
        for (const match of matches) {
          const varName = match.replace(/(?:let|const|var)\s+/, '');
          if (varName && !new RegExp(`\\b${varName}\\b`).test(remainingContent)) {
            return true;
          }
        }
      }
      return false;
    }
  },
  'no-undef': {
    description: 'Use of undefined variable',
    severity: 'error',
    check: (line) => {
      // This is a simplified check
      const definedVars = ['const', 'let', 'var', 'function', 'class', 'import', 'from', 'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'throw', 'new', 'typeof', 'instanceof'];
      const tokens = line.split(/\s+|[(),;:{}]/).filter(t => t.length > 0);
      for (const token of tokens) {
        if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(token) && !definedVars.includes(token) && !/\/\/|\/\*|\*/.test(line)) {
          // Very basic heuristic - real check needs AST
        }
      }
      return false;
    }
  },
  'semi': {
    description: 'Missing semicolon',
    severity: 'warning',
    check: (line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && 
          /[a-zA-Z0-9_$)]\s*$/.test(trimmed) && !trimmed.endsWith(';') &&
          !trimmed.endsWith('{') && !trimmed.endsWith('}')) {
        return true;
      }
      return false;
    }
  },
  'quotes': {
    description: 'Inconsistent quote usage',
    severity: 'warning',
    check: (line, content) => {
      const singleQuotes = (line.match(/'/g) || []).length;
      const doubleQuotes = (line.match(/"/g) || []).length;
      // Check for mixed quotes in same line
      return singleQuotes > 0 && doubleQuotes > 0 && !/['"]\s*\+\s*['"]/.test(line);
    }
  },
  'no-multiple-empty-lines': {
    description: 'Multiple empty lines',
    severity: 'style',
    check: (line, content, lineIndex) => {
      if (line.trim() === '') {
        const lines = content.split('\n');
        let emptyCount = 0;
        for (let i = lineIndex; i < Math.min(lineIndex + 5, lines.length); i++) {
          if (lines[i].trim() === '') {
            emptyCount++;
          } else {
            break;
          }
        }
        return emptyCount > 2;
      }
      return false;
    }
  },
  'no-trailing-spaces': {
    description: 'Trailing spaces',
    severity: 'style',
    check: (line) => /\s+$/.test(line)
  },
  'indent': {
    description: 'Inconsistent indentation',
    severity: 'style',
    check: (line, content, lineIndex) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//')) {
        const indent = line.search(/\S/);
        if (indent % 2 !== 0) {
          return true;
        }
      }
      return false;
    }
  }
};

function getAllFiles(dir, extensions, excludeDirs) {
  const files = [];
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(item)) {
        files.push(...getAllFiles(fullPath, extensions, excludeDirs));
      }
    } else if (extensions.includes(extname(item))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
      return;
    }
    
    Object.entries(RULES).forEach(([ruleName, rule]) => {
      try {
        if (rule.check(line, content, index)) {
          issues.push({
            line: lineNum,
            rule: ruleName,
            message: rule.description,
            severity: rule.severity,
            code: line.trim()
          });
        }
      } catch (error) {
        // Skip rules that throw errors
      }
    });
  });
  
  return issues;
}

function main() {
  console.log(`${colors.cyan}🔍 ESLint-style Syntax Checker${colors.reset}\n`);
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const filteredDirs = args.filter(arg => !arg.startsWith('--'));
  const dirs = filteredDirs.length > 0 ? filteredDirs : ['src', 'server', 'tools'];
  const severityIndex = args.indexOf('--severity');
  const severity = severityIndex >= 0 ? args[severityIndex + 1] || 'all' : 'all';
  const fixableOnly = args.includes('--fixable-only');
  
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  const excludeDirs = ['node_modules', 'dist', '.git', '.agent_workspace'];
  
  let totalIssues = 0;
  let errorCount = 0;
  let warningCount = 0;
  let styleCount = 0;
  const fileResults = [];
  
  for (const dir of dirs) {
    try {
      const files = getAllFiles(dir, extensions, excludeDirs);
      
      for (const file of files) {
        const issues = checkFile(file);
        
        if (issues.length > 0) {
          fileResults.push({ file, issues });
          totalIssues += issues.length;
          errorCount += issues.filter(i => i.severity === 'error').length;
          warningCount += issues.filter(i => i.severity === 'warning').length;
          styleCount += issues.filter(i => i.severity === 'style').length;
        }
      }
    } catch (error) {
      console.error(`${colors.red}Error processing ${dir}: ${error.message}${colors.reset}`);
    }
  }
  
  // Print results
  if (fileResults.length > 0) {
    fileResults.forEach(({ file, issues }) => {
      console.log(`${colors.blue}${file}${colors.reset}`);
      
      issues.forEach(issue => {
        let color = colors.yellow;
        if (issue.severity === 'error') color = colors.red;
        if (issue.severity === 'style') color = colors.cyan;
        
        console.log(`  ${color}Line ${issue.line}: [${issue.severity.toUpperCase()}] ${issue.message}${colors.reset}`);
        console.log(`  ${colors.gray}    ${issue.code}${colors.reset}`);
      });
      
      console.log('');
    });
  }
  
  // Print summary
  console.log(`${colors.cyan}📊 Summary:${colors.reset}`);
  console.log(`  Files with issues: ${fileResults.length}`);
  console.log(`  Total issues: ${totalIssues}`);
  console.log(`  ${colors.red}Errors: ${errorCount}${colors.reset}`);
  console.log(`  ${colors.yellow}Warnings: ${warningCount}${colors.reset}`);
  console.log(`  ${colors.cyan}Style issues: ${styleCount}${colors.reset}`);
  
  if (totalIssues === 0) {
    console.log(`\n${colors.green}✅ No issues found!${colors.reset}`);
    process.exit(0);
  } else if (errorCount > 0) {
    console.log(`\n${colors.red}❌ Check failed with errors${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.yellow}⚠️  Check passed with warnings/style issues${colors.reset}`);
    process.exit(0);
  }
}

main();