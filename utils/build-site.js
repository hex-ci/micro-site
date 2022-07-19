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
const webpackConfig = require('./webpack.site.prod.conf');
const _ = require('lodash');

const config = require('../config/config.dev');

const argv = minimist(JSON.parse(process.env.npm_config_argv).original.slice(2));

if (argv._.length < 1) {
  console.log(chalk.yellow('\n请输入要构建的项目！\n'));

  process.exit(1);
}

const resolve = (dir) => path.join(__dirname, '..', dir);

const projectPath = argv._[0];

let entryPath = 'index.js';
let templateName = 'template/index.html';
let useHtml = false;

// 取入口所在目录的构建配置
const projectConfigFile = path.join(config.siteRoot, `${projectPath}/project.config.js`);

if (fs.existsSync(projectConfigFile)) {
  const projectConfig = require(projectConfigFile);

  if (_.isPlainObject(projectConfig.template)) {
    if (projectConfig.template.file) {
      templateName = projectConfig.template.file;
    }
    useHtml = projectConfig.template.type === 'html';
  }

  if (projectConfig.entry) {
    entryPath = projectConfig.entry;
  }
}

const ext = path.extname(entryPath);
const fileUrl = path.join(config.siteRoot, `${projectPath}/${entryPath}`);

try {
  if (!fs.statSync(fileUrl).isFile()) {
    throw 'not file!';
  }
}
catch (e) {
  console.log(chalk.yellow('\n入口文件不存在！\n'));

  process.exit(1);
}

const entryName = path.basename(fileUrl, ext);

const spinner = ora('building for production...')
spinner.start()

del([
  resolve(`output/${config.siteUrlPrefix}/${projectPath}/**`),
  `!${resolve(`output/${config.siteUrlPrefix}/${projectPath}/template`)}`,
  `!${resolve(`output/${config.siteUrlPrefix}/${projectPath}/server`)}`
]).then(() => {
  let defaultWebpackConfig = webpackConfig({ entryName, entryPath: fileUrl, projectName: projectPath, entryBasePath: entryPath, templateName, useHtml });
  const myWebpackPath = path.join(config.siteRoot, `${projectPath}/webpack.config.js`);

  if (fs.existsSync(myWebpackPath)) {
    const myWebpackConfig = require(myWebpackPath);
    defaultWebpackConfig = merge(defaultWebpackConfig, myWebpackConfig({ entryName, entryPath: fileUrl, projectName: projectPath, entryBasePath: entryPath, templateName, useHtml }));
  }

  webpack(defaultWebpackConfig, function(err, stats) {
    spinner.stop()
    if (err) {
      throw err
    }
    process.stdout.write(stats.toString({
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false
    }) + '\n\n')

    if (stats.hasErrors()) {
      console.log(chalk.red('  Build failed with errors.\n'))
      process.exit(1)
    }

    console.log(chalk.cyan('  Build complete.\n'))
  });
});
