const { BaseController } = require(`${global.serverPath}/common`);

class Controller extends BaseController {

  // constructor(opts) {
  //   super(opts);

  //   // 你的代码
  //   console.log('code');
  // }

  // 首页
  main() {
    this.$render('index');
  }

  sub() {
    this.$render('sub');
  }
}

module.exports = Controller;
