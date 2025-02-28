'use strict'

const config = require('../config')
const logger = require('./log.service').getLogger()

/**
 * Optional environment variables
 */

const localDevWhitelist = [
  'GOOGLE_TRACKING_ID',
  'MTC_AUTH_PRIVATE_KEY',
  'NCA_TOOLS_AUTH_URL',
  'PUPIL_APP_URL',
  'RESTART_MAX_ATTEMPTS',
  'TSO_AUTH_PUBLIC_KEY',
  'OverridePinExpiry'
]

const main = (app) => {
  const whitelist = []
  if (process.env.NODE_ENV === 'development') {
    whitelist.push(localDevWhitelist)
  }
  // block app if required vars not set and in development mode...
  const unsetVars = []
  Object.keys(config).map((key) => {
    if (config[key] === undefined && !whitelist.includes(key)) {
      unsetVars.push(`${key}`)
    }
  })
  console.log(`unsetVars:${unsetVars.length}`)
  if (unsetVars.length > 0) {
    const errorMessage = `The following environment variables need to be defined:\n${unsetVars.join('\n')}`
    logger.alert(errorMessage)
    app.use(function (req, res, next) {
      const err = new Error(errorMessage)
      err.status = 500
      next(err)
    })
  }
}

module.exports = main
