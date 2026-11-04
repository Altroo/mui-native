// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepare, run } from './android-popper.mjs';
import { summarizeAccordion } from './android-accordion-report.mjs';
export {
  summarizeAccordion,
  accordionStages,
  accordionPictures,
} from './android-accordion-report.mjs';
if (
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [action, argument, output, extra] = process.argv.slice(2);
  if (typeof argument !== 'string' || !argument || extra || (action !== 'run' && output))
    throw Error('Use prepare PROJECT | summarize RAW_LOG | run SERIAL OUTPUT');
  if (action === 'prepare') console.log(JSON.stringify(await prepare(resolve(argument))));
  else if (action === 'summarize')
    console.log(
      JSON.stringify(summarizeAccordion(await readFile(argument, { encoding: 'utf8' })), null, 2),
    );
  else if (action === 'run' && typeof output === 'string' && output) {
    const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
    const adb = sdk
      ? join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')
      : 'adb';
    // Aborting the adb client alone leaves native instrumentation alive. Keep
    // signal handlers installed until shared package-specific cleanup completes.
    const controller = new AbortController();
    const abort = () => controller.abort(Error('Native catalog check interrupted'));
    process.on('SIGINT', abort);
    process.on('SIGTERM', abort);
    try {
      console.log(
        JSON.stringify(
          await run({
            adb,
            serial: argument,
            output: resolve(output),
            scenario: 'accordion',
            signal: controller.signal,
          }),
          null,
          2,
        ),
      );
    } finally {
      process.removeListener('SIGINT', abort);
      process.removeListener('SIGTERM', abort);
    }
  } else throw Error('Use prepare PROJECT | summarize RAW_LOG | run SERIAL OUTPUT');
}
