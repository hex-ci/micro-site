const path = require('path');
const fs = require('fs');

const searchFolderFromUrl = (url, rootPath) => {
  const urlArray = url.split('/');
  let subPath = '';

  if (url === '/' || urlArray.length < 2) {
    return '';
  }

  for (let index = 2; index <= urlArray.length; index++) {
    subPath = urlArray.slice(1, index).join('/');

    let stat;

    try {
      stat = fs.statSync(path.join(rootPath, subPath));
    }
    catch (e) {
      stat = false;
    }

    if (stat === false || !stat.isDirectory()) {
      subPath = urlArray.slice(1, index - 1).join('/');
      break;
    }
  }

  return subPath;
}

const mimes = {
  '.ts': 'application/javascript',
  '.scss': 'text/css',
  '.sass': 'text/css',
  '.less': 'text/css',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript',
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

module.exports = {
  searchFolderFromUrl,
  mimes
};
