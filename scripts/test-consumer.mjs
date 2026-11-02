import { mkdir, readFile, readdir, writeFile, cp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const consumer = resolve('.cache/consumer');
const workspace = JSON.parse(await readFile('package.json', 'utf8'));
const versions = workspace.devDependencies;
execFileSync('pnpm', ['pack:all'], { stdio: 'inherit' });
// Every run is a fresh install, including after workspace dependency upgrades.
await rm(consumer, { recursive: true, force: true });
await mkdir(consumer, { recursive: true });
await writeFile(
  `${consumer}/package.json`,
  JSON.stringify(
    {
      name: 'mui-native-installed-consumer',
      private: true,
      dependencies: {
        react: versions.react,
        'react-native': versions['react-native'],
        'react-native-svg': versions['react-native-svg'],
      },
      devDependencies: {
        typescript: versions.typescript,
        '@types/react': versions['@types/react'],
      },
    },
    null,
    2,
  ),
);
const tarballs = (await readdir('artifacts/packages'))
  .filter((file) => file.endsWith('.tgz'))
  .map((file) => resolve('artifacts/packages', file));
execFileSync('npm', ['install', '--no-audit', '--no-fund', ...tarballs], {
  cwd: consumer,
  stdio: 'inherit',
});
await cp('fixtures/native-consumer', consumer, { recursive: true });
await writeFile(
  `${consumer}/tsconfig.native.json`,
  JSON.stringify(require('../packages/compat/index.cjs').createNativeTsconfig(), null, 2),
);
execFileSync(
  resolve(consumer, 'node_modules/.bin/tsc'),
  ['--project', 'tsconfig.native.json', '--noEmit'],
  { cwd: consumer, stdio: 'inherit' },
);
const lock = JSON.parse(await readFile(`${consumer}/package-lock.json`, 'utf8'));
if (
  Object.keys(lock.packages).some(
    (name) => name.endsWith('/react-dom') || name.includes('node_modules/@mui/'),
  )
)
  throw new Error('Browser MUI entered the native installed consumer');
console.log(
  'Installed tarballs: root/deep imports, theme augmentation, X types, and native isolation passed.',
);
