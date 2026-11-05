// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Forwarding provider adapts MIT Material UI 9.5.0 DefaultPropsProvider; see NOTICE.
import type * as React from 'react';
import SystemDefaults, {
  useDefaultProps as useSystemDefaults,
} from '@altroo/mui-native-system/DefaultPropsProvider';
import type { ComponentsPropsList } from '../styles/props';

type NativeConfiguration<Props> =
  | Partial<Props>
  | {
      defaultProps?: Partial<Props> | undefined;
      styleOverrides?: unknown;
      variants?: unknown;
    };
export type DefaultPropsProviderValue = {
  [Name in keyof ComponentsPropsList]?: NativeConfiguration<ComponentsPropsList[Name]>;
} & Record<string, unknown>;
export type DefaultPropsProviderProps = React.PropsWithChildren<{
  value: DefaultPropsProviderValue;
}>;
export interface DefaultPropsProviderComponent {
  (props: DefaultPropsProviderProps): React.JSX.Element;
  /** Optional native metadata extension; React 19 does not run propTypes validation. */
  propTypes?: any;
}
const DefaultPropsProvider: DefaultPropsProviderComponent = function DefaultPropsProvider(props) {
  return <SystemDefaults {...props} />;
};
export default DefaultPropsProvider;
export function useDefaultProps<Props extends Record<string, any>>(params: {
  props: Props;
  name: string;
}): Props {
  return useSystemDefaults(params);
}
