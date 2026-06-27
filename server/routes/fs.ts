import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { safePath, getWorkspaceDir } from '../utils/workspace';
import { notifyFsChanged } from '../websocket/events';

const router = Router();

router.post('/read', async (req, res) => {
  try {
    const { path: filePath, workspaceId } = req.body;
    const { resolved } = await safePath(workspaceId, filePath);
    const content = await fs.readFile(resolved, 'utf8');
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/read-lines', async (req, res) => {
  try {
    const { path: filePath, startLine, endLine, workspaceId } = req.body;
    const { resolved } = await safePath(workspaceId, filePath);
    const content = await fs.readFile(resolved, 'utf8');
    const lines = content.split('\n');
    
    const start = Math.max(1, startLine || 1);
    const end = Math.min(lines.length, endLine || lines.length);
    
    const slice = lines.slice(start - 1, end);
    res.json({ 
      content: slice.join('\n'), 
      totalLines: lines.length,
      startLine: start,
      endLine: end
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/write', async (req, res) => {
  try {
    const { path: filePath, content, workspaceId, encoding } = req.body;
    const { resolved } = await safePath(workspaceId, filePath);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    let bytesWritten = 0;
    if (encoding === 'base64') {
      const buffer = Buffer.from(content || '', 'base64');
      await fs.writeFile(resolved, buffer);
      bytesWritten = buffer.length;
    } else {
      const text = content || '';
      await fs.writeFile(resolved, text, 'utf8');
      bytesWritten = Buffer.byteLength(text, 'utf8');
    }
    notifyFsChanged(workspaceId);
    res.json({ success: true, bytesWritten });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/replace', async (req, res) => {
  try {
    const { path: filePath, search, replace, workspaceId } = req.body;
    const { resolved } = await safePath(workspaceId, filePath);
    let content = await fs.readFile(resolved, 'utf8');
    if (!content.includes(search)) {
      return res.status(400).json({ error: 'Search string not found in file.' });
    }
    content = content.replace(search, replace);
    await fs.writeFile(resolved, content, 'utf8');
    notifyFsChanged(workspaceId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/mkdir', async (req, res) => {
  try {
    const { path: dirPath, workspaceId } = req.body;
    const { resolved } = await safePath(workspaceId, dirPath);
    await fs.mkdir(resolved, { recursive: true });
    notifyFsChanged(workspaceId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/rename', async (req, res) => {
  try {
    const { oldPath, newPath, workspaceId } = req.body;
    const { resolved: resolvedOld } = await safePath(workspaceId, oldPath);
    const { resolved: resolvedNew } = await safePath(workspaceId, newPath);
    await fs.rename(resolvedOld, resolvedNew);
    notifyFsChanged(workspaceId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/delete', async (req, res) => {
  try {
    const { path: targetPath, workspaceId } = req.body;
    const { resolved } = await safePath(workspaceId, targetPath);
    await fs.rm(resolved, { recursive: true, force: true });
    notifyFsChanged(workspaceId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to recursively search files for a pattern natively
async function searchFilesNative(dir: string, baseDir: string, pattern: string, caseSensitive: boolean = true): Promise<string> {
  const ignoredDirs = ['.git', 'node_modules', '.chromium-profile', '.npm', '.cache', 'dist', 'build', 'out', 'venv', '.venv', '__pycache__'];
  const matches: string[] = [];

  async function walkAndSearch(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignoredDirs.includes(entry.name)) continue;
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await walkAndSearch(fullPath);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          // Simple binary check: if content contains null bytes, skip
          if (content.includes('\u0000')) continue;

          const lines = content.split(/\r?\n/);
          const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let isMatch = false;
            if (caseSensitive) {
              isMatch = line.includes(pattern);
            } else {
              isMatch = line.toLowerCase().includes(pattern.toLowerCase());
            }

            if (isMatch) {
              matches.push(`${relPath}:${i + 1}:${line}`);
              if (matches.length >= 1000) {
                return;
              }
            }
          }
        } catch (e) {
          // Ignore files that cannot be read
        }
      }
    }
  }

  await walkAndSearch(dir);
  return matches.join('\n');
}

router.post('/search', async (req, res) => {
  try {
    const { pattern, directory = '.', workspaceId, caseSensitive = true } = req.body;
    if (!pattern) return res.status(400).json({ error: 'pattern is required' });
    const { wDir } = await safePath(workspaceId, directory);
    
    const result = await searchFilesNative(wDir, wDir, pattern, caseSensitive);
    res.json({ matches: result || 'No matches found.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/list', async (req, res) => {
  try {
    const { path: dirPath = '.', workspaceId } = req.body;
    
    let wDir;
    try {
      wDir = getWorkspaceDir(workspaceId);
    } catch {
      return res.json({ files: [] });
    }

    try {
      await fs.access(wDir);
    } catch {
      return res.json({ files: [] });
    }

    const { resolved } = await safePath(workspaceId, dirPath);
    try {
      await fs.access(resolved);
    } catch {
      return res.json({ files: [] });
    }
    
    // Recursive directory read
    async function walk(dir: string, baseDir: string): Promise<any[]> {
      try {
        const files = await fs.readdir(dir, { withFileTypes: true });
        let result: any[] = [];
        const ignoredDirs = ['.git', 'node_modules', '.chromium-profile', '.npm', '.cache', 'dist', 'build', 'out', 'venv', '.venv', '__pycache__'];
        for (const f of files) {
          if (ignoredDirs.includes(f.name)) continue;
          const fullPath = path.join(dir, f.name);
          const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
          if (f.isDirectory()) {
            let ch: any[] = [];
            try {
              ch = await walk(fullPath, baseDir);
            } catch (e) {}
            result.push({ path: relPath, name: f.name, isDirectory: true, children: ch });
          } else {
            result.push({ path: relPath, name: f.name, isDirectory: false });
          }
        }
        return result;
      } catch (err) {
        return [];
      }
    }
    
    let tree: any[] = [];
    try {
      tree = await walk(resolved, resolved);
    } catch (e) {}
    res.json({ files: tree });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/check-types', async (req, res) => {
  try {
    const { workspaceId } = req.body;
    const { wDir } = await safePath(workspaceId, '.');

    const tsconfigPath = path.join(wDir, 'tsconfig.json');
    const hasTsConfig = await fs.access(tsconfigPath).then(() => true).catch(() => false);
    if (!hasTsConfig) {
      return res.json({
        success: true,
        hasTypeScript: false,
        message: 'No tsconfig.json found — TypeScript not configured in this workspace',
      });
    }

    await new Promise<void>((resolve) => {
      const child = spawn('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
        cwd: wDir,
        env: { ...process.env },
        shell: true,
      });

      let output = '';
      child.stdout?.on('data', (d: Buffer) => { output += d.toString(); });
      child.stderr?.on('data', (d: Buffer) => { output += d.toString(); });

      const timer = setTimeout(() => {
        child.kill();
        res.json({ error: 'TypeScript check timed out after 30s' });
        resolve();
      }, 30000);

      child.on('close', (code) => {
        clearTimeout(timer);
        const lines = output.split('\n').filter(Boolean);
        const errors = lines.filter(l => /error TS\d+/i.test(l));
        const warnings = lines.filter(l => /warning TS\d+/i.test(l));
        res.json({
          success: code === 0,
          hasTypeScript: true,
          exitCode: code,
          errorCount: errors.length,
          warningCount: warnings.length,
          errors: errors.slice(0, 60),
          warnings: warnings.slice(0, 20),
          summary: code === 0
            ? '✅ No TypeScript errors found.'
            : `❌ ${errors.length} TypeScript error(s) found.`,
          rawOutput: output.slice(0, 12000),
        });
        resolve();
      });

      child.on('error', (err: Error) => {
        clearTimeout(timer);
        res.status(500).json({ error: err.message });
        resolve();
      });
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/syntax-check', async (req, res) => {
  try {
    const { workspaceId, directories, extensions, strict } = req.body;
    const { wDir } = await safePath(workspaceId, '.');

    const dirs = directories || ['src', 'server', 'tools'];
    const scriptPath = path.join(process.cwd(), 'tools', 'syntax-check.js');

    await new Promise<void>((resolve) => {
      const child = spawn('node', [
        scriptPath,
        ...dirs,
        ...(strict ? ['--strict'] : [])
      ], {
        cwd: wDir,
        env: { ...process.env },
        shell: true,
      });

      let output = '';
      child.stdout?.on('data', (d: Buffer) => { output += d.toString(); });
      child.stderr?.on('data', (d: Buffer) => { output += d.toString(); });

      const timer = setTimeout(() => {
        child.kill();
        res.json({ error: 'Syntax check timed out after 30s' });
        resolve();
      }, 30000);

      child.on('close', (code) => {
        clearTimeout(timer);
        res.json({ success: code === 0, output });
        resolve();
      });

      child.on('error', (err: Error) => {
        clearTimeout(timer);
        res.status(500).json({ error: err.message });
        resolve();
      });
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/eslint-check', async (req, res) => {
  try {
    const { workspaceId, directories, severity, fixableOnly } = req.body;
    const { wDir } = await safePath(workspaceId, '.');

    const dirs = directories || ['src', 'server', 'tools'];
    const sev = severity || 'all';
    const scriptPath = path.join(process.cwd(), 'tools', 'eslint-check.js');

    await new Promise<void>((resolve) => {
      const child = spawn('node', [
        scriptPath,
        ...dirs,
        '--severity',
        sev,
        ...(fixableOnly ? ['--fixable-only'] : [])
      ], {
        cwd: wDir,
        env: { ...process.env },
        shell: true,
      });

      let output = '';
      child.stdout?.on('data', (d: Buffer) => { output += d.toString(); });
      child.stderr?.on('data', (d: Buffer) => { output += d.toString(); });

      const timer = setTimeout(() => {
        child.kill();
        res.json({ error: 'ESLint check timed out after 30s' });
        resolve();
      }, 30000);

      child.on('close', (code) => {
        clearTimeout(timer);
        res.json({ success: code === 0, output });
        resolve();
      });

      child.on('error', (err: Error) => {
        clearTimeout(timer);
        res.status(500).json({ error: err.message });
        resolve();
      });
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ts-check', async (req, res) => {
  try {
    const { workspaceId, directories, checkConsistency, reportTypeUsage } = req.body;
    const { wDir } = await safePath(workspaceId, '.');

    const dirs = directories || ['src', 'server', 'tools'];
    const consistency = checkConsistency !== false;
    const typeUsage = reportTypeUsage !== false;
    const scriptPath = path.join(process.cwd(), 'tools', 'ts-check.js');

    await new Promise<void>((resolve) => {
      const child = spawn('node', [
        scriptPath,
        ...dirs,
        ...(!consistency ? ['--no-consistency'] : []),
        ...(!typeUsage ? ['--no-type-usage'] : [])
      ], {
        cwd: wDir,
        env: { ...process.env },
        shell: true,
      });

      let output = '';
      child.stdout?.on('data', (d: Buffer) => { output += d.toString(); });
      child.stderr?.on('data', (d: Buffer) => { output += d.toString(); });

      const timer = setTimeout(() => {
        child.kill();
        res.json({ error: 'TypeScript check timed out after 30s' });
        resolve();
      }, 30000);

      child.on('close', (code) => {
        clearTimeout(timer);
        res.json({ success: code === 0, output });
        resolve();
      });

      child.on('error', (err: Error) => {
        clearTimeout(timer);
        res.status(500).json({ error: err.message });
        resolve();
      });
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
