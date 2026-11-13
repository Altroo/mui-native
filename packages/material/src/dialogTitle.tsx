/* DialogTitle props, defaults and composition adapt MIT Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/dialog-title.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import React, { forwardRef, useContext } from 'react';
import { Text, type TextInstance, type TextProps } from 'react-native';
import { joinClassNames, useNativeRootProps } from '@altroo/mui-native-system';
import { styled } from './themeProvider';
import { Typography, type TypographyOwnProps, type TypographyProps } from './typography';
import { DialogContext } from './dialogContext';
import { getDialogTitleUtilityClass, type DialogTitleClasses } from './dialogTitleClasses';
export * from './dialogTitleClasses';

export interface DialogTitleOwnProps extends Omit<TypographyOwnProps, 'classes'> {
  classes?: Partial<DialogTitleClasses> | undefined;
}
type TitleRoot = string | React.JSXElementConstructor<never>;
type RootProps<Root extends TitleRoot> = Root extends string
  ? React.ComponentPropsWithRef<typeof Text>
  : Root extends React.ElementType
    ? React.ComponentPropsWithRef<Root>
    : never;
type RefCompatibleRoot<Root extends TitleRoot> =
  RootProps<Root> extends { ref?: React.Ref<infer Instance> | undefined }
    ? [Instance] extends [TextInstance]
      ? Root
      : never
    : Root;
type CompatibleRoot<Root extends TitleRoot> =
  RootProps<Root> extends { style?: infer Style }
    ? [Style] extends [TextProps['style']]
      ? RefCompatibleRoot<Root>
      : never
    : RefCompatibleRoot<Root>;
export interface DialogTitleTypeMap<
  AdditionalProps = {},
  RootComponent extends TitleRoot = typeof Text,
> {
  props: AdditionalProps & DialogTitleOwnProps;
  defaultComponent: RootComponent;
}
export type DialogTitleProps<
  RootComponent extends TitleRoot = typeof Text,
  AdditionalProps = {},
> = DialogTitleOwnProps &
  AdditionalProps &
  Omit<
    RootProps<RootComponent>,
    keyof DialogTitleOwnProps | keyof AdditionalProps | 'component'
  > & {
    component?: TypographyProps<RootComponent>['component'];
  };
interface NativeDialogTitleComponent {
  <Root extends TitleRoot>(
    props: DialogTitleProps<Root> & { component: Root & CompatibleRoot<Root> },
  ): React.JSX.Element | null;
  (props: DialogTitleProps): React.JSX.Element | null;
  displayName?: string | undefined;
}

// Preserve the separate outer styled layer. Converting its CSS into ordinary
// inline style would override Typography's own source-ordered style preparation.
const TitleRootComponent = styled(Typography as React.ComponentType<TypographyProps>, {
  name: 'MuiDialogTitle',
  // Material's outer root owns classes. Typography composes its own classes.
  shouldForwardProp: (prop) => !['classes', 'ownerState', 'theme', 'sx', 'as'].includes(prop),
})({
  padding: '16px 24px',
  // Unlike explicit flex longhands, zero flex permits a later native flex value.
  flex: 0,
});

export const DialogTitle: NativeDialogTitleComponent = forwardRef<TextInstance, DialogTitleProps>(
  function DialogTitle(inProps, ref) {
    const { props, style: retainedStyle } = useNativeRootProps({
      props: inProps,
      name: 'MuiDialogTitle',
    });
    const { className, id: idProp, ...other } = props;
    const { titleId = idProp } = useContext(DialogContext);
    let rootClass = getDialogTitleUtilityClass('root');
    // Keep composeClasses' two observable reads for a truthy authored entry.
    if (props.classes && props.classes.root) rootClass += ' ' + props.classes.root;
    return (
      <TitleRootComponent
        component="h2"
        className={joinClassNames(rootClass, className)}
        ownerState={props}
        ref={ref}
        variant="h6"
        id={idProp ?? titleId}
        {...other}
        {...(retainedStyle !== undefined || Object.hasOwn(props, 'style')
          ? { style: retainedStyle }
          : {})}
      />
    );
  },
) as NativeDialogTitleComponent;
