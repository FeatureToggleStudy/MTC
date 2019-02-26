'use strict'
const pupilIdentificationFlag = require('../services/pupil-identification-flag.service')

const resultPresenter = {}

/**
 * Fetch pupil data for the results view
 * @returns {Array} pupil data
 */
resultPresenter.getResultsViewData = (pupils) => {
  let pupilData = []
  pupils.forEach((p) => {
    pupilData.push({
      foreName: p.foreName,
      lastName: p.lastName,
      middleNames: p.middleNames,
      dateOfBirth: p.dateOfBirth,
      score: p.reason ? '-' : p.mark,
      reason: p.reason,
      group_id: p.group_id
    })
  })
  return pupilIdentificationFlag.addIdentificationFlags(pupilData)
}

/**
 * Returns national score with one decimal place
 * @param {Number} nationalScore
 * @returns {Number}
 */
resultPresenter.getNationalScore = (nationalScore) => (Math.round(nationalScore * 10) / 10)

module.exports = resultPresenter
