'use strict'

const moment = require('moment')
const config = require('../config')
const schoolHomeFeatureEligibilityPresenter = require('../helpers/school-home-feature-eligibility-presenter')
const dateService = require('../services/date.service')
const headteacherDeclarationService = require('../services/headteacher-declaration.service')

const businessAvailabilityService = {}

/**
 * Return pin generation availability
 * @param {Boolean} isLiveCheck
 * @param {Object} checkWindowData
 * @returns {Boolean} live pin generation allowance
 * @throws Will throw an error if the argument passed is not boolean type
 */
businessAvailabilityService.isPinGenerationAllowed = (isLiveCheck, checkWindowData) => {
  const pinGenerationEligibilityData = schoolHomeFeatureEligibilityPresenter.getPresentationData(checkWindowData)
  if (isLiveCheck) {
    return pinGenerationEligibilityData.isLivePinGenerationAllowed
  } else {
    return pinGenerationEligibilityData.isFamiliarisationPinGenerationAllowed
  }
}

/**
 * Return restarts availability
 * @param {Object} checkWindowData
 * @returns {Boolean} live pin generation allowance
 * @throws Will throw an error if the argument passed is not boolean type
 */
businessAvailabilityService.areRestartsAllowed = (checkWindowData) => {
  const pinGenerationEligibilityData = schoolHomeFeatureEligibilityPresenter.getPresentationData(checkWindowData)
  return pinGenerationEligibilityData.isRestartsPageAccessible
}

/**
 * Return groups availability
 * @param {Object} checkWindowData
 * @returns {Boolean} groups allowance
 */
businessAvailabilityService.areGroupsAllowed = (checkWindowData) => {
  const pinGenerationEligibilityData = schoolHomeFeatureEligibilityPresenter.getPresentationData(checkWindowData)
  return pinGenerationEligibilityData.isGroupsPageAccessible
}

/**
 * Determine if pin generation is allowed
 * @param {Boolean} isLiveCheck
 * @param {Object} checkWindowData
 * @throws Will throw an error if isPinGenerationAllowed method returns false
 */
businessAvailabilityService.determinePinGenerationEligibility = (isLiveCheck, checkWindowData) => {
  const isPinGenerationAllowed = businessAvailabilityService.isPinGenerationAllowed(isLiveCheck, checkWindowData)
  const pinEnv = isLiveCheck ? 'Live' : 'Familiarisation'
  if (!isPinGenerationAllowed && !config.OVERRIDE_AVAILABILITY_CHECKS) {
    throw new Error(`${pinEnv} pin generation is not allowed`)
  }
}

/**
 * Determine if restarts are permitted
 * @param {Object} checkWindowData
 * @throws Will throw an error if areRestartsAllowed is false
 */
businessAvailabilityService.determineRestartsEligibility = (checkWindowData) => {
  const areRestartsAllowed = businessAvailabilityService.areRestartsAllowed(checkWindowData)
  if (!areRestartsAllowed && !config.OVERRIDE_AVAILABILITY_CHECKS) {
    throw new Error(`Restarts are not allowed`)
  }
}

/**
 * Determine if groups are permitted
 * @param {Object} checkWindowData
 * @throws Will throw an error if areGroupsAllowed is false
 */
businessAvailabilityService.determineGroupsEligibility = (checkWindowData) => {
  const areGroupsAllowed = businessAvailabilityService.areGroupsAllowed(checkWindowData)
  if (!areGroupsAllowed && !config.OVERRIDE_AVAILABILITY_CHECKS) {
    throw new Error(`Groups are not allowed`)
  }
}

/**
 * Returns data for the availability partial
 * @param {Number} dfeNumber
 * @param {Object} checkWindowData
 * @returns {Object}
 */
businessAvailabilityService.getAvailabilityData = async (dfeNumber, checkWindowData) => {
  const currentDate = moment.utc()
  const hdfSubmitted = await headteacherDeclarationService.isHdfSubmittedForCheck(dfeNumber, checkWindowData.id)
  const checkWindowStarted = currentDate.isAfter(checkWindowData.checkStartDate)
  const checkWindowClosed = currentDate.isAfter(checkWindowData.checkEndDate)
  const checkWindowYear = dateService.formatYear(checkWindowData.checkEndDate)
  const adminWindowStarted = currentDate.isAfter(checkWindowData.adminStartDate)
  const adminWindowClosed = currentDate.isAfter(checkWindowData.adminEndDate)
  const canEditArrangements = !hdfSubmitted && !checkWindowClosed
  const pinsRestartsAvailable = !hdfSubmitted && checkWindowStarted && !checkWindowClosed && !config.OVERRIDE_AVAILABILITY_CHECKS
  return {
    checkWindowStarted,
    checkWindowClosed,
    checkWindowYear,
    adminWindowStarted,
    adminWindowClosed,
    hdfSubmitted,
    canEditArrangements,
    pinsRestartsAvailable
  }
}

module.exports = businessAvailabilityService
