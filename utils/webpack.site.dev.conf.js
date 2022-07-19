'use strict'

const loaders = require('./loaders')
const webpack = require('webpack')
const merge = require('webpack-merge')
const ErudaWebpackPlugin = require('./eruda')
const baseWebpackConfig = require('./webpack.base.conf')

const config = require('../config/config.dev');

module.exports = function({ entryName, entryPath, projectName }) {
  return merge(baseWebpackConfig({ entryName, entryPath, projectName }), {
    mode: 'development',

    entry: {
      [entryName]: [
        `${__dirname}/dev-client.js?/${config.hmrPrefix}/site/${projectName}`,
        entryPath
      ]
    },
    output: {
      path: `/${projectName}`,
      filename: '[name].js',
      publicPath: `/${config.siteEntryPrefix}/${projectName}/`
    },
    module: {
      rules: loaders.styleLoaders({
        sourceMap: true,
        usePostCSS: true,
        entryPath
      })
    },
    devtool: 'cheap-module-eval-source-map',
    plugins: [
      new webpack.HotModuleReplacementPlugin(),
      new ErudaWebpackPlugin({
        plugins: ['dom', 'features', 'orientation', 'touches']
      })
    ]
  })
}
