'use strict'

const logger = require('../log.service').getLogger()
const pause = (duration) => new Promise(res => setTimeout(res, duration), noReject => undefined)
const defaultRetryCondition = () => true
const defaultConfiguration = {
  attempts: 3,
  pauseTimeMs: 5000,
  pauseMultiplier: 1.5
}

/**
 * @param {function} asyncRetryableFunction - the function to execute with retry behaviour
 * @param {object} retryConfiguration - the behaviour of the retry policy.  Default settings are provided
 * @param {function(Error):Boolean} retryCondition - predicate function to determine if the function should be retried.  Defaults to true
 */
const asyncRetryHandler = async (asyncRetryableFunction, retryConfiguration = defaultConfiguration, retryCondition = defaultRetryCondition) => {
  let retryPolicy = {}
  try {
    Object.assign(retryPolicy, retryConfiguration)
    logger.debug(`asyncRetryHandler: attempting method.  attempts left:${retryPolicy.attempts}`)
    const result = await asyncRetryableFunction()
    return result
  } catch (error) {
    if (retryPolicy.attempts > 1 && retryCondition(error)) {
      logger.debug(`asyncRetryHandler: failed with ${error} \n retrying in ${retryPolicy.pauseTimeMs}...`)
      await pause(retryPolicy.pauseTimeMs)
      retryPolicy.attempts -= 1
      retryPolicy.pauseTimeMs *= retryConfiguration.pauseMultiplier
      await asyncRetryHandler(asyncRetryableFunction, retryPolicy, retryCondition)
    } else {
      throw error
    }
  }
}

module.exports = asyncRetryHandler
