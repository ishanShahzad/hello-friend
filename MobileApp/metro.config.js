const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Use path.resolve to get the absolute path
const projectRoot = path.resolve(__dirname);
const nodeModulesPath = path.resolve(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

// Ensure the project root is set correctly
config.projectRoot = projectRoot;

// Ensure node_modules is in the watch folders
config.watchFolders = [projectRoot, nodeModulesPath];

// Ensure the resolver can find modules
config.resolver.nodeModulesPaths = [nodeModulesPath];

// Disable watchman to avoid issues with paths containing spaces
config.resolver.useWatchman = false;

module.exports = config;
