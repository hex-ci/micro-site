'use strict'

process.env.NODE_ENV = 'production'

const ora = require('ora')
const del = require('del');
const path = require('path')
const chalk = require('chalk')
const webpack = require('webpack');
const minimist = require('minimist');
const fs = require('fs');
const merge = require('webpack-merge');
const webpackClientConfig = require('./webpack.client.prod.conf');
const webpackServerConfig = require('./webpack.server.prod.conf');

const config = require('../config/config.dev');

const argv = minimist(JSON.parse(process.env.npm_config_argv).original.slice(2));

if (argv._.length < 1) {
  console.log(chalk.yellow('\n请输入要构建的项目！\n'));

  process.exit(1);
}

const resolve = (dir) => path.join(__dirname, '..', dir);

const projectPath = argv._[0];

let serverEntry = 'entry-server.js';
let clientEntry = 'entry-client.js';

// 取入口所在目录的构建配置
const projectConfigFile = path.join(config.ssrRoot, `${projectPath}/project.config.js`);

if (fs.existsSync(projectConfigFile)) {
  const projectConfig = require(projectConfigFile);

  if (projectConfig.entry) {
    if (projectConfig.entry.server) {
      serverEntry = projectConfig.entry.server;
    }
    if (projectConfig.entry.client) {
      clientEntry = projectConfig.entry.client;
    }
  }
}

const serverEntryPath = path.join(config.ssrRoot, `${projectPath}/${serverEntry}`);
const clientEntryPath = path.join(config.ssrRoot, `${projectPath}/${clientEntry}`);

try {
  if (!fs.statSync(serverEntryPath).isFile() || !fs.statSync(clientEntryPath).isFile()) {
    throw 'not file!';
  }
}
catch (e) {
  console.log(chalk.yellow('\n服务端或客户端入口文件不存在！\n'));

  process.exit(1);
}

const entryName = 'app';

const spinner = ora('building for production...')
spinner.start()

del([resolve(`output/${config.ssrUrlPrefix}/${projectPath}`)]).then(() => {
  let defaultWebpackClientConfig = webpackClientConfig({ entryName, entryPath: clientEntryPath, projectName: projectPath });
  let defaultWebpackServerConfig = webpackServerConfig({ entryName, entryPath: serverEntryPath, projectName: projectPath });

  const myWebpackPath = path.join(config.ssrRoot, `${projectPath}/webpack.config.js`);

  if (fs.existsSync(myWebpackPath)) {
    const myWebpackConfig = require(myWebpackPath);
    defaultWebpackClientConfig = merge(defaultWebpackClientConfig, myWebpackConfig({ entryName, entryPath: clientEntryPath, projectName: projectPath, isServer: false }));
    defaultWebpackServerConfig = merge(defaultWebpackServerConfig, myWebpackConfig({ entryName, entryPath: serverEntryPath, projectName: projectPath, isServer: true }));
  }

  webpack(defaultWebpackServerConfig, function(err, stats) {
    if (err) {
      throw err
    }
    console.log('\n');
    process.stdout.write(stats.toString({
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false
    }) + '\n\n')

    fs.writeFileSync(resolve(`output/${config.ssrUrlPrefix}/${projectPath}/server/app.html`), fs.readFileSync(path.join(config.ssrRoot, `${projectPath}/app.html`)));

    if (stats.hasErrors()) {
      console.log(chalk.red('  Build server failed with errors.\n'))
      process.exit(1)
    }

    webpack(defaultWebpackClientConfig, function(err, stats) {
      spinner.stop()
      if (err) {
        throw err
      }
      console.log('\n');
      process.stdout.write(stats.toString({
        colors: true,
        modules: false,
        children: false,
        chunks: false,
        chunkModules: false
      }) + '\n\n')

      if (stats.hasErrors()) {
        console.log(chalk.red('  Build client failed with errors.\n'))
        process.exit(1)
      }

      console.log(chalk.cyan('  Build complete.\n'))
    });
  });
});
