'use strict'

const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const compress = require('compression');
const express = require('express');
const qs = require('qs');

const siteMiddleware = require('./site');
const ssrMiddleware = require('./ssr');

const config = require('../../config/config.dev');

const devMiddleware = ({ app }) => {
  // 设置用于 server 的开发环境配置
  app.locals.serverConfig.baseUrl = config.baseUrl;
  app.locals.serverConfig.sitePath = config.siteRoot;
  app.locals.serverConfig.ssrPath = config.ssrRoot;

  app.use(compress());

  app.use(express.static(path.join(config.root, 'src/static')));

  app.use('/favicon.ico', (req, res) => {
    res.sendFile(path.join(config.root, 'favicon.ico'));
  });

  // api 接口代理中间件
  app.use(createProxyMiddleware('/api/', {
    target: config.baseUrl,
    changeOrigin: true,
    auth: config.auth,
    onProxyReq(proxyReq, req) {
      // 处理 http-proxy-middleware 和 body-parser 冲突的问题

      if (!req.body || !Object.keys(req.body).length) {
        return;
      }

      const contentType = proxyReq.getHeader('Content-Type');

      const writeBody = (bodyData) => {
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      };

      if (contentType.includes('application/json')) {
        writeBody(JSON.stringify(req.body));
      }
      else if (contentType === 'application/x-www-form-urlencoded') {
        writeBody(qs.stringify(req.body));
      }
    }
  }));

  // 编译 webpack 中间件
  app.use(siteMiddleware);
  app.use(ssrMiddleware);
  app.use('/', (req, res, next) => {
    if (req.path === '/') {
      res.redirect(`/ssr/${config.defaultProject}`);
    }
    else {
      next();
    }
  });

  return {
    host: config.host,
    port: config.port
  };
}

module.exports = devMiddleware;
