'use strict'

const fs = require('fs');

const func = fs.readFileSync(`${__dirname}/cbt-loader-func.js`);

module.exports = function(content) {
  return `let __source = ${JSON.stringify(content)};${func}`;
}
