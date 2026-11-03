import { codegenNativeComponent, type ViewProps, type CodegenTypes } from 'react-native';
type PortalLayout = Readonly<{
  revision: string;
  presented: boolean;
  reason: string;
  x: CodegenTypes.Double;
  y: CodegenTypes.Double;
  width: CodegenTypes.Double;
  height: CodegenTypes.Double;
  rootX: CodegenTypes.Double;
  rootY: CodegenTypes.Double;
  rootA: CodegenTypes.Double;
  rootB: CodegenTypes.Double;
  rootC: CodegenTypes.Double;
  rootD: CodegenTypes.Double;
  a: CodegenTypes.Double;
  b: CodegenTypes.Double;
  c: CodegenTypes.Double;
  d: CodegenTypes.Double;
}>;
type PortalObservation = Readonly<{
  revision: string;
  observationRevision: string;
  observedTag: CodegenTypes.Int32;
  presented: boolean;
  anchorAvailable: boolean;
  reason: string;
  anchor: Readonly<{
    x: CodegenTypes.Double;
    y: CodegenTypes.Double;
    width: CodegenTypes.Double;
    height: CodegenTypes.Double;
  }>;
  referenceClip: Readonly<{
    present: boolean;
    x: CodegenTypes.Double;
    y: CodegenTypes.Double;
    width: CodegenTypes.Double;
    height: CodegenTypes.Double;
  }>;
  popperClip: Readonly<{
    present: boolean;
    x: CodegenTypes.Double;
    y: CodegenTypes.Double;
    width: CodegenTypes.Double;
    height: CodegenTypes.Double;
  }>;
  viewport: Readonly<{
    x: CodegenTypes.Double;
    y: CodegenTypes.Double;
    width: CodegenTypes.Double;
    height: CodegenTypes.Double;
  }>;
  window: Readonly<{
    x: CodegenTypes.Double;
    y: CodegenTypes.Double;
    width: CodegenTypes.Double;
    height: CodegenTypes.Double;
  }>;
}>;
export interface NativeProps extends ViewProps {
  active?: CodegenTypes.WithDefault<boolean, false>;
  revision?: string;
  containerTag?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  layer?: CodegenTypes.WithDefault<CodegenTypes.Double, 0>;
  observedTag?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  observationRevision?: string;
  onPortalObservation?: CodegenTypes.DirectEventHandler<PortalObservation>;
  viewportX?: CodegenTypes.WithDefault<CodegenTypes.Double, 0>;
  viewportY?: CodegenTypes.WithDefault<CodegenTypes.Double, 0>;
  viewportA?: CodegenTypes.WithDefault<CodegenTypes.Double, 1>;
  viewportB?: CodegenTypes.WithDefault<CodegenTypes.Double, 0>;
  viewportC?: CodegenTypes.WithDefault<CodegenTypes.Double, 0>;
  viewportD?: CodegenTypes.WithDefault<CodegenTypes.Double, 1>;
  onPortalLayout?: CodegenTypes.DirectEventHandler<PortalLayout>;
}
export default codegenNativeComponent<NativeProps>('AltrooMUIPortalHost', { interfaceOnly: true });
