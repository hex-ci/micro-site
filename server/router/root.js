const express = require('express');
const router = express.Router();
const path = require('path');
const { createBundleRenderer } = require('vue-server-renderer');
const { readFile } = require('../common');

router.get('/', function(req, res, next) {
  route(req, res, next);
});

router.post('/', function(req, res, next) {
  route(req, res, next);
});

async function route(req, res, next) {
  const projectName = req.app.locals.serverConfig.defaultProject;
  const ssrPath = req.app.locals.serverConfig.ssrPath;
  const ssrUrlPrefix = req.app.locals.serverConfig.ssrUrlPrefix;
  const url = `/${ssrUrlPrefix}/${projectName}`;

  try {
    if (req.app.locals.rendererCache[projectName]) {
      const context = {
        url
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
      url
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
}

module.exports = router;
