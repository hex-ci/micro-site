'use strict'

const loaders = require('./loaders')
const webpack = require('webpack')
const merge = require('webpack-merge')
const baseWebpackConfig = require('./webpack.base.conf')
const OptimizeCssnanoPlugin = require('@intervolga/optimize-cssnano-plugin');
const TerserPlugin = require('terser-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const hash = require('hash-sum')
const path = require('path')
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin')

const config = require('../config/config.dev');

const resolve = (dir) => path.join(__dirname, '..', dir)

module.exports = function({ entryName, entryPath, projectName }) {
  // For NamedChunksPlugin
  const seen = new Set()
  const nameLength = 4

  return merge(baseWebpackConfig({ entryName, entryPath, projectName }), {
    mode: 'production',

    entry: {
      [entryName]: entryPath
    },
    output: {
      path: resolve(`output/${config.ssrUrlPrefix}/${projectName}/client`),
      filename: '[name].[contenthash:8].js',
      chunkFilename: '[name].[contenthash:8].js',
      publicPath: `${config.cdnUrlPrefix}${config.ssrUrlPrefix}/${projectName}/client/`
    },
    module: {
      rules: loaders.styleLoaders({
        sourceMap: false,
        extract: true,
        usePostCSS: true,
        entryPath
      })
    },
    devtool: 'source-map',
    optimization: {
      namedModules: true,
      namedChunks: true,
      removeEmptyChunks: true,
      noEmitOnErrors: false,
      concatenateModules: true,
      mergeDuplicateChunks: true,
      removeAvailableModules: true,
      occurrenceOrder: false,
      chunkIds: 'named',
      moduleIds: 'hashed',
      runtimeChunk: {
        name: 'manifest'
      },
      splitChunks: {
        cacheGroups: {
          // 基础库
          vendors: {
            name: 'vendors',
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            // 只打包初始时依赖的第三方
            chunks: 'initial'
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: -20,
            chunks: 'initial',
            reuseExistingChunk: true
          }
          // 公用样式
          // styles: {
          //   name: 'styles',
          //   test: /\.s?css$/,
          //   chunks: 'all',
          //   minChunks: 1,
          //   priority: -30,
          //   enforce: true
          // }
        }
      },
      minimizer: [
        new TerserPlugin({
          cache: true,
          parallel: true,
          sourceMap: true,
          extractComments: false,
          terserOptions: {
            compress: {
              drop_console: true
            },
            mangle: {
              safari10: true
            },
            ie8: true
          }
        })
      ]
    },
    plugins: [
      new VueSSRClientPlugin(),
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash:8].css',
        chunkFilename: '[name].[contenthash:8].css'
      }),

      new OptimizeCssnanoPlugin({
        sourceMap: false,
        cssnanoOptions: {
          preset: [
            'default',
            {
              zindex: false,
              reduceIdents: false,
              reduceTransforms: false,
              svgo: false
            }
          ]
        }
      }),

      // keep chunk.id stable when chunk has no name
      new webpack.NamedChunksPlugin(chunk => {
        if (chunk.name) {
          return chunk.name
        }

        const modules = Array.from(chunk.modulesIterable)

        if (modules.length > 0) {
          const joinedHash = hash(modules.map(m => m.id).join('-'))
          let len = nameLength

          while (seen.has(joinedHash.substr(0, len))) {
            len++
          }

          const result = joinedHash.substr(0, len)

          seen.add(result)

          return result
        }
        else {
          console.log('NamedChunksPlugin Error!');

          return 'chunk-error';
        }
      })
    ]
  })
}
