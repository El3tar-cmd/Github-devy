#!/usr/bin/env node

/**
 * TypeScript Interface Checker
 * Validates TypeScript files for type safety and interface consistency
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

class TSInterfaceChecker {
  constructor() {
    this.interfaces = new Map();
    this.types = new Map();
    this.enums = new Map();
    this.issues = [];
  }

  extractTypeDefinitions(filePath, content) {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();
      
      // Extract interfaces
      const interfaceMatch = trimmed.match(/export\s+(?:interface|type)\s+(\w+)(?:<[^>]+>)?\s*{?/);
      if (interfaceMatch) {
        const name = interfaceMatch[1];
        const type = trimmed.includes('interface') ? 'interface' : 'type';
        
        this.interfaces.set(name, {
          file: filePath,
          line: lineNum,
          type: type,
          members: this.extractMembers(content, index)
        });
      }
      
      // Extract enums
      const enumMatch = trimmed.match(/enum\s+(\w+)\s*{/);
      if (enumMatch) {
        this.enums.set(enumMatch[1], {
          file: filePath,
          line: lineNum
        });
      }
    });
  }

  extractMembers(content, startLine) {
    const lines = content.split('\n');
    const members = [];
    let braceCount = 0;
    let inInterface = false;
    
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      if (braceCount > 0) {
        inInterface = true;
        // Extract property/method definitions
        const propMatch = line.match(/(\w+)\s*(\?)?:\s*([^;=]+)/);
        if (propMatch) {
          members.push({
            name: propMatch[1],
            optional: propMatch[2] === '?',
            type: propMatch[3].trim()
          });
        }
      } else if (inInterface) {
        break;
      }
    }
    
    return members;
  }

  checkTypeUsage(filePath, content) {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Check for usage of any
      if (/:\s*any\b/.test(line) && !/\/\/.*any/.test(line)) {
        this.issues.push({
          file: filePath,
          line: lineNum,
          severity: 'warning',
          message: 'Using "any" type - consider specific types',
          code: line.trim()
        });
      }
      
      // Check for type assertions (should be avoided)
      if (/as\s+\w+/.test(line) && !/as\s+const/.test(line) && !/\/\/.*as/.test(line)) {
        this.issues.push({
          file: filePath,
          line: lineNum,
          severity: 'info',
          message: 'Type assertion detected - prefer type guards',
          code: line.trim()
        });
      }
      
      // Check for missing return types on functions
      const funcMatch = line.match(/function\s+(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*{/);
      if (funcMatch && !line.includes(':')) {
        this.issues.push({
          file: filePath,
          line: lineNum,
          severity: 'warning',
          message: 'Function missing return type annotation',
          code: line.trim()
        });
      }
      
      // Check for unused type parameters
      const genericMatch = line.match(/<(\w+)>(?=.*\(\s*\w+\s*:\s*\w)/);
      if (genericMatch) {
        const genericName = genericMatch[1];
        const restOfLine = line.split('>')[1];
        if (!restOfLine.includes(genericName)) {
          this.issues.push({
            file: filePath,
            line: lineNum,
            severity: 'warning',
            message: `Unused type parameter "${genericName}"`,
            code: line.trim()
          });
        }
      }
    });
  }

  checkInterfaceConsistency() {
    // Check for interfaces that might be duplicates or similar
    const interfaceNames = Array.from(this.interfaces.keys());
    
    for (let i = 0; i < interfaceNames.length; i++) {
      for (let j = i + 1; j < interfaceNames.length; j++) {
        const name1 = interfaceNames[i];
        const name2 = interfaceNames[j];
        
        // Check for similar names (possible duplicates)
        if (name1.toLowerCase() === name2.toLowerCase() && name1 !== name2) {
          this.issues.push({
            file: this.interfaces.get(name2).file,
            line: this.interfaces.get(name2).line,
            severity: 'error',
            message: `Interface "${name2}" might duplicate "${name1}" (case-sensitive)`,
            code: `export interface ${name2} ...`
          });
        }
        
        // Check for interfaces with same members (possible duplicates)
        const members1 = this.interfaces.get(name1).members.map(m => m.name).sort().join(',');
        const members2 = this.interfaces.get(name2).members.map(m => m.name).sort().join(',');
        
        if (members1 === members2 && members1.length > 0 && name1 !== name2) {
          this.issues.push({
            file: this.interfaces.get(name2).file,
            line: this.interfaces.get(name2).line,
            severity: 'warning',
            message: `Interface "${name2}" has same members as "${name1}" - consider extending`,
            code: `export interface ${name2} ...`
          });
        }
      }
    }
  }

  run() {
    console.log(`${colors.cyan}🔍 TypeScript Interface Checker${colors.reset}\n`);
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const filteredDirs = args.filter(arg => !arg.startsWith('--'));
    const dirs = filteredDirs.length > 0 ? filteredDirs : ['src', 'server', 'tools'];
    const checkConsistency = !args.includes('--no-consistency');
    const reportTypeUsage = !args.includes('--no-type-usage');
    
    const extensions = ['.ts', '.tsx'];
    const excludeDirs = ['node_modules', 'dist', '.git', '.agent_workspace'];
    const files = this.getFiles(dirs, extensions, excludeDirs);
    
    console.log(`${colors.blue}Checking ${files.length} TypeScript files...${colors.reset}\n`);
    
    // First pass: extract all type definitions
    files.forEach(filePath => {
      try {
        const content = readFileSync(filePath, 'utf-8');
        this.extractTypeDefinitions(filePath, content);
      } catch (error) {
        this.issues.push({
          file: filePath,
          line: 0,
          severity: 'error',
          message: `Failed to read file: ${error.message}`,
          code: ''
        });
      }
    });
    
    console.log(`${colors.blue}Found ${this.interfaces.size} type definitions${colors.reset}\n`);
    
    // Second pass: check type usage
    files.forEach(filePath => {
      try {
        const content = readFileSync(filePath, 'utf-8');
        this.checkTypeUsage(filePath, content);
      } catch (error) {
        // Already handled in first pass
      }
    });
    
    // Check interface consistency
    this.checkInterfaceConsistency();
    
    // Print results
    this.printResults();
  }

  getFiles(dirs, extensions, excludeDirs) {
    const files = [];
    
    for (const dir of dirs) {
      try {
        files.push(...this.getAllFilesRecursive(dir, extensions, excludeDirs));
      } catch (error) {
        console.error(`${colors.red}Error reading ${dir}: ${error.message}${colors.reset}`);
      }
    }
    
    return files;
  }

  getAllFilesRecursive(dir, extensions, excludeDirs) {
    const files = [];
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!excludeDirs.includes(item)) {
          files.push(...this.getAllFilesRecursive(fullPath, extensions, excludeDirs));
        }
      } else if (extensions.includes(extname(item))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  printResults() {
    const errors = this.issues.filter(i => i.severity === 'error');
    const warnings = this.issues.filter(i => i.severity === 'warning');
    const infos = this.issues.filter(i => i.severity === 'info');
    
    // Group by file
    const byFile = new Map();
    this.issues.forEach(issue => {
      if (!byFile.has(issue.file)) {
        byFile.set(issue.file, []);
      }
      byFile.get(issue.file).push(issue);
    });
    
    // Print issues by file
    byFile.forEach((issues, file) => {
      console.log(`${colors.blue}${file}${colors.reset}`);
      
      issues.forEach(issue => {
        let color = colors.cyan;
        let icon = 'ℹ️';
        if (issue.severity === 'warning') { color = colors.yellow; icon = '⚠️'; }
        if (issue.severity === 'error') { color = colors.red; icon = '❌'; }
        
        console.log(`  ${color}Line ${issue.line}: [${issue.severity.toUpperCase()}] ${issue.message}${colors.reset}`);
        if (issue.code) {
          console.log(`  ${colors.gray}    ${issue.code}${colors.reset}`);
        }
      });
      
      console.log('');
    });
    
    // Print summary
    console.log(`${colors.cyan}📊 Summary:${colors.reset}`);
    console.log(`  Type definitions found: ${this.interfaces.size}`);
    console.log(`  Enums found: ${this.enums.size}`);
    console.log(`  ${colors.red}Errors: ${errors.length}${colors.reset}`);
    console.log(`  ${colors.yellow}Warnings: ${warnings.length}${colors.reset}`);
    console.log(`  ${colors.cyan}Info: ${infos.length}${colors.reset}`);
    
    if (this.issues.length === 0) {
      console.log(`\n${colors.green}✅ No type issues found!${colors.reset}`);
      process.exit(0);
    } else if (errors.length > 0) {
      console.log(`\n${colors.red}❌ Type check failed${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`\n${colors.yellow}⚠️  Type check passed with warnings${colors.reset}`);
      process.exit(0);
    }
  }
}

const checker = new TSInterfaceChecker();
checker.run();