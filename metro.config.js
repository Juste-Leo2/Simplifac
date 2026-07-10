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
      // Ignorer onnxruntime-node
      if (moduleName.startsWith('onnxruntime-node')) {
        return {
          type: 'empty',
        };
      }
      // Rediriger onnxruntime-web vers onnxruntime-react-native
      if (moduleName.startsWith('onnxruntime-web')) {
        return context.resolveRequest(context, 'onnxruntime-react-native', platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
