const path = require('path');
const fs = require('fs');

const fileExists = (filepath) => {
  try {
    return fs.statSync(filepath).isFile();
  } catch (e) {
    return false;
  }
};

const rootPath = path.resolve(__dirname, '..');
const serverRoot = path.join(rootPath, 'server');
const siteRoot = path.join(rootPath, 'src', 'site');
const ssrRoot = path.join(rootPath, 'src', 'ssr');

// 检查用于开发的配置文件是否存在，不存在自动用默认配置创建一个
const siteConfig = path.join(rootPath, 'config', 'config.js');

if (!fileExists(siteConfig)) {
  fs.writeFileSync(siteConfig, fs.readFileSync(path.join(rootPath, 'config', 'config.example.js')));
}

//引用本地配置文件
const config = require('./config');

module.exports = {
  port: config.port || 8080,
  host: config.host || '127.0.0.1',
  auth: config.serverAuth || '',
  baseUrl: config.baseUrl,
  gitlabPersonalAccessToken: config.gitlabPersonalAccessToken || '',

  // CDN URL 前缀，结尾需要斜杠
  cdnUrlPrefix: 'https://domain.com/cdn/',
  // 非 ssr 开发环境的 webpack 入口文件路径前缀，在 html 中的入口文件需要以这个为开头（一般不需要修改）
  siteEntryPrefix: 'site-res',
  // ssr 开发环境的 webpack 入口文件路径前缀，项目中的静态文件路径也会以这个为开头(一般不需要修改)
  ssrEntryPrefix: 'ssr-res',
  ssrUrlPrefix: 'ssr',
  siteUrlPrefix: 'site',
  // 开发环境热更新 URL 前缀，无特殊情况不需要修改
  hmrPrefix: '__site_webpack_hmr',
  // 首页使用的项目，只能是 SSR 项目
  defaultProject: 'hello/world',
  root: rootPath,
  siteRoot,
  ssrRoot,
  serverRoot,
  ossOptions: {
    accessKeyId: '',
    secretAccessKey: '',
    endpoint: 'http://oss-cn-beijing.aliyuncs.com',
    apiVersion: '2013-10-15',
    bucket: ''
  }
};
