'use strict'

const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const { Volume  } = require('memfs');
const hotMiddleware = require('webpack-hot-middleware');
const merge = require('webpack-merge');

const { searchFolderFromUrl, mimes } = require('./helper');

const webpackConfig = require('../webpack.site.dev.conf');
const config = require('../../config/config.dev');

const memFs = new Volume();

memFs.join = path.join.bind(path);

const webpackCache = {};
const hotCache = {};

const middleware = (req, res, next) => {
  const uri = req.path;

  if (uri.indexOf(`/${config.siteEntryPrefix}/`) === 0) {
    const ext = path.extname(uri);
    const realPath = `/${path.relative(`/${config.siteEntryPrefix}`, uri)}`;
    const projectName = searchFolderFromUrl(realPath, config.siteRoot);

    if (!projectName) {
      next();
      return;
    }

    if (memFs.existsSync(realPath)) {
      const fileContent = memFs.readFileSync(realPath);
      res.setHeader('Content-Type', mimes[ext]);
      res.end(fileContent);

      return;
    }

    if (!/\.(?:js|ts|json)$/i.test(uri)) {
      next();
      return;
    }

    const entryPath = path.join(config.siteRoot, realPath);

    if (webpackCache[projectName]) {
      res.end('当前项目正在编译，请稍后刷新重试。');
      return;
    }

    const entryName = path.basename(uri, ext);

    let defaultWebpackConfig = webpackConfig({ entryName, entryPath, projectName });
    const myWebpackPath = `${path.dirname(entryPath)}/webpack.config.js`;

    if (fs.existsSync(myWebpackPath)) {
      const myWebpackConfig = require(myWebpackPath);
      defaultWebpackConfig = merge(defaultWebpackConfig, myWebpackConfig({ entryName, entryPath, projectName }));
    }

    const webpackCompiler = webpack(defaultWebpackConfig);

    webpackCache[projectName] = webpackCompiler;

    webpackCompiler.outputFileSystem = memFs;

    const callback = function(err, stats) {
      if (err) {
        console.log(err);
        return;
      }
      const jsonStats = stats ? stats.toJson() || {} : {};
      //console.log(jsonStats);
      const errors = jsonStats.errors || [];
      if (errors.length) {
        const errorMessage = errors.join('\n');
        console.log(errorMessage);
      }
    };

    webpackCompiler.hooks.afterEmit.tap('WebpackSiteMiddleware', () => {
      // console.log(Object.keys(compilation.assets));
      const fileContent = memFs.readFileSync(path.join(webpackCompiler.outputPath, `${entryName}.js`));
      res.end(fileContent);
    });

    webpackCompiler.watch({}, callback);
  }
  else if (uri.indexOf(`/${config.hmrPrefix}/site/`) === 0) {
    const realPath = `/${path.relative(`/${config.hmrPrefix}/site/`, uri)}`;
    const projectName = searchFolderFromUrl(realPath, config.siteRoot);

    if (!projectName) {
      next();
      return;
    }

    if (webpackCache[projectName]) {
      let mid;

      if (hotCache[projectName]) {
        mid = hotCache[projectName];
      }
      else {
        mid = hotMiddleware(webpackCache[projectName], {
          path: path.posix.join('/', config.hmrPrefix, 'site', projectName),
          heartbeat: 2000,
          log: false
        });
        hotCache[projectName] = mid;
      }

      mid(req, res, next);
    }
    else {
      // 异常情况下，让浏览器自动刷新
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/event-stream;charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no'
      });
      res.end('\ndata: {"action":"reload"}\n\n');
    }
  }
  else {
    next();
  }
}

module.exports = middleware;
