'use strict'

const qs = require('querystring');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const toCamelCase = (str) => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

module.exports = function(options = {}) {
  const plugins = {
    'postcss-import': {},
    'postcss-move-props-to-bg-image-query': {
      transform({ name, value }) {
        return {
          name: name.replace(/^-svg-mixer-/, ''),
          value: encodeURIComponent(value)
        }
      }
    },
    'postcss-pxtorem': {
      rootValue: 75,
      unitPrecision: 6,
      replace: true,
      mediaQuery: false,
      minPixelValue: 2,
      propList: ['*'],
      selectorBlackList: ['no-rem-', 'van-', 'mint-', 'weui-', '__nuxt-']
    },
    'autoprefixer': {}
  }

  if (options.webpack) {
    const webpack = options.webpack;
    const compiler = webpack._compiler;

    const entry = compiler.options.entry;
    const entryConfig = entry[Object.keys(entry)[0]];
    let entryFile;

    if (Array.isArray(entryConfig)) {
      entryFile = entryConfig[entryConfig.length - 1];
    }
    else {
      entryFile = entryConfig;
    }

    // 取入口所在目录的构建配置
    const projectConfigFile = path.join(path.dirname(entryFile), 'project.config.js');

    if (fs.existsSync(projectConfigFile)) {
      const projectConfig = require(projectConfigFile);

      if (_.isPlainObject(projectConfig.px2rem)) {
        _.merge(plugins['postcss-pxtorem'], projectConfig.px2rem);
      }
      else if (projectConfig.px2rem === false) {
        plugins['postcss-pxtorem'] = false;
      }
    }

    if (webpack.resourceQuery) {
      const config = qs.parse(webpack.resourceQuery.slice(1));

      if (config['no-px2rem'] !== undefined || config.noPx2rem !== undefined) {
        plugins['postcss-pxtorem'] = false;
      }
      else if (plugins['postcss-pxtorem']) {
        for (const key in config) {
          plugins['postcss-pxtorem'][toCamelCase(key)] = config[key];
        }
      }
    }
  }

  return {
    plugins
  }
}
