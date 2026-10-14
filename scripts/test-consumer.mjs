import { mkdir, readFile, readdir, writeFile, cp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const consumer = resolve('.cache/consumer');
execFileSync('pnpm', ['pack:all'], { stdio: 'inherit' });
await mkdir(consumer, { recursive: true });
await writeFile(
  `${consumer}/package.json`,
  JSON.stringify(
    {
      name: 'mui-native-installed-consumer',
      private: true,
      dependencies: { react: '19.2.3', 'react-native': '0.86.3', 'react-native-svg': '15.15.4' },
      devDependencies: { typescript: '7.0.2', '@types/react': '19.2.18' },
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
