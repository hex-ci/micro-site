'use strict'

const fs = require('fs')
const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const sass = require('sass')
const fiber = require('fibers')

const resolve = (dir) => path.join(__dirname, '..', dir)

exports.cssLoaders = function(options) {
  options = options || {}

  const cssLoader = {
    loader: 'css-loader',
    options: {
      sourceMap: options.sourceMap,
      importLoaders: (
        1 + // stylePostLoader injected by vue-loader
        (options.usePostCSS ? 1 : 0)
      ),
      modules: options.modules
    }
  }

  const postcssLoader = {
    loader: 'postcss-loader',
    options: {
      sourceMap: options.sourceMap
    }
  }

  const projectPath = path.dirname(options.entryPath)

  if (fs.existsSync(`${projectPath}/postcss.config.js`)) {
    const postcssConfig = require(resolve('postcss.config.js'))

    postcssLoader.options.config = {
      path: projectPath,
      ctx: postcssConfig()
    }
  }

  // generate loader string to be used with extract text plugin
  function generateLoaders(loader, loaderOptions) {
    const loaders = []

    // Extract CSS when that option is specified
    // (which is the case during production build)
    if (options.extract) {
      loaders.push({
        loader: MiniCssExtractPlugin.loader,
        options: {
          hmr: false
        }
      })
    }
    else {
      loaders.push({
        loader: 'vue-style-loader',
        options: {
          sourceMap: options.sourceMap,
          shadowMode: false
        }
      })
    }

    loaders.push(cssLoader)

    if (options.usePostCSS) {
      loaders.push(postcssLoader)
    }

    if (loader) {
      loaders.push({
        loader: loader + '-loader',
        options: Object.assign({}, loaderOptions, {
          sourceMap: options.sourceMap
        })
      })
    }

    return loaders
  }

  // https://vue-loader.vuejs.org/en/configurations/extract-css.html
  return {
    css: generateLoaders(),
    postcss: generateLoaders(),
    less: generateLoaders('less'),
    sass: generateLoaders('sass', {
      implementation: sass,
      sassOptions: {
        fiber,
        indentedSyntax: true
      }
    }),
    scss: generateLoaders('sass', {
      implementation: sass,
      sassOptions: {
        fiber
      }
    }),
    stylus: generateLoaders('stylus', { preferPathResolver: 'webpack' }),
    styl: generateLoaders('stylus', { preferPathResolver: 'webpack' })
  }
}

// Generate loaders for standalone style files (outside of .vue)
exports.styleLoaders = function(options) {
  const output = []
  const loaders = exports.cssLoaders(options)

  for (const extension in loaders) {
    const loader = loaders[extension]

    const specLoader = loader.map(item => {
      if (item.loader === 'css-loader') {
        item = Object.assign({}, item)
        item.options = Object.assign({}, item.options, {
          modules: {
            localIdentName: '[name]_[local]_[hash:base64:5]'
          }
        })
      }

      return item;
    })

    output.push({
      test: new RegExp('\\.' + extension + '$'),
      oneOf: [
        // rules for <style lang="module">
        {
          resourceQuery: /module/,
          use: specLoader
        },
        // rules for <style>
        {
          resourceQuery: /\?vue/,
          use: loader
        },
        // rules for *.module.* files
        {
          test: /\.module\.\w+$/,
          use: specLoader
        },
        // rules for normal CSS imports
        {
          use: loader
        }
      ]
    })
  }

  return output
}
