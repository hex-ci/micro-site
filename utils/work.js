const simpleGit = require('simple-git/promise');
const chalk = require('chalk');
const path = require('path');
const inquirer = require('inquirer');
const axios = require('axios').default;

const log = console.log;
const rootDir = path.join(__dirname, '..');

const config = require(rootDir + '/config/config.dev');

const git = simpleGit(rootDir).silent(true);

const pullMaster = async () => {
  log(chalk.cyanBright(`切换到 master 并拉取代码\n`));

  await git.checkout('master');

  try {
    await git.pull('origin', 'master');
  }
  catch (e) {
    log(chalk.redBright(e.message));
    log();
  }

  log(chalk.cyanBright('切换完成！\n'));
};

const checkClean = async () => {
  const status = await git.status();

  if (status.files.length > 0) {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        default: true,
        message: '当前分支有未提交代码，确认要继续吗？'
      }
    ]);

    log();

    return answers.confirm;
  }
  else {
    return true;
  }
};

// 切换分支
const workSwitch = async () => {
  log(chalk.cyanBright('===== 切换分支 =====\n'));

  const branchSummary = await git.branchLocal();

  log(chalk.cyanBright(`当前分支: ${branchSummary.current}\n`));

  if (!await checkClean()) {
    log(chalk.yellowBright('切换已终止！\n'));
    return;
  }

  const branches = Object.keys(branchSummary.branches).filter(name => name !== branchSummary.current);

  if (branches.length < 1) {
    log(chalk.yellowBright('无可切换的分支，切换已终止！\n'));
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'branchName',
      message: '请选择要切换的分支:',
      default: 'master',
      choices: branches
    },
    {
      type: 'confirm',
      name: 'confirm',
      default: true,
      message: '确认要切换吗？'
    }
  ]);

  log();

  if (answers.confirm !== true) {
    log(chalk.yellowBright('切换已终止！\n'));
    return;
  }

  const branchName = answers.branchName;

  try {
    await git.checkout(branchName);
  }
  catch (e) {
    log(chalk.redBright(e.message));
    log();

    return;
  }

  log(chalk.greenBright(`分支 ${branchName} 切换成功！\n`));
}

// 新建分支
const workNew = async () => {
  log(chalk.cyanBright('===== 新建分支 =====\n'));

  const branchSummary = await git.branchLocal();

  log(chalk.cyanBright(`当前分支: ${branchSummary.current}\n`));

  if (!await checkClean()) {
    log(chalk.yellowBright('新建已终止！\n'));
    return;
  }

  // 检查当前是否是 master
  if (branchSummary.current !== 'master') {
    await pullMaster();
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'branchName',
      message: '请输入分支名称:',
      filter: value => value.trim(),
      validate: (value) => {
        value = value.trim();

        if (value === '') {
          return '此项必填';
        }

        if (!/^(?:feature|hotfix)\/[a-z0-9_-]+$/.test(value)) {
          return '请以 feature/ 或者 hotfix/ 开头';
        }

        if (branchSummary.branches[value]) {
          return '分支名已存在';
        }

        return true;
      }
    },
    {
      type: 'confirm',
      name: 'confirm',
      default: false,
      message: '确认要创建吗？'
    }
  ]);

  log();

  if (answers.confirm !== true) {
    log(chalk.yellowBright('新建已终止！\n'));
    return;
  }

  const branchName = answers.branchName;

  try {
    await git.checkoutBranch(branchName, 'master');
  }
  catch (e) {
    log(chalk.redBright(e.message));
    log();

    return;
  }

  log(chalk.greenBright(`分支 ${branchName} 创建成功！\n`));

  log(chalk.cyanBright(`当前分支上线后请执行 npm run work remove 删除当前分支。\n`));
}

// 删除分支
const workRemove = async () => {
  log(chalk.cyanBright('===== 删除分支 =====\n'));

  // 检查当前是否是 master
  const branchSummary = await git.branchLocal();

  log(chalk.cyanBright(`当前分支: ${branchSummary.current}\n`));

  if (!await checkClean()) {
    log(chalk.yellowBright('删除已终止！\n'));
    return;
  }

  if (branchSummary.current !== 'master') {
    await pullMaster();
  }

  const branches = Object.keys(branchSummary.branches).filter(name => name !== 'master' && name !== 'testing');

  if (branches.length < 1) {
    log(chalk.yellowBright('无可删除的分支，删除已终止！\n'));
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'branchName',
      message: '请选择要删除的分支:',
      choices: branches
    },
    {
      type: 'confirm',
      name: 'confirm',
      default: false,
      message: '确认要删除分支吗？'
    }
  ]);

  log();

  if (answers.confirm !== true) {
    log(chalk.yellowBright('删除已终止！\n'));
    return;
  }

  const branchName = answers.branchName;

  try {
    await git.deleteLocalBranch(branchName);
  }
  catch (e) {
    log(chalk.redBright(e.message));
    log();

    return;
  }

  log(chalk.cyanBright('清理远程已删除的分支...\n'));

  await git.fetch({ '--prune': null });

  log(chalk.greenBright(`分支 ${branchName} 删除成功！\n`));
}

// push 分支
const workPush = async () => {
  log(chalk.cyanBright('===== push 分支 =====\n'));

  const branchSummary = await git.branchLocal();

  log(chalk.cyanBright(`当前分支: ${branchSummary.current}\n`));

  if (!await checkClean()) {
    log(chalk.yellowBright('push 已终止！\n'));
    return;
  }

  const branches = Object.keys(branchSummary.branches).filter(name => name !== 'master' && name !== 'testing');

  if (branches.length < 1) {
    log(chalk.yellowBright('无可选择的分支，push 已终止！\n'));
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'branchName',
      message: '请选择要使用的分支:',
      default: branchSummary.current,
      choices: branches
    },
    {
      type: 'confirm',
      name: 'confirm',
      default: false,
      message: '确认要 push 吗？'
    }
  ]);

  log();

  if (answers.confirm !== true) {
    log(chalk.yellowBright('push 已终止！\n'));
    return;
  }

  const branchName = answers.branchName;

  try {
    await git.checkout(branchName);
  }
  catch (e) {
    log(chalk.redBright(e.message));
    log();

    return;
  }

  log(chalk.cyanBright(`已切换到 ${branchName} 分支，开始 push 分支...\n`));

  try {
    await git.push('origin', branchName);
  }
  catch (e) {
    log(chalk.redBright(e.message));
    log();

    return;
  }

  log(chalk.greenBright(`分支 ${branchName} push 成功！\n`));
}

// 提交合并请求到 testing 分支
const workPush2Testing = async () => {
  log(chalk.cyanBright('===== 创建合并请求到 testing 分支（准备提测） =====\n'));

  if (!config.gitlabPersonalAccessToken) {
    log(chalk.yellowBright('未找到 GitLab Personal Access Token，请前往 http://git.changbaops.com/profile/personal_access_tokens 创建，注意 Scopes 部分请勾选 api。\n'));
    return;
  }

  const branchSummary = await git.branchLocal();

  log(chalk.cyanBright(`当前分支: ${branchSummary.current}\n`));

  if (!await checkClean()) {
    log(chalk.yellowBright('创建已终止！\n'));
    return;
  }

  const branches = Object.keys(branchSummary.branches).filter(name => name !== 'master' && name !== 'testing');

  if (branches.length < 1) {
    log(chalk.yellowBright('无可选择的分支，创建已终止！\n'));
    return;
  }

  const logInfo = await git.log({ n: 1, [branchSummary.current]: null });

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'branchName',
      message: '请选择要使用的分支:',
      default: branchSummary.current,
      choices: branches
    },
    {
      type: 'input',
      name: 'title',
      message: '请输入合并请求的标题:',
      default: branchSummary.current === 'master' || branchSummary.current === 'testing' ? '' : logInfo.latest.message,
      filter: value => value.trim(),
      validate: (value) => {
        value = value.trim();

        if (value === '') {
          return '此项必填';
        }

        return true;
      }
    },
    {
      type: 'input',
      name: 'description',
      message: '请输入合并请求的描述:',
      filter: value => value.trim()
    },
    {
      type: 'checkbox',
      message: '请选择合并请求的标记:',
      name: 'labels',
      pageSize: 10,
      choices: [
        { name: '新增功能', checked: true },
        { name: '小修改' },
        { name: 'BUG' },
        { name: '开发中' },
        { name: '功能增强' },
        { name: '线上问题' },
        { name: '安全问题' },
        { name: '性能优化' },
        { name: '文档维护' }
      ],
      validate: function(answer) {
        if (answer.length < 1) {
          return '请至少选择一项';
        }

        return true;
      }
    },
    {
      type: 'confirm',
      name: 'confirm',
      default: false,
      message: '确认要创建吗？'
    }
  ]);

  log();

  if (answers.confirm !== true) {
    log(chalk.yellowBright('创建已终止！\n'));
    return;
  }

  const branchName = answers.branchName;

  try {
    await git.checkout(branchName);
  }
  catch (e) {
    log(chalk.redBright(e.message));
    log();

    return;
  }

  log(chalk.cyanBright(`已切换到 ${branchName} 分支，开始 push 分支...\n`));

  try {
    await git.push('origin', branchName);
  }
  catch (e) {
    log(chalk.redBright(e.message));
    log();

    return;
  }

  log(chalk.cyanBright(`push 完成，开始创建合并请求...\n`));

  // 添加一个固定标记
  answers.labels.push('提测');

  try {
    const response = await axios.post('http://git.changbaops.com/api/v4/projects/288/merge_requests', {
      source_branch: branchName,
      target_branch: 'testing',
      title: answers.title,
      description: answers.description,
      labels: answers.labels.join(','),
      remove_source_branch: false
    }, {
      headers: { 'Private-Token': config.gitlabPersonalAccessToken }
    });

    if (!response.data.iid) {
      log(chalk.redBright('创建合并请求失败！\n'));

      return;
    }

    log(chalk.greenBright(`分支 ${branchName} 合并请求创建成功！\n`));

    log(chalk.cyanBright(`访问 http://git.changbaops.com/f2e/changba-www/merge_requests/${response.data.iid} 检查并确认合并分支！\n`));
  }
  catch (e) {
    if (e.response.status == 409) {
      log(chalk.redBright('合并请求已存在！\n'));

      return;
    }

    log(chalk.redBright(e));
    log();
  }
}

