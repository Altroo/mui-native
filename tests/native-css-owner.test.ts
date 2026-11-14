// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  createNativeCssOwner,
  rebaseNativeCssOwner,
} from '../packages/system/src/nativeCssProgram';
import { componentRootStyle, createTheme } from '@altroo/mui-native-system';
import { nativeStyledStyles } from '../packages/system/src/nativeStyledMetadata';
import { snapshotNativeStyleProgramme } from '../packages/material/src/cardContentCandidates';

test('source occurrence metadata does not alter serialized CSS identity', () => {
  const a = createNativeCssOwner('MuiAccordion', { height: 10 }, [{ padding: 2 }], 'source-a');
  const b = createNativeCssOwner('MuiAccordion', { height: 10 }, [{ padding: 2 }], 'source-b');
  expect(a.css).toBe(b.css);
  expect(a.selectorOwner).toBe('source-a');
  expect(b.selectorOwner).toBe('source-b');
  expect(Object.isFrozen(a)).toBe(true);
});

test('constructor rebasing retains the accepted source occurrence', () => {
  const prior = createNativeCssOwner('MuiAccordion', { height: 10 }, [{ padding: 2 }], 'source-a');
  const replacement = createNativeCssOwner('MuiAccordion', { height: 20 }, [], 'unrelated');
  const result = rebaseNativeCssOwner(prior, replacement);
  expect(result.selectorOwner).toBe('source-a');
  expect(result.css).toBe(
    createNativeCssOwner('MuiAccordion', { height: 20 }, [{ padding: 2 }]).css,
  );
  expect(prior.base).not.toBe(result.base);
  expect(Object.isFrozen(result)).toBe(true);
});

test('retained native programmes keep their own owner after newer preparation', () => {
  const theme = createTheme();
  const prepare = (selectorOwner: string) =>
    componentRootStyle(
      theme,
      'MuiAccordion',
      {},
      undefined,
      undefined,
      { sourceClass: true, selectorOwner, baseStyle: { height: 10 } },
      true,
    );
  const old = prepare('accepted-old');
  const carrier = snapshotNativeStyleProgramme(old.programme);
  const newer = prepare('newer');
  if (!carrier || typeof carrier !== 'object') throw Error('Expected retained carrier object');
  const owners = nativeStyledStyles.get(carrier)!.sheets.map((sheet) => sheet.emissionOwner);
  expect(owners.some((owner) => owner?.selectorOwner === 'accepted-old')).toBe(true);
  expect(owners.some((owner) => owner?.selectorOwner === 'newer')).toBe(false);
  expect(old.prepared.classTokens!.map((token) => token.insertion.css)).toEqual(
    newer.prepared.classTokens!.map((token) => token.insertion.css),
  );
});
