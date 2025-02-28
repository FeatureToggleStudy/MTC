'use strict'

const logger = require('../log.service').getLogger()
const pause = (duration) => new Promise(resolve => setTimeout(resolve, duration))
const defaultRetryPredicate = () => true
const defaultConfiguration = {
  attempts: 3,
  pauseTimeMs: 5000,
  pauseMultiplier: 1.5
}

/**
 * @param {function} asyncRetryableFunction - the function to execute with retry behaviour
 * @param {object} retryConfiguration - the behaviour of the retry policy.  Default settings are provided
 * @param {function(Error):Boolean} retryPredicate - predicate function to determine if the function should be retried.  Defaults to true
 */
const asyncRetryHandler = async (asyncRetryableFunction, retryConfiguration = defaultConfiguration, retryPredicate = defaultRetryPredicate) => {
  const retryPolicy = {}
  try {
    Object.assign(retryPolicy, retryConfiguration)
    const result = await asyncRetryableFunction()
    return result
  } catch (error) {
    logger.warn(`asyncRetryHandler: method call failed with ${error}`)
    if (retryPolicy.attempts > 1 && retryPredicate(error)) {
      await pause(retryPolicy.pauseTimeMs)
      retryPolicy.attempts -= 1
      retryPolicy.pauseTimeMs *= retryConfiguration.pauseMultiplier
      const result = await asyncRetryHandler(asyncRetryableFunction, retryPolicy, retryPredicate)
      return result
    } else {
      logger.error('max retry count exceeded, failing...')
      throw error
    }
  }
}

module.exports = asyncRetryHandler
