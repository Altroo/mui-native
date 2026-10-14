const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveMuiImport, withMuiNative } = require('./index.cjs');
test('public native subpaths map; browser imports stay original', () => {
  assert.equal(resolveMuiImport('@mui/material/Button', 'ios'), '@altroo/mui-native/Button');
  assert.equal(resolveMuiImport('@mui/material/Button', 'web'), '@mui/material/Button');
  assert.equal(resolveMuiImport('@mui/x-data-grid-premium', 'web'), '@mui/x-data-grid-premium');
  assert.throws(() => resolveMuiImport('@mui/x-data-grid-premium', 'ios'), /not implemented/);
  assert.throws(
    () => resolveMuiImport('@mui/material/internal/private', 'android'),
    /not implemented/,
  );
});
test('existing Metro resolver remains in the chain', () => {
  let observed;
  const config = withMuiNative({
    resolver: {
      resolveRequest: (_, name) => {
        observed = name;
        return 'ok';
      },
    },
  });
  assert.equal(config.resolver.resolveRequest({}, '@mui/material', 'android'), 'ok');
  assert.equal(observed, '@altroo/mui-native');
});
