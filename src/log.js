const debug = require('debug')
const LOGGER_NAMESPACE = 'payments-token'

module.exports = function (namespace) {
  const logger = debug(namespace ? `${LOGGER_NAMESPACE}:${namespace}` : LOGGER_NAMESPACE)
  const loggerError = logger.extend('error')
  const loggerInfo = logger.extend('info')
  const loggerDebug = logger.extend('debug')
  loggerInfo.log = console.log.bind(console) // log info to std out
  loggerDebug.log = console.log.bind(console) // log debug to std out
  return {
    info: loggerInfo,
    error: loggerError,
    debug: loggerDebug
  }
}