const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const cbT = require('cb-template');

const siteRouter = require('./router/site');
const ssrRouter = require('./router/ssr');
const rootRouter = require('./router/root');

const config = require('./config');

// 设置全局配置信息
global.serverPath = __dirname;

let host = config.host;
let port = config.port;

const app = express()

// 初始化配置信息
app.locals.serverConfig = {
  serverPath: __dirname,
  baseUrl: config.baseUrl,
  sitePath: config.sitePath,
  ssrPath: config.ssrPath,
  defaultProject: config.defaultProject,
  ssrUrlPrefix: config.ssrUrlPrefix
};

app.locals.rendererCache = {};

app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '6mb' }));
app.use(bodyParser.urlencoded({ limit: '6mb', extended: false }));
app.use(cookieParser());

const engine = cbT.getInstance();

// 定义模板引擎
app.engine('html', function(filePath, options, callback) {
  engine.renderFile(filePath, { ...options }, {}, (err, content) => {
    if (err) {
      return callback(err);
    }

    return callback(null, content);
  });
});
app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'html');

const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
  // 开发环境创建开发服务器
  const createDevServer = require('../utils/dev-middleware');
  ({ host, port } = createDevServer({ app }));
}
else {
  app.disable('x-powered-by');

  // 用于 ssr 的中间件
  app.use('/ssr/*', ssrRouter);
  app.use(express.static(config.staticPath));
}

// 用于 site 的中间件
app.use('/site/*', siteRouter);

// 用于显示首页
app.use('/', rootRouter);

// eslint-disable-next-line no-unused-vars
app.use(function(err, req, res, next) {
  // treat as 404
  if (err.code === 404 || (err.message && /not found/i.test(err.message))) {
    return next();
  }

  console.error(err);

  if (err.stack && err.stack.includes('ValidationError')) {
    res.status(422).render('422', { error: err.stack });
    return;
  }

  // error page
  res.status(500).render('500', { error: err.stack });
});

app.use(function(req, res) {
  const payload = {
    url: req.originalUrl,
    error: 'Not found'
  };

  if (req.xhr) {
    return res.status(404).json(payload);
  }

  res.status(404).render('404', payload);
});

// Listen the server
app.listen(port, host);

console.log(`Server listening on http://${host}:${port}`);
