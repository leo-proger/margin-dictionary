import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';

const { name, version } = JSON.parse(await readFile('package.json', 'utf8'));
const files = execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD'], { encoding: 'utf8' }).trim().split('\n');
if (files.some(path => path.startsWith('docs/superpowers/') || path.startsWith('.idea/'))) throw new Error('Private project files must not be present in the source archive');
if (execFileSync('git', ['diff', 'HEAD', '--name-only', '--', ...files], { encoding: 'utf8' }).trim()) throw new Error('Commit tracked changes before packaging sources');
await mkdir('artifacts', { recursive: true });
const output = `artifacts/${name}-${version}-source.zip`;
execFileSync('git', ['archive', '--format=zip', `--prefix=${name}-${version}/`, `--output=${output}`, 'HEAD']);
console.log(`Source package: ${output}`);
