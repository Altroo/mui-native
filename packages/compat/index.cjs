const supported = require('./supported.json');
function resolveMuiImport(name, platform) {
  if (platform !== 'ios' && platform !== 'android') return name;
  if (!name.startsWith('@mui/')) return name;
  const root = name.split('/').slice(0, 2).join('/');
  const subpath = name.slice(root.length + 1);
  const config = supported[root];
  if (!config || (subpath && !config.subpaths.includes(subpath)))
    throw new Error(
      `[mui-native:import] ${name} is not implemented for native. See the compatibility inventory.`,
    );
  return config.target + (subpath ? '/' + subpath : '');
}
function withMuiNative(config) {
  const previous = config.resolver?.resolveRequest;
  return {
    ...config,
    resolver: {
      ...config.resolver,
      resolveRequest(context, name, platform) {
        return (previous ?? context.resolveRequest)(
          context,
          resolveMuiImport(name, platform),
          platform,
        );
      },
    },
  };
}
module.exports = { resolveMuiImport, withMuiNative };
function createNativeTsconfig({
  extends: base = './tsconfig.json',
  nodeModulesPath = './node_modules',
} = {}) {
  const paths = {};
  for (const [name, config] of Object.entries(supported)) {
    for (const subpath of ['', ...config.subpaths]) {
      paths[name + (subpath ? '/' + subpath : '')] = [
        `${nodeModulesPath}/${config.target}/dist/${subpath ? subpath + '/' : ''}index.d.ts`,
      ];
    }
  }
  return { extends: base, compilerOptions: { customConditions: ['react-native'], paths } };
}
module.exports.createNativeTsconfig = createNativeTsconfig;
