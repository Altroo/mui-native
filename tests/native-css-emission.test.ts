// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { nativeCssHasRules } from '../packages/system/src/nativeCssEmission';
import reference from './fixtures/mui-button-group-cache-9.5.0.json';
test.each(reference.cssEmissions)(
  'stylesheet placement matches original CSS emission: $css',
  (row) => {
    expect(nativeCssHasRules(row.css)).toBe(row.hasRules);
  },
);
