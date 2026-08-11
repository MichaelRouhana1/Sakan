// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// ---------------------------------------------------------------------------
// Fix: react-native-svg v15 ships a `"react-native": "src/index.ts"` field
// in its package.json.  Metro follows that entry point and then fails to
// resolve internal relative imports (e.g. `./lib/extract/types`) on Windows.
//
// We intercept every request whose origin is inside react-native-svg/src and
// redirect the root import to the pre-compiled CommonJS build instead.
// ---------------------------------------------------------------------------
const rnsvgSrc = path.resolve(
  __dirname,
  'node_modules',
  'react-native-svg',
  'src',
);
const rnsvgCommonJS = path.resolve(
  __dirname,
  'node_modules',
  'react-native-svg',
  'lib',
  'commonjs',
  'index.js',
);

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // When anything imports "react-native-svg" by name, send it straight to
  // the pre-compiled CommonJS bundle so Metro never enters the src/ tree.
  if (moduleName === 'react-native-svg') {
    return { filePath: rnsvgCommonJS, type: 'sourceFile' };
  }

  // Default resolver
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
