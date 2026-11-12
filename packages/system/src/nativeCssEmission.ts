// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { compile, serialize, stringify, middleware } from 'stylis';

/** Empty labels/selectors/media do not allocate an Emotion stylesheet block. */
export function nativeCssHasRules(css: string): boolean {
  return (
    serialize(
      compile('.native-css-root{' + css + '}'),
      middleware([
        (element) => {
          // Labels affect identity only. The pinned Emotion parser also drops
          // empty declarations, including custom properties retained by Stylis 4.4.
          if (element.type === 'decl' && (element.props === 'label' || element.children === '')) {
            element.value = '';
            element.return = '';
          }
        },
        stringify,
      ]),
    ) !== ''
  );
}
