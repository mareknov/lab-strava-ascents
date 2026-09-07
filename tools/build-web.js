/**
 * Build apps/web into dist/ as a static site.
 *
 * Output is ES modules with code splitting on, which is what keeps the Garmin
 * FIT SDK (about 390 KB minified) out of the initial download: `importRide`
 * reaches it through a dynamic import, so esbuild emits it as its own chunk and
 * the browser fetches it only when someone actually drops a .fit file.
 *
 *   node tools/build-web.js            one-shot production build
 *   node tools/build-web.js --watch    rebuild on change
 *   node tools/build-web.js --serve    ...and serve dist/ on :8000
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import * as esbuild from 'esbuild';

const WATCH = process.argv.includes('--watch');
const SERVE = process.argv.includes('--serve');
const DEV = WATCH || SERVE;

const ROOT = 'apps/web/src';
const OUTDIR = 'dist';

/** Rewrite shell.html with the hashed asset names esbuild just produced. */
function writeShell(metafile) {
  const outputs = Object.keys(metafile.outputs);
  const js = outputs.find((f) => /app-[A-Z0-9]+\.js$/i.test(f) || f.endsWith('/app.js'));
  const css = outputs.find((f) => f.endsWith('.css'));
  if (!js || !css) throw new Error(`could not find entry outputs in:\n${outputs.join('\n')}`);

  const html = readFileSync(`${ROOT}/shell.html`, 'utf8')
    .replace('{{JS}}', `./${relative(OUTDIR, js)}`)
    .replace('{{CSS}}', `./${relative(OUTDIR, css)}`);

  writeFileSync(`${OUTDIR}/index.html`, html);

  const bytes = Object.entries(metafile.outputs)
    .filter(([f]) => !f.endsWith('.map'))
    .map(([f, o]) => [relative(OUTDIR, f), o.bytes]);
  const total = bytes.reduce((sum, [, b]) => sum + b, 0);
  for (const [name, size] of bytes.sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(Math.round(size / 1024)).padStart(5)} KB  ${name}`);
  }
  console.log(`  ${String(Math.round(total / 1024)).padStart(5)} KB  total`);
}

const options = {
  entryPoints: [`${ROOT}/app.ts`, `${ROOT}/styles.css`],
  bundle: true,
  format: 'esm',
  // Required for dynamic import() to become a separate chunk.
  splitting: true,
  outdir: `${OUTDIR}/assets`,
  entryNames: DEV ? '[name]' : '[name]-[hash]',
  chunkNames: DEV ? 'chunk-[name]' : 'chunk-[hash]',
  target: ['es2020'],
  minify: !DEV,
  sourcemap: true,
  metafile: true,
  logLevel: 'info',
};

rmSync(OUTDIR, { recursive: true, force: true });
mkdirSync(OUTDIR, { recursive: true });

if (DEV) {
  const ctx = await esbuild.context({
    ...options,
    plugins: [
      {
        name: 'shell',
        setup(build) {
          build.onEnd((result) => {
            if (result.metafile) writeShell(result.metafile);
          });
        },
      },
    ],
  });
  await ctx.watch();
  if (SERVE) {
    const { host, port } = await ctx.serve({ servedir: OUTDIR, port: 8000 });
    console.log(`\n  serving http://${host}:${port}\n`);
  }
} else {
  const result = await esbuild.build(options);
  writeShell(result.metafile);
}
