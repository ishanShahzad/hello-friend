const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Reduce file watching to avoid EMFILE error
config.watchFolders = [__dirname];
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx'];

// Ignore unnecessary directories
config.watchFolders = [];
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/.*/,
];

module.exports = config;
