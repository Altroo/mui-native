// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import type { JSX } from 'react';
import { Text, View, type ViewProps } from 'react-native';
import SystemDefaults, {
  useDefaultProps as useSystemDefaults,
} from '@mui/system/DefaultPropsProvider';
import MaterialDefaults, {
  useDefaultProps as useMaterialDefaults,
} from '@mui/material/DefaultPropsProvider';
import NativeSystemDefaults from '@altroo/mui-native-system/DefaultPropsProvider';
import NativeMaterialDefaults from '@altroo/mui-native/DefaultPropsProvider';
import { getThemeProps } from '@mui/system/useThemeProps';
import type { ComponentsProps, ComponentsPropsList } from '@mui/material/styles';
import type { TextFieldProps } from '@mui/material/TextField';

declare module '@mui/material/styles' {
  interface ComponentsPropsList {
    MuiContractProbe: { marker: 'consumer'; count?: number | undefined };
  }
}

export const materialDefaults: ComponentsProps = {
  MuiButton: { size: 'small' },
  MuiButtonGroup: { orientation: 'vertical' },
  MuiCheckbox: { disabled: true },
  MuiContractProbe: { marker: 'consumer', count: undefined },
};
export const augmentation: ComponentsPropsList['MuiContractProbe'] = { marker: 'consumer' };
export const genericComponentDefaults: ComponentsProps = {
  MuiAutocomplete: {
    getOptionLabel: (option) => option.label,
    renderOption: (_props, option) => <Text>{option.label}</Text>,
  },
  MuiSelect: { native: false },
  MuiPopper: { component: (props: ViewProps) => <View {...props} /> },
};
export const declaredTextFieldDefaults: Partial<TextFieldProps> = {};
export const mappedTextFieldDefaults: ComponentsProps['MuiTextField'] = declaredTextFieldDefaults;
export const systemAlias: typeof SystemDefaults = NativeSystemDefaults;
export const materialAlias: typeof MaterialDefaults = NativeMaterialDefaults;
export const systemElement: JSX.Element | null = SystemDefaults({
  value: undefined,
  children: undefined,
});
export const materialElement: JSX.Element | null = MaterialDefaults({
  value: materialDefaults,
  children: undefined,
});
export const metadata: unknown = SystemDefaults.propTypes;
export const systemValueMetadata: unknown = SystemDefaults.propTypes?.value;
export const materialValueMetadata: unknown = MaterialDefaults.propTypes?.value;

const name = Symbol('component');
const resolved = getThemeProps({
  theme: { components: { [name]: { defaultProps: { fallback: 'source' as const } } } },
  name,
  props: { own: 4 },
});
export const inferredDefault: 'source' = resolved.fallback;
export const inferredOwn: number = resolved.own;
export const explicitUndefinedTheme = getThemeProps({ theme: undefined, props: 7, name: 2 });

export function GenericProbe() {
  const text: string = useSystemDefaults({ props: 'source', name: 'String' });
  const nil: null = useSystemDefaults({ props: null, name: 'Null' });
  const absent: undefined = useSystemDefaults({ props: undefined, name: 'Absent' });
  const callback = useSystemDefaults({ props: (value: number) => value + 1, name: 'Function' });
  const object = useMaterialDefaults({ props: { value: 4 }, name: 'Object' });
  // @ts-expect-error Material preserves the original record-bounded generic.
  useMaterialDefaults({ props: 'source', name: 'String' });
  return (
    <Text>
      {text}
      {String(nil)}
      {String(absent)}
      {callback(2)}
      {object.value}
    </Text>
  );
}

export const systemConfiguration = (
  <SystemDefaults value={{ Arbitrary: { anything: true }, mergeClassNameAndStyle: 'truthy' }} />
);
export const materialConfiguration = (
  <MaterialDefaults
    value={{ ...materialDefaults, MuiButton: { defaultProps: { size: 'small' } } }}
  />
);
// @ts-expect-error System requires its value prop even when the value is undefined.
export const missingSystemValue = <SystemDefaults />;
// @ts-expect-error System's declared value accepts undefined, not null.
export const nullSystemValue = <SystemDefaults value={null} />;
// @ts-expect-error Material's original declared value is required and excludes undefined.
export const undefinedMaterialValue = <MaterialDefaults value={undefined} />;
// @ts-expect-error Provider children use ReactNode, not a render callback.
export const renderCallbackChild = <SystemDefaults value={undefined}>{() => null}</SystemDefaults>;
// @ts-expect-error A pure context provider has no native View ref prop.
export const providerRef = <SystemDefaults value={undefined} ref={() => {}} />;
// @ts-expect-error Known component defaults retain their component's public types.
export const invalidButton = <MaterialDefaults value={{ MuiButton: { size: false } }} />;
export const invalidAugmentation = (
  <MaterialDefaults
    value={{
      MuiContractProbe: {
        // @ts-expect-error Augmented component defaults retain their declared literal types.
        marker: 'wrong',
      },
    }}
  />
);
