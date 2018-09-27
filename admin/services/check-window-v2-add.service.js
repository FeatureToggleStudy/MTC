'use strict'

const checkWindowV2AddService = {}
const checkWindowAddValidator = require('../lib/validator/check-window-v2/check-window-add-validator')
const monitor = require('../helpers/monitor')

/**
 * Processes request data on adding
 * @param {Object} requestData
 */
checkWindowV2AddService.process = async (requestData) => {
  const validationError = checkWindowAddValidator.validate(requestData)
  if (validationError.hasError()) {
    throw validationError
  }
}
module.exports = monitor('check-window-add.service', checkWindowV2AddService)
