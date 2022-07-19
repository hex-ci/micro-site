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

function images() {
  return gulp.src(`./output/${config.ssrUrlPrefix}/${projectPath}/client/*.{png,jpg,jpeg,gif}`, {
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
  ], { verbose: true }), { name: `${config.ssrUrlPrefix}-${projectPath}-images` }))
    .pipe(gulp.dest('output'));
}

function cdn() {
  return gulp.src([
    `./output/${config.ssrUrlPrefix}/${projectPath}/client/**`,
    `!./output/${config.ssrUrlPrefix}/${projectPath}/client/**/*.{map,htm,html,json}`
  ]).pipe(uploadCdn({
    asset: 'output'
  }));
}

function copy() {
  return gulp.src([
    `./output/${config.ssrUrlPrefix}/${projectPath}/client/*.json`,
    `./output/${config.ssrUrlPrefix}/${projectPath}/server/**`
  ], {
    base: `./output/${config.ssrUrlPrefix}/${projectPath}`
  }).pipe(gulp.dest(`./dist/${config.ssrUrlPrefix}/${projectPath}/`));
}

function copyServer() {
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

exports.default = gulp.series(images, cdn, copy, copyServer, copyStatic);
