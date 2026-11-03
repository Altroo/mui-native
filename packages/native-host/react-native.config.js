module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        cmakeListsPath: '../android/CMakeLists.txt',
        componentDescriptors: [
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
