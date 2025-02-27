'use strict'

const moment = require('moment')
const { version: appVersion } = require('../package.json')
const { getBuildNumber } = require('./healthcheck')
const config = require('../config')
const roles = require('../lib/consts/roles.js')

const formatPageTitle = function (pageTitle) {
  let title = 'GOV.UK'
  if (typeof pageTitle !== 'undefined') {
    title = pageTitle + ' - ' + title
  }
  return title
}

/**
 *
 * @param {Date} date
 * @return {String} e.g 2 May 2017
 */
const formatGdsDate = function (date) {
  return moment(date).format('D MMM YYYY')
}

/**
 *
 * @param {Date} date
 * @return {String} e.g 2 May 2017
 */
const formatFullGdsDate = function (date) {
  return moment(date).format('D MMMM YYYY')
}

module.exports = async function (app) {
  'use strict'
  if (typeof app === 'undefined') throw new Error('express application object required')
  let buildNumber
  try {
    buildNumber = await getBuildNumber()
  } catch (error) {
    buildNumber = 'NOT FOUND'
  }
  // Ensure we initialise the `isAuthenticated` variable so that it is defined
  // even if the database is not yet up.
  app.locals.isAuthenticated = false
  app.locals.assetPath = config.AssetPath
  app.locals.bodyClasses = ''
  app.locals.formatPageTitle = formatPageTitle
  app.locals.govukRoot = 'https://gov.uk'
  app.locals.govukTemplateAssetPath = `${config.AssetPath}govuk_template/`
  app.locals.headerClass = 'with-proposition no-print'
  app.locals.htmlLang = 'en'
  app.locals.skipLinkMessage = null
  app.locals.homepageUrl = '/'
  app.locals.logoLinkTitle = 'Go to the home page'
  app.locals.globalHeaderText = 'GOV.UK'
  app.locals.crownCopyrightMessage = null
  app.locals.googleTrackingId = config.GOOGLE_TRACKING_ID
  app.locals.appInsightsClientKey = config.Monitoring.ApplicationInsights.Key
  app.locals.deployVersion = appVersion
  app.locals.appBuildNumber = buildNumber
  app.locals.formatGdsDate = formatGdsDate
  app.locals.formatFullGdsDate = formatFullGdsDate
  app.locals.guidancePdf = 'https://www.gov.uk/government/publications/multiplication-tables-check-administration-guidance'
  app.locals.roles = roles
  app.locals.isSubmitImpersonationUrl = false
}
