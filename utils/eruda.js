const camelCase = require('camel-case')
const path = require('path')
const fs = require('fs')

const loadModule = (module, options) => fs.readFileSync(require.resolve(module, options));

class ErudaPlugin {
  constructor(options = {}) {
    this.options = Object.assign({
      force: false,
      tool: [],
      plugins: [],
      entry: [],
      filters: []
    }, options);
  }

  apply(compiler) {
    const options = this.options
    if (compiler.options.mode !== 'development' && !options.force) {
      return
    }

    if (compiler.hooks) {
      compiler.hooks.emit.tap('ErudaPlugin', (compilation) => {
        this.resolve(compilation)
        return Promise.resolve()
      })
    } else {
      compiler.plugin('emit', (compilation, cb) => {
        this.resolve(compilation)
        return cb()
      })
    }
  }

  addPlugin() {
    const plugins = this.options.plugins
    let pluginsStr = ''

    Array.from(plugins).forEach((p) => {
      let plugin = p
      if (typeof plugin === 'string') {
        if (!plugin.startsWith('eruda')) { plugin = `eruda-${plugin}` }
        pluginsStr += `${loadModule(plugin, {
          paths: [process.cwd(), path.resolve(__dirname, '..')]
        })}
          eruda.add(${camelCase(plugin)});
        `
      }
    })
    return pluginsStr
  }

  resolve(compilation) {
    const options = this.options
    const filters = Array.isArray(options.filters) ? options.filters : [options.filters]
    const entry = Array.isArray(options.entry) ? options.entry : [options.entry]
    const eruda = loadModule('eruda')
    const assets = compilation.assets

    let initParams = ''
    if (options.tool.length) {
      initParams = {
        tool: options.tool
      }
    }

    const plugins = this.addPlugin()
    Object.keys(assets).forEach((asset) => {
      if (entry.length) {
        const isMatched = entry.some(en => en.test(asset))
        if (!isMatched) { return }
      } else if (filters.length) {
        const isMatched = filters.some(e => !e.test(asset))
        if (!isMatched) { return }
      }
      if (!/\.js$/.test(asset)) { return }
      let source = assets[asset].source()
      const erudaCode = `\n;(function() {
        try {
          if (!window.eruda || !window.eruda._isInit) {
            ${eruda};
            eruda.init(${JSON.stringify(initParams)});
            ${plugins}
          }
        }
        catch(e) {
          console.log(e);
        }
      })()`
      source += erudaCode
      compilation.assets[asset].source = () => source
      compilation.assets[asset].size = () => source.length
    })
  }
}

module.exports = ErudaPlugin
