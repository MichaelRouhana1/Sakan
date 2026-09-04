// Learn more https://docs.expo.dev/guides/customizing-metro
const fs = require("fs");
const path = require("path");
const gracefulFs = require("graceful-fs");
const { getDefaultConfig } = require("expo/metro-config");

// Windows hits EMFILE when Metro's cache store opens thousands of `.mp`
// files in parallel (web + SSR + native). Queue the extras instead of crashing.
gracefulFs.gracefulify(fs);

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.maxWorkers = process.platform === "win32" ? 2 : Math.min(4, config.maxWorkers || 4);

if (process.platform === "win32") {
  // Metro's default FileStore lives in %TEMP%/metro-cache and opens
  // thousands of `.mp` files in parallel. Windows then throws EMFILE.
  // In-memory only: first bundle is slower, but the bundler stops crashing.
  config.cacheStores = [];
  if (config.watcher?.unstable_autoSaveCache) {
    config.watcher.unstable_autoSaveCache.enabled = false;
  }
}

const existingBlock = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existingBlock)
    ? existingBlock
    : existingBlock
      ? [existingBlock]
      : []),
  /[\\/]assets[\\/]benefits[\\/]_tmp_[^\\/]+[\\/].*/,
];

// ---------------------------------------------------------------------------
// Fix: react-native-svg v15 ships a `"react-native": "src/index.ts"` field
// in its package.json.  Metro follows that entry point and then fails to
// resolve internal relative imports (e.g. `./lib/extract/types`) on Windows.
//
// We intercept every request whose origin is inside react-native-svg/src and
// redirect the root import to the pre-compiled CommonJS build instead.
// ---------------------------------------------------------------------------
const rnsvgCommonJS = path.resolve(
  __dirname,
  "node_modules",
  "react-native-svg",
  "lib",
  "commonjs",
  "index.js",
);

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // When anything imports "react-native-svg" by name, send it straight to
  // the pre-compiled CommonJS bundle so Metro never enters the src/ tree.
  if (moduleName === "react-native-svg") {
    return { filePath: rnsvgCommonJS, type: "sourceFile" };
  }

  // Default resolver
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Allow local OAuth popups to close and send session tokens back to the main window
config.server = {
  enhanceMiddleware: (metroMiddleware) => {
    return (req, res, next) => {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
      return metroMiddleware(req, res, next);
    };
  },
};

module.exports = config;
