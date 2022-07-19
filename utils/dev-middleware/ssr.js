'use strict'

const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const { Volume  } = require('memfs');
const hotMiddleware = require('webpack-hot-middleware');
const { createBundleRenderer } = require('vue-server-renderer')

const { searchFolderFromUrl, mimes } = require('./helper');

const webpackClientConfig = require('../webpack.client.dev.conf');
const webpackServerConfig = require('../webpack.server.dev.conf');
const config = require('../../config/config.dev');

const memFs = new Volume();

memFs.join = path.join.bind(path);

const webpackCache = {};
const hotCache = {};
const rendererCache = {};

const middleware = (req, res, next) => {
  const uri = req.path;

  if (uri.indexOf(`/${config.ssrUrlPrefix}/`) === 0) {
    const realPath = `/${path.relative(`/${config.ssrUrlPrefix}`, uri)}`;
    const projectName = searchFolderFromUrl(realPath, config.ssrRoot);

    if (!projectName) {
      next();
      return;
    }

    if (rendererCache[projectName]) {
      const context = {
        url: uri
      };

      rendererCache[projectName].renderToString(context, (err, html) => {
        if (err) {
          res.sendStatus(500);
          return;
        }

        res.end(html)
      });

      return;
    }

    const serverEntryPath = path.join(config.ssrRoot, `${projectName}/entry-server.js`);
    const clientEntryPath = path.join(config.ssrRoot, `${projectName}/entry-client.js`);

    let serverBundle;
    let clientManifest;

    const defaultWebpackServerConfig = webpackServerConfig({ entryName: 'app', entryPath: serverEntryPath, projectName });
    const webpackServerCompiler = webpack(defaultWebpackServerConfig);

    const defaultWebpackClientConfig = webpackClientConfig({ entryName: 'app', entryPath: clientEntryPath, projectName });
    const webpackClientCompiler = webpack(defaultWebpackClientConfig);

    webpackCache[projectName] = webpackClientCompiler;

    webpackServerCompiler.outputFileSystem = memFs;
    webpackClientCompiler.outputFileSystem = memFs;

    const callback = (err, stats) => {
      if (err) {
        console.log(err);
        return;
      }
      const jsonStats = stats ? stats.toJson() || {} : {};
      // console.log(jsonStats);
      const errors = jsonStats.errors || [];
      if (errors.length) {
        const errorMessage = errors.join('\n');
        console.log(errorMessage);
      }
    };

    const update = () => {
      if (serverBundle && clientManifest) {
        const template = fs.readFileSync(path.join(config.ssrRoot, `${projectName}/app.html`), 'utf-8');

        const renderer = createBundleRenderer(serverBundle, {
          runInNewContext: false,
          template,
          clientManifest
        });

        rendererCache[projectName] = renderer;

        const context = {
          url: uri
        };

        renderer.renderToString(context, (err, html) => {
          if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
          }

          res.end(html)
        });
      }
    };

    webpackServerCompiler.hooks.afterEmit.tap('WebpackServerMiddleware', () => {
      serverBundle = JSON.parse(memFs.readFileSync(path.join(webpackServerCompiler.outputPath, `vue-ssr-server-bundle.json`)));
      update();
    });
    webpackServerCompiler.watch({}, callback);

    webpackClientCompiler.hooks.afterEmit.tap('WebpackClientMiddleware', () => {
      clientManifest = JSON.parse(memFs.readFileSync(path.join(webpackClientCompiler.outputPath, `vue-ssr-client-manifest.json`)));
      update();
    });
    webpackClientCompiler.watch({}, callback);
  }
  else if (uri.indexOf(`/${config.ssrEntryPrefix}/`) === 0) {
    const ext = path.extname(uri);
    const realPath = `/client/${path.relative(`/${config.ssrEntryPrefix}`, uri)}`;

    if (memFs.existsSync(realPath)) {
      const fileContent = memFs.readFileSync(realPath);
      res.setHeader('Content-Type', mimes[ext]);
      res.end(fileContent);
    }
    else {
      next();
    }
  }
  else if (uri.indexOf(`/${config.hmrPrefix}/ssr/`) === 0) {
    const realPath = `/${path.relative(`/${config.hmrPrefix}/ssr`, uri)}`;
    const projectName = searchFolderFromUrl(realPath, config.ssrRoot);

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
          path: path.posix.join('/', config.hmrPrefix, 'ssr', projectName),
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
