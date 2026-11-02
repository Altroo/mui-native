module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.altroo.muinativehost.AltrooMuiNativeHostPackage;',
        packageInstance: 'new AltrooMuiNativeHostPackage()',
      },
      ios: { podspecPath: './AltrooMuiNativeHost.podspec' },
    },
  },
};
