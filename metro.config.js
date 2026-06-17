const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  const { transformer, resolver } = config;

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
  };

  config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...resolver.sourceExts, 'svg'],
  };

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && (moduleName === 'react-native-maps' || moduleName.startsWith('react-native-maps/'))) {
      return {
        filePath: path.resolve(__dirname, 'src/utils/react-native-maps-mock.web.tsx'),
        type: 'sourceFile',
      };
    }
    return context.resolveRequest(context, moduleName, platform);
  };

  return config;
})();
