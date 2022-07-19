const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { createBundleRenderer } = require('vue-server-renderer');
const { readFile } = require('../common');

router.get('/', function(req, res, next) {
  route(req, res, next);
});

router.post('/', function(req, res, next) {
  route(req, res, next);
});

// 查找文件夹
const searchFolder = (rootPath, searchArray, searchIndex, callback) => {
  if (searchIndex > searchArray.length) {
    // 所有目录都存在
    callback(searchArray.join('/'));
    return;
  }

  const currentPath = searchArray.slice(0, searchIndex).join('/');

  fs.stat(rootPath + currentPath, (err, stat) => {
    if (err || !stat.isDirectory()) {
      // 目录不存在，返回
      callback(searchArray.slice(0, searchIndex - 1).join('/'));
    }
    else {
      // 目录存在，继续下一级
      searchFolder(rootPath, searchArray, searchIndex + 1, callback);
    }
  });
}

function route(req, res, next) {
  const uri = splitPath(req.baseUrl);
  const ssrPath = req.app.locals.serverConfig.ssrPath;

  // 查找 controller 文件夹
  searchFolder(ssrPath, uri.split('/'), 2, async (projectName) => {
    try {
      if (req.app.locals.rendererCache[projectName]) {
        const context = {
          url: req.baseUrl
        };

        req.app.locals.rendererCache[projectName].renderToString(context, (err, html) => {
          if (err) {
            return next(err);
          }

          res.end(html);
        });

        return;
      }

      const template = await readFile(path.join(ssrPath, `${projectName}/server/app.html`));
      const serverBundleFile = await readFile(path.join(ssrPath, `${projectName}/server/vue-ssr-server-bundle.json`));
      const clientManifestFile = await readFile(path.join(ssrPath, `${projectName}/client/vue-ssr-client-manifest.json`));
      const serverBundle = JSON.parse(serverBundleFile);
      const clientManifest = JSON.parse(clientManifestFile);

      const renderer = createBundleRenderer(serverBundle, {
        runInNewContext: false,
        template,
        clientManifest
      });

      req.app.locals.rendererCache[projectName] = renderer;

      const context = {
        url: req.baseUrl
      };

      renderer.renderToString(context, (err, html) => {
        if (err) {
          return next(err);
        }

        res.end(html);
      });
    }
    catch (err) {
      next(err);
    }
  });
}

function splitPath(uri) {
  const uriArr = uri.split('/');
  const path = `/${uriArr.slice(2).join('/')}`;

  return path;
}

module.exports = router;
