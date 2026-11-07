// This native editor reuses a reviewed React Native ABI; validate before autolinking.
require('./scripts/verify-native-input.cjs').verifyNativeInput();
module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        cmakeListsPath: '../android/CMakeLists.txt',
        cxxModuleHeaderName: 'AltrooStructuralObserver',
        componentDescriptors: [
          'AltrooMUITextInputComponentDescriptor',
          'AltrooMUIInteractiveViewComponentDescriptor',
          'AltrooMUINativePickerComponentDescriptor',
          'AltrooPortalHostComponentDescriptor',
          'AltrooPortalCanvasComponentDescriptor',
        ],
        packageImportPath: 'import com.altroo.muinativehost.AltrooMuiNativeHostPackage;',
        packageInstance: 'new AltrooMuiNativeHostPackage()',
      },
      ios: { podspecPath: './AltrooMuiNativeHost.podspec' },
    },
  },
};
