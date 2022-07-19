'use strict';

// const fs = require('fs');
const gulp = require('gulp');
const minimist = require('minimist');
const gulpLoadPlugins = require('gulp-load-plugins');
// const path = require('path');

const uploadCdn = require('./utils/cdn.js');
const imagemin = require('./utils/gulp-imagemin.js');

const $ = gulpLoadPlugins();

const config = require('./config/config.dev');

const options = minimist(JSON.parse(process.env.npm_config_argv).original.slice(2));

if (options._.length < 1) {
  throw "缺少参数！";
}

const projectPath = options._[0];

// =======================================================================

function html() {
  return gulp.src([
    `./output/${config.siteUrlPrefix}/${projectPath}/*.html`
  ], {
    dot: false,
    base: 'output'
  }).pipe($.if(/\.(htm|html)$/i, $.htmlmin({
    collapseBooleanAttributes: true,
    removeComments: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    removeRedundantAttributes: true,
    useShortDoctype: true,
    removeEmptyAttributes: true,
    ignoreCustomFragments: [/<%[\s\S]*?%>/, /<#[\s\S]*?#>/]
  }).on('error', (error) => console.error(error.message))))
    .pipe(gulp.dest('output'))
}

function images() {
  return gulp.src(`./output/${config.siteUrlPrefix}/${projectPath}/*.{png,jpg,jpeg,gif}`, {
    base: 'output'
  }).pipe($.cache(imagemin([
    imagemin.gifsicle({
      interlaced: true,
      optimizationLevel: 3
    }),
    imagemin.jpegtran({
      progressive: true
    }),
    imagemin.optipng({
      optimizationLevel: 7
    })
  ], { verbose: true }), { name: `${config.siteUrlPrefix}-${projectPath}-images` }))
    .pipe(gulp.dest('output'));
}

function cdn() {
  return gulp.src([
    `./output/${config.siteUrlPrefix}/${projectPath}/**`,
    `!./output/${config.siteUrlPrefix}/${projectPath}/**/*.{map,htm,html}`,
    `!./output/${config.siteUrlPrefix}/${projectPath}/server/**`
  ]).pipe(uploadCdn({
    asset: 'output'
  }));
}

function copyTemplate() {
  return gulp.src([
    `./output/${config.siteUrlPrefix}/${projectPath}/template/**/*.html`
  ], {
    base: `./output/${config.siteUrlPrefix}/${projectPath}`
  }).pipe(gulp.dest(`./dist/${config.siteUrlPrefix}/${projectPath}/`));
}

function copyServer() {
  return gulp.src([
    `${config.siteRoot}/${projectPath}/server/**/*.js`
  ], {
    base: `${config.siteRoot}/${projectPath}`
  }).pipe(gulp.dest(`./dist/${config.siteUrlPrefix}/${projectPath}/`));
}

function copyCommon() {
  return gulp.src([
    `${config.siteRoot}/common/template/**/*.html`
  ], {
    base: `${config.siteRoot}/common`
  }).pipe(gulp.dest(`./dist/${config.siteUrlPrefix}/common/`));
}

function copyOther() {
  return gulp.src([
    './package.json',
    './package-lock.json',
    './ecosystem.config.js',
    './server/**'
  ], { base: './' }).pipe(gulp.dest(`./dist/`));
}

function copyStatic() {
  return gulp.src([
    './src/static/**'
  ], {
    base: './src/static', dot: true
  }).pipe(gulp.dest(`./dist/static/`));
}

exports.default = gulp.series(html, images, cdn, copyTemplate, copyServer, copyCommon, copyOther, copyStatic);
