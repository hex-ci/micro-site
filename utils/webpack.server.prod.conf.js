'use strict'

const path = require('path');
const loaders = require('./loaders')
const merge = require('webpack-merge')
const baseWebpackConfig = require('./webpack.base.conf')
const VueSSRServerPlugin = require('vue-server-renderer/server-plugin')
const nodeExternals = require('webpack-node-externals')

const config = require('../config/config.dev');

const resolve = (dir) => path.join(__dirname, '..', dir)

module.exports = function({ entryName, entryPath, projectName }) {
  return merge(baseWebpackConfig({ entryName, entryPath, projectName }), {
    mode: 'production',
    target: 'node',
    devtool: 'source-map',

    entry: {
      [entryName]: entryPath
    },

    output: {
      path: resolve(`output/${config.ssrUrlPrefix}/${projectName}/server`),
      filename: '[name].[contenthash:8].js',
      chunkFilename: '[name].[contenthash:8].js',
      publicPath: `${config.cdnUrlPrefix}${config.ssrUrlPrefix}/${projectName}/client/`,
      libraryTarget: 'commonjs2'
    },

    module: {
      rules: loaders.styleLoaders({
        sourceMap: false,
        extract: false,
        usePostCSS: true,
        entryPath,
        modules: {
          exportOnlyLocals: true
        }
      })
    },

    // https://webpack.js.org/configuration/externals/#function
    // https://github.com/liady/webpack-node-externals
    // 外置化应用程序依赖模块。可以使服务器构建速度更快，
    // 并生成较小的 bundle 文件。
    externals: nodeExternals({
    // 不要外置化 webpack 需要处理的依赖模块。
    // 你可以在这里添加更多的文件类型。例如，未处理 *.vue 原始文件，
    // 你还应该将修改 `global`（例如 polyfill）的依赖模块列入白名单
      whitelist: [/\.css$/]
    }),

    // 这是将服务器的整个输出
    // 构建为单个 JSON 文件的插件。
    // 默认文件名为 `vue-ssr-server-bundle.json`
    plugins: [
      new VueSSRServerPlugin()
    ]
  })
}
