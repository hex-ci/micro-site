/* global __resourceQuery */

const hotClient = require(`webpack-hot-middleware/client?autoConnect=false&overlayStyles={"whiteSpace":"pre-wrap","wordBreak":"break-all"}`)

hotClient.setOptionsAndConnect({
  path: __resourceQuery.slice(1),
  timeout: 10 * 1000,
  overlay: true,
  reload: true,
  noInfo: true
})

hotClient.subscribe(function(event) {
  if (event.action === 'reload') {
    window.location.reload()
  }
})
