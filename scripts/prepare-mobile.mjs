import { cp, mkdir, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const excludedDirs = new Set([
  '.git', '.github', '.idea', '.vscode', 'node_modules', 'dist',
  'android', 'ios', 'scripts', 'tools', 'tests', 'coverage'
]);
const excludedFiles = new Set([
  'package.json', 'package-lock.json', 'capacitor.config.ts',
  'README.md', 'MOBILE_APP.md', '.gitignore', '.DS_Store'
]);
const excludedExtensions = new Set(['.md', '.py', '.sh', '.log']);

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excludedDirs.has(entry.name) || excludedFiles.has(entry.name)) continue;
  if (entry.isFile() && excludedExtensions.has(path.extname(entry.name).toLowerCase())) continue;
  await cp(path.join(root, entry.name), path.join(out, entry.name), {
    recursive: true,
    filter(source) {
      const relative = path.relative(root, source);
      const parts = relative.split(path.sep);
      if (parts.some(part => excludedDirs.has(part))) return false;
      if (excludedFiles.has(path.basename(source))) return false;
      if (excludedExtensions.has(path.extname(source).toLowerCase())) return false;
      return true;
    }
  });
}

console.log('Mobile web bundle prepared in dist/.');
