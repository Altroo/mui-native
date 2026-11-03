import { codegenNativeComponent, type ViewProps, type CodegenTypes } from 'react-native';
export interface NativeProps extends ViewProps {
  calibrationX?: CodegenTypes.WithDefault<CodegenTypes.Double, 0>;
  calibrationY?: CodegenTypes.WithDefault<CodegenTypes.Double, 0>;
  calibrationA?: CodegenTypes.WithDefault<CodegenTypes.Double, 1>;
  calibrationB?: CodegenTypes.WithDefault<CodegenTypes.Double, 0>;
  calibrationC?: CodegenTypes.WithDefault<CodegenTypes.Double, 0>;
  calibrationD?: CodegenTypes.WithDefault<CodegenTypes.Double, 1>;
}
export default codegenNativeComponent<NativeProps>('AltrooMUIPortalCanvas', {
  interfaceOnly: true,
});
