'use strict'

const del = require('del');
const chalk = require('chalk');

del(['.tmp', 'output/*', 'utils/manifest.json', 'utils/.cache', 'node_modules/.cache'], {
  dot: true
}).then(() => {
  console.log(chalk.cyan('Clean complete.\n'))
});
