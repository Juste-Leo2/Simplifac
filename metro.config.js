const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    assetExts: [...defaultConfig.resolver.assetExts, 'bin', 'onnx', 'model'],
    resolveRequest: (context, moduleName, platform) => {
      // Ignorer les dépendances web/node de transformers.js (car on utilise react-native)
      if (
        moduleName.startsWith('onnxruntime-node') ||
        moduleName.startsWith('onnxruntime-web')
      ) {
        return {
          type: 'empty',
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