// 提交合并请求到 master 分支
const workPush2Master = async () => {
  log(chalk.cyanBright('===== 创建合并请求到 master 分支（准备上线） =====\n'));

  if (!config.gitlabPersonalAccessToken) {
    log(chalk.yellowBright('未找到 GitLab Personal Access Token，请前往 http://git.changbaops.com/profile/personal_access_tokens 创建，注意 Scopes 部分请勾选 api。\n'));
    return;
  }

  const branchSummary = await git.branchLocal();

  log(chalk.cyanBright(`当前分支: ${branchSummary.current}\n`));

  if (!await checkClean()) {
    log(chalk.yellowBright('创建已终止！\n'));
    return;
  }

  const branches = Object.keys(branchSummary.branches).filter(name => name !== 'master' && name !== 'testing');

  if (branches.length < 1) {
    log(chalk.yellowBright('无可选择的分支，创建已终止！\n'));
    return;
  }

  const logInfo = await git.log({ n: 1, [branchSummary.current]: null });

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'branchName',
      message: '请选择要使用的分支:',
      default: branchSummary.current,
      choices: branches
    },
    {
      type: 'input',
      name: 'title',
      message: '请输入合并请求的标题:',
      default: branchSummary.current === 'master' || branchSummary.current === 'testing' ? '' : logInfo.latest.message,
      filter: value => value.trim(),
      validate: (value) => {
        value = value.trim();

        if (value === '') {
          return '此项必填';
        }

        return true;
      }
    },
    {
      type: 'input',
      name: 'description',
      message: '请输入合并请求的描述:',
      filter: value => value.trim()
    },
    {
      type: 'checkbox',
      message: '请选择合并请求的标记:',
      name: 'labels',
      pageSize: 10,
      choices: [
        { name: '新增功能', checked: true },
        { name: '小修改' },
        { name: 'BUG' },
        { name: '开发中' },
        { name: '功能增强' },
        { name: '线上问题' },
        { name: '安全问题' },
        { name: '性能优化' },
        { name: '文档维护' }
      ],
      validate: function(answer) {
        if (answer.length < 1) {
          return '请至少选择一项';
        }

        return true;
      }
    },
    {
      type: 'confirm',
      name: 'confirm',
      default: false,
      message: '确认要创建吗？'
    }
  ]);

  log();

  if (answers.confirm !== true) {
    log(chalk.yellowBright('创建已终止！\n'));
    return;
  }

  const branchName = answers.branchName;

  try {
    await git.checkout(branchName);
  }
  catch (e) {
    log(chalk.redBright(e.message));
    log();

    return;
  }

  log(chalk.cyanBright(`已切换到 ${branchName} 分支，开始 push 分支...\n`));

  try {
    await git.push('origin', branchName);
  }
  catch (e) {
    log(chalk.redBright(e.message));
    log();

    return;
  }

  log(chalk.cyanBright(`push 完成，开始创建合并请求...\n`));

  // 添加一个固定标记
  answers.labels.push('上线');

  try {
    const response = await axios.post('http://git.changbaops.com/api/v4/projects/288/merge_requests', {
      source_branch: branchName,
      target_branch: 'master',
      title: answers.title,
      description: answers.description,
      labels: answers.labels.join(','),
      remove_source_branch: true
    }, {
      headers: { 'Private-Token': config.gitlabPersonalAccessToken }
    });

    if (!response.data.iid) {
      log(chalk.redBright('创建合并请求失败！\n'));

      return;
    }

    log(chalk.greenBright(`分支 ${branchName} 合并请求创建成功！\n`));

    log(chalk.cyanBright(`访问 http://git.changbaops.com/f2e/changba-www/merge_requests/${response.data.iid} 检查并确认合并分支！\n`));
  }
  catch (e) {
    if (e.response.status == 409) {
      log(chalk.redBright('合并请求已存在！\n'));

      return;
    }

    log(chalk.redBright(e));
    log();
  }
}

// =========================================

const argv = JSON.parse(process.env.npm_config_argv).original.slice(2);

switch (argv[0]) {
  default:
  case 'switch':
    workSwitch();
    break;

  case 'new':
  case 'create':
    workNew();
    break;

  case 'remove':
  case 'delete':
    workRemove();
    break;

  case 'push':
    workPush();
    break;

  case 'testing':
    workPush2Testing();
    break;

  case 'master':
    workPush2Master();
    break;
}
