'use strict'

const path = require('path')
const crypto = require('crypto')
const fs = require('fs')
const StyleLintPlugin = require('stylelint-webpack-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')

const config = require('../config/config.dev');

const resolve = (dir) => path.join(__dirname, '..', dir)

module.exports = function({ projectName, entryPath }) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cacheIdentifierSuffix = crypto.createHash('md5').update(projectName).digest('hex').substr(6, 7) + '-' + (isProduction ? 'prod' : 'dev');

  const jsRuleUse = [
    {
      loader: 'cache-loader',
      options: {
        cacheDirectory: resolve('node_modules/.cache/babel-loader'),
        cacheIdentifier: 'babel-' + cacheIdentifierSuffix
      }
    },
    { loader: 'thread-loader' },
    { loader: 'babel-loader' }
  ];

  if (!isProduction) {
    // 非生产模式去掉 thread-loader
    jsRuleUse.splice(1, 1);
  }

  const tsRuleUse = [
    {
      loader: 'cache-loader',
      options: {
        cacheDirectory: resolve('node_modules/.cache/ts-loader'),
        cacheIdentifier: 'ts-' + cacheIdentifierSuffix
      }
    },
    { loader: 'thread-loader' },
    { loader: 'babel-loader' },
    {
      loader: 'ts-loader',
      options: {
        // transpileOnly: true,
        appendTsSuffixTo: [/\.vue$/],
        happyPackMode: isProduction
      }
    }
  ];

  if (!isProduction) {
    // 非生产模式去掉 thread-loader
    tsRuleUse.splice(1, 1);
  }

  const entryDir = path.dirname(entryPath);
  const babelConfigFile = path.join(entryDir, 'babel.config.js');

  if (fs.existsSync(babelConfigFile)) {
    jsRuleUse.forEach((item) => {
      if (item.loader === 'babel-loader') {
        item.options = {
          configFile: babelConfigFile
        }
      }
    })

    tsRuleUse.forEach((item) => {
      if (item.loader === 'babel-loader') {
        item.options = {
          configFile: babelConfigFile
        }
      }
    })
  }

  return {
    resolve: {
      extensions: ['.js', '.mjs', '.vue', '.json', '.ts'],
      alias: {
        'vue$': 'vue/dist/vue.runtime.esm.js',
        '@site': config.siteRoot,
        '@@site': path.join(config.siteRoot, `${projectName}`),
        '@ssr': config.ssrRoot,
        '@@ssr': path.join(config.ssrRoot, `${projectName}`)
      }
    },
    externals: {
    },
    module: {
      noParse: [
        /^(vue|vue-router|vuex|vuex-router-sync)$/,
        /moment\.js/,
        /lodash/
      ],
      rules: [
        {
          test: /\.(js|vue)$/,
          loader: 'eslint-loader',
          enforce: 'pre',
          include: [config.siteRoot, config.ssrRoot],
          options: {
            extensions: [
              '.js',
              '.vue'
            ],
            cache: true,
            cacheIdentifier: 'eslint-' + cacheIdentifierSuffix,
            emitWarning: true,
            emitError: true,
            formatter: require('eslint-friendly-formatter')
          }
        },
        {
          test: /\.vue$/,
          use: [
            {
              loader: 'vue-loader',
              options: {
                compilerOptions: {
                  preserveWhitespace: false
                },
                transformAssetUrls: {
                  video: ['src', 'poster'],
                  audio: 'src',
                  source: 'src',
                  img: 'src',
                  image: ['xlink:href', 'href'],
                  use: ['xlink:href', 'href']
                }
              }
            }
          ]
        },
        // {
        //   test: /\.ts$/,
        //   loader: 'tslint-loader',
        //   enforce: 'pre',
        //   include: [config.siteRoot]
        // },
        {
          test: /\.(js|mjs)$/,
          include: [
            config.siteRoot,
            config.ssrRoot,
            // 支持 plyr 播放器
            resolve('node_modules/plyr')
          ],
          use: jsRuleUse
        },
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: tsRuleUse
        },
        // {
        //   test: /\.svg$/,
        //   loader: 'svg-sprite-loader',
        //   include: [path.join(config.siteRoot, `${projectName}/icons`)],
        //   options: {
        //     symbolId: 'icon-[name]'
        //   }
        // },
        {
          test: /\.svg(\?.*)?$/,
          use: [
            {
              loader: 'svg-url-loader',
              options: {
                name: '[name].[hash:8].[ext]',
                limit: 4096,
                iesafe: true,
                stripdeclarations: true
              }
            },
            'svg-transform-loader',
            'svgo-loader'
          ]
        },
        {
          test: /\.(png|jpe?g|gif)(\?.*)?$/,
          loader: 'url-loader',
          options: {
            limit: 4096,
            fallback: {
              loader: 'file-loader',
              options: {
                name: '[name].[hash:8].[ext]'
              }
            }
          }
        },
        {
          test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
          loader: 'url-loader',
          options: {
            limit: 4096,
            fallback: {
              loader: 'file-loader',
              options: {
                name: '[name].[hash:8].[ext]'
              }
            }
          }
        }
      ]
    },
    plugins: [
      new VueLoaderPlugin(),
      new StyleLintPlugin({
        files: [
          path.relative(path.join(__dirname, '..'), path.join(config.siteRoot, `${projectName}/**/*.vue`)),
          path.relative(path.join(__dirname, '..'), path.join(config.siteRoot, `${projectName}/**/*.scss`)),
          path.relative(path.join(__dirname, '..'), path.join(config.ssrRoot, `${projectName}/**/*.vue`)),
          path.relative(path.join(__dirname, '..'), path.join(config.ssrRoot, `${projectName}/**/*.scss`))
        ]
      })
    ],
    node: {
      // prevent webpack from injecting useless setImmediate polyfill because Vue
      // source contains it (although only uses it if it's native).
      setImmediate: false,
      // prevent webpack from injecting mocks to Node native modules
      // that does not make sense for the client
      dgram: 'empty',
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      child_process: 'empty'
    }
  };
};
