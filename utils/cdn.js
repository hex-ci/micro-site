'use strict';

const fs = require('fs');
const path = require('path');
const log = require('fancy-log');
const chalk = require('chalk');
const PluginError = require('plugin-error');
const through = require('through2');
const aliyun = require('aliyun-sdk');
const moment = require('moment');
const _ = require('lodash');
const zlib = require('zlib');
const url = require('url');

const config = require('../config/config.dev');

let ossClient;
const ossOptions = config.ossOptions;

let cdnCache = {};

let urlPrefix = config.cdnUrlPrefix;
if (urlPrefix.indexOf('//') === 0) {
  urlPrefix = `http:${urlPrefix}`;
}
const urlObject = url.parse(urlPrefix);
const keyPrefix = urlObject.pathname;

RegExp.escape = function(s) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

function fileExists(filepath) {
  try {
    return fs.statSync(filepath).isFile();
  }
  catch (e) {
    return false;
  }
}

function getCdnName(filePath, prefix) {
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const dir = path.dirname(prefix);

  return (dir === '.' ? '' : dir + '/') + name + ext;
}

function uploadFile(filePath, filename, cb) {
  const ext = path.extname(filePath);
  let content = fs.readFileSync(filePath);
  let contentType;
  let isSourceMap = false;

  const mimes = {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.less': 'text/x-less',
    '.sass': 'text/x-sass',
    '.scss': 'text/x-scss',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.swf': 'application/x-shockwave-flash',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.woff': 'application/font-woff',
    '.woff2': 'application/font-woff2',
    '.svg': 'image/svg+xml',
    '.otf': 'application/x-font-opentype',
    '.ico': 'image/x-icon',
    '.gif': 'image/gif',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.pdf': 'application/pdf',
    '.mov': 'video/quicktime',
    '.mp4': 'video/mp4',
    '.map': 'application/json',
    '.json': 'application/json',
    '.mp3': 'audio/mpeg',
    '.htm': 'text/html',
    '.html': 'text/html',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.apk': 'application/vnd.android.package-archive',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.plist': 'application/xml'
  };

  const charsetMimes = {
    '.js': 'utf-8',
    '.css': 'utf-8',
    '.html': 'utf-8',
    '.htm': 'utf-8',
    '.svg': 'utf-8'
  };

  const gzipMimes = {
    '.plist': 6,
    '.html': 6,
    '.htm': 6,
    '.js': 6,
    '.css': 6,
    '.svg': 6
  };

  if (mimes[ext]) {
    contentType = mimes[ext];
  }
  else {
    contentType = 'application/octet-stream';
  }

  if (charsetMimes[ext]) {
    contentType += '; charset=' + charsetMimes[ext];
  }

  if (cdnCache[filename]) {
    cb();
    return filename;
  }

  if (!ossClient) {
    ossClient = new aliyun.OSS({
      accessKeyId: ossOptions.accessKeyId,
      secretAccessKey: ossOptions.secretAccessKey,
      endpoint: ossOptions.endpoint,
      apiVersion: ossOptions.apiVersion
    });
  }

  // console.log(ossClient.__proto__);

  if (fileExists(filePath + '.map')) {
    isSourceMap = true;
    const basename = path.basename(filename);

    // 判断是否已有 sourcemaps
    if (!/\/\/# sourceMappingURL=\S+$|\/\*# sourceMappingURL=\S+ \*\/$/.test(content.toString())) {
      content = Buffer.concat([
        content,
        new Buffer('\n' + (ext === '.css' ? '/*# sourceMappingURL=' + basename + '.map */' : '//# sourceMappingURL=' + basename + '.map'))
      ]);
    }
  }

  const key = `${keyPrefix}${filename}`.replace(/^\/+/, '');

  const opt = {
    Bucket: ossOptions.bucket,
    Key: key,
    Body: content,
    AccessControlAllowOrigin: '*',
    ContentType: contentType,
    CacheControl: 'max-age=315360000',
    Expires: moment().add(10, 'years').unix()
  };

  if (gzipMimes[ext]) {
    opt.ContentEncoding = 'gzip';
    opt.Body = zlib.gzipSync(content, { level: gzipMimes[ext] });
  }

  ossClient.putObject(opt, function(err) {
    if (err) {
      log('ERR:', chalk.red(filename + "\t" + err));

      return cb();
    }
    else {
      cdnCache[filename] = true;
      log('OK:', chalk.green(filename + "\tmime: " + contentType));

      if (isSourceMap) {

        ossClient.putObject({
          Bucket: ossOptions.bucket,
          Key: key + '.map',
          Body: fs.readFileSync(filePath + '.map'),
          AccessControlAllowOrigin: '*',
          ContentType: 'application/json; charset=utf-8',
          CacheControl: 'max-age=315360000',
          Expires: moment().add(10, 'years').unix()
        }, function() {

          return cb();

        });

      }
      else {
        return cb();
      }
    }
  });

  return filename;
}


module.exports = function(options) {
  options = options || {};

  const asset = options.asset || process.cwd();
  const queue = [];

  try {
    cdnCache = _(cdnCache).merge(JSON.parse(fs.readFileSync(path.join(__dirname, 'cdn-manifest.json')))).value();
  }
  catch (e) {
  }

  return through.obj(function(file, enc, cb) {
    if (file.isNull()) {
      cb();
      return;
    }

    if (file.isStream()) {
      cb(new PluginError('CDN', 'Streaming not supported'));
      return;
    }

    // log(chalk.green(file.path));

    const prefix = path.relative(asset, file.path);
    const cdnName = getCdnName(file.path, prefix);
    const contents = file.contents.toString();

    queue.push({
      name: cdnName,
      path: file.path
    });

    file.contents = new Buffer(contents);

    return cb(null, file);

  }, function(cb) {
    let len = 0;

    const run = function() {
      uploadFile(queue[len].path, queue[len].name, function() {
        len++;
        if (len >= queue.length) {
          fs.writeFileSync(path.join(__dirname, 'cdn-manifest.json'), JSON.stringify(cdnCache, null, '  '));

          cb();
        }
        else {
          run();
        }
      });
    };

    if (queue.length > 0) {
      run();
    }
    else {
      return cb();
    }
  });
};
