module.exports = function(params) {
  /* global __source */

  const path = require('path');
  const htmlparser = require('htmlparser2');

  // console.log(params.compilation);

  // __source 是 cbt-loader.js 输出的
  let source = __source;

  const plugin = params.htmlWebpackPlugin;

  const cssTags = plugin.files.css.map(item => '<link rel="stylesheet" href="' + item + '">');
  const jsDom = [];

  for (const chunk in plugin.files.chunks) {
    if (plugin.options.inlineChunkName === chunk) {
      let inlineSource = params.compilation.assets[path.basename(plugin.files.chunks[chunk].entry)].source();
      inlineSource = inlineSource.replace(/\/\/# sourceMappingURL=\S+$/, '');
      jsDom.push({
        type: 'script',
        name: 'script',
        children: [{
          type: 'text',
          data: inlineSource.trim()
        }]
      });
    }
    else {
      jsDom.push({
        type: 'script',
        name: 'script',
        attribs: { src: plugin.files.chunks[chunk].entry }
      });
    }
  }

  if (plugin.options.useHtml) {
    const headRegExp = /<\/head\s*>/i;
    const scriptRegExp = /<script\s+[^>]+?>\s*<\/script>/ig;

    // 处理 css，插入到 <head></head> 之间，head 标签必须存在
    source = source.replace(headRegExp, match => cssTags.join('\n') + '\n' + match);

    // 处理 js，替换原入口点 script 标签
    source = source.replace(scriptRegExp, (match) => {
      const elements = htmlparser.parseDOM(match);
      const element = elements[0];

      if (element.type === 'script' && element.attribs && element.attribs.src === plugin.options.sourceEntry) {
        return htmlparser.DomUtils.getOuterHTML(jsDom);
      }
      else {
        return match;
      }
    });
  }
  else {
    const reCssBlock = new RegExp('(<%\\s*block\\s+' + plugin.options.cssBlockName + '\\s*%>)([\\s\\S]*?)(<%\\s*/block\\s*%>)');
    const reJsBlock = new RegExp('(<%\\s*block\\s+' + plugin.options.jsBlockName + '\\s*%>)([\\s\\S]*?)(<%\\s*/block\\s*%>)');

    const cssMatch = source.match(reCssBlock);
    if (cssMatch) {
      source = source.replace(reCssBlock, '$1' + cssMatch[2] + cssTags.join('\n') + '$3');
    }
    else {
      source += '\n<% block ' + plugin.options.cssBlockName + ' %>\n' + cssTags.join('\n') + '\n<% /block %>\n';
    }

    // 必须存在 javascript 块，并且其中包含入口 script 标签
    source = source.replace(reJsBlock, (p0, p1, p2, p3) => {
      const elements = htmlparser.parseDOM(p2);

      elements.some((element, index) => {
        if (element.type === 'script' && element.attribs && element.attribs.src === plugin.options.sourceEntry) {
          elements.splice(index, 1, ...jsDom);

          return true;
        }
      });

      return p1 + htmlparser.DomUtils.getOuterHTML(elements) + p3;
    });
  }

  return source;
}
