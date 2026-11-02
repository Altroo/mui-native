import type { ViewInstance } from 'react-native';
import { diagnostic } from '@altroo/mui-native-system';
import { validRect, type NativePopoverRect } from './popoverGeometry';
export interface PopoverVirtualElement {
  nodeType: 1;
  getBoundingClientRect(): NativePopoverRect;
}
export type NativePopoverAnchor = ViewInstance | PopoverVirtualElement;
export function measurePopoverWindow(
  target: NativePopoverAnchor,
  done: (rect: NativePopoverRect) => void,
): void {
  try {
    if ('measureInWindow' in target && typeof target.measureInWindow === 'function') {
      target.measureInWindow((left, top, width, height) => {
        const rect = { left, top, width, height };
        if (validRect(rect)) done(rect);
        else
          diagnostic('popover-measure', 'Native window measurement returned an invalid rectangle.');
      });
    } else if (typeof target.getBoundingClientRect === 'function') {
      const rect = target.getBoundingClientRect();
      if (validRect(rect)) done(rect);
      else diagnostic('popover-anchor', 'Popover anchor returned an invalid rectangle.');
    } else
      diagnostic(
        'popover-measure',
        'A Popover anchor/root must expose native window measurement or a virtual rectangle.',
      );
  } catch {
    diagnostic('popover-measure', 'Popover measurement is unavailable for this native node.');
  }
}
