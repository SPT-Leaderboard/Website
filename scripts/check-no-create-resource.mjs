// Guards against createResource inside Solid islands.
//
// WHY: Astro wraps every island in a Suspense boundary (@astrojs/solid). A
// createResource entering its loading state SUSPENDS that boundary — the
// island's whole DOM unmounts and remounts (~500ms flicker on every profile
// open, owner report 2026-10-12). The codebase convention is signal-based
// loaders (see ProfileModal.tsx, Leaderboard.tsx): async fetch + sequence
// guard, kept OUTSIDE Suspense.
//
// If you genuinely need createResource (e.g. inside your own explicit
// <Suspense>), add the file to the ALLOWLIST below with a comment explaining
// why the suspension is safe.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const ROOTS = ['src'];
const ALLOWLIST = new Set([
  // (empty — add paths like 'src/components/foo/Bar.tsx' with a reason comment)
]);
const PATTERN = /\bcreateResource\s*[(<]/;

const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.astro') continue;
      walk(full);
    } else if (/\.(tsx?|jsx|mjs)$/.test(entry) && !full.endsWith('.d.ts')) {
      files.push(full);
    }
  }
}
for (const root of ROOTS) walk(root);

const offenders = [];
for (const file of files) {
  const rel = file.split(sep).join('/');
  if (ALLOWLIST.has(rel)) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (PATTERN.test(line) && !/^\s*\/\//.test(line)) {
      offenders.push(`${rel}:${index + 1}: ${line.trim().slice(0, 80)}`);
    }
  });
}

if (offenders.length > 0) {
  console.error(
    [
      '',
      `✖ createResource found in ${offenders.length} place(s).`,
      '',
      'Astro Suspense-wraps every island: a loading createResource unmounts',
      'the entire island DOM (see src/components/profile/ProfileModal.tsx',
      'for the convention and the incident). Use a signal-based loader:',
      '',
      '  const [data, setData] = createSignal();',
      '  createEffect(() => { let alive = true; load().then(d => alive && setData(d)); return () => { alive = false; }; });',
      '',
      'If suspension is genuinely intended, allowlist the file in',
      'scripts/check-no-create-resource.mjs with a reason.',
      '',
      ...offenders.map((o) => '  ' + o),
      '',
    ].join('\n'),
  );
  process.exit(1);
}
console.log(`createResource check passed (${files.length} files scanned).`);
