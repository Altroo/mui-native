/* Native contracts adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/svg-icon.json.
 * Native implementation: Copyright (c) 2026 Altroo and contributors. */
import React, { forwardRef, memo } from 'react';
import { SvgIcon } from './svgIcon';
import type { SvgIconHandle, SvgIconProps, NativeSvgIconComponent } from './svgIconTypes';
/** Create a memoized, ref-forwarding icon from native or authored SVG elements. */
export function createSvgIcon(path: React.ReactNode, displayName: string): NativeSvgIconComponent {
  const Component = forwardRef<SvgIconHandle, SvgIconProps>(function Icon(props, ref) {
    return (
      <SvgIcon
        data-testid={process.env.NODE_ENV !== 'production' ? `${displayName}Icon` : undefined}
        ref={ref}
        {...props}
      >
        {path}
      </SvgIcon>
    );
  });
  Component.displayName = `${displayName}Icon`;
  const Icon = memo(Component) as unknown as NativeSvgIconComponent;
  Icon.muiName = SvgIcon.muiName;
  return Icon;
}
