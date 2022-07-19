'use strict'

// const isProduction = process.env.NODE_ENV === 'production';

const plugins = [
  ['@babel/plugin-transform-runtime', { corejs: 3, proposals: true, useESModules: true, regenerator: false }],
  '@babel/plugin-syntax-dynamic-import',
  '@babel/plugin-proposal-optional-chaining',
  '@babel/plugin-proposal-numeric-separator',
  ['@babel/plugin-proposal-decorators', { decoratorsBeforeExport: true }],
  '@babel/plugin-proposal-class-properties',
  '@babel/plugin-proposal-nullish-coalescing-operator',
  ['import', { libraryName: 'vant', libraryDirectory: 'es', style: true }, 'vant']
];

module.exports = {
  presets: [
    ['@babel/preset-env', {
      modules: false,
      targets: {
        browsers: ['android >= 4.4', 'ios >= 8', '> 1%'],
        node: 'current'
      },
      useBuiltIns: 'usage',
      corejs: 3
    }],
    '@vue/babel-preset-jsx'
  ],
  compact: false,
  plugins
};
