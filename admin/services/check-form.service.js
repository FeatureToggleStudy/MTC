'use strict'

const fs = require('fs')
const moment = require('moment')

const checkFormDataService = require('../services/data-access/check-form.data.service')
const checkWindowDataService = require('../services/data-access/check-window.data.service')
const checkWindowService = require('../services/check-window.service')
const config = require('../config')
const random = require('../lib/random-generator')

const checkFormService = {
  /**
   * Randomly allocate a form to a pupil, discarding all previously used forms
   * @param availableForms {Array.<Object>} -  the set of all forms (as objects) allocated to the check window
   * @param {Array.<number>} usedFormIds - the set of all form ids already used by the pupil
   * @return {Promise<object>} - one of the available forms
   */
  allocateCheckForm: async function (availableForms, usedFormIds) {
    if (!Array.isArray(availableForms)) {
      throw new Error('availableForms is not an array')
    }

    if (!Array.isArray(usedFormIds)) {
      throw new Error('usedFormIds is not an array')
    }

    if (!availableForms.length > 0) {
      throw new Error('There must be at least one form to select')
    }

    /**
     * Construct an array of unseen forms
     * @type Array
     */
    const unseenForms = availableForms.filter(f => !usedFormIds.includes(f.id))

    try {
      if (unseenForms.length === 0) {
        // The pupil has seen every form available
        if (availableForms.length === 1) {
          // Edge case when there is only 1 available form to choose from
          return availableForms[0]
        }
        // randomly pick a seen form as the pupil has seen all the forms
        const idx = await random.getRandomIntInRange(0, availableForms.length - 1)
        return availableForms[idx]
      } else if (unseenForms.length === 1) {
        // If there is only 1 unseen form left, it is not random and behaves predictably
        return unseenForms[0]
      }

      // We have multiple forms to choose from so we randomly select an unseen form
      const idx = await random.getRandomIntInRange(0, unseenForms.length - 1)
      return unseenForms[idx]
    } catch (error) {
      throw new Error('Error allocating checkForm: ' + error.message)
    }
  },

  /**
   * create a check form
   * @param form the form as an object
   */
  create: async (form) => {
    return checkFormDataService.sqlCreate(form)
  },

  /**
   * Get a non-deleted form
   * @param formId the id of the form
   */
  getCheckForm: async (formId) => {
    let form = await checkFormDataService.sqlFindActiveForm(formId)
    if (form && form.length > 0) {
      form = form[0]
      form.questions = JSON.parse(form.formData)
    }
    return form
  },

  /**
   * Return all forms allocated to a checkWindow, that can be assigned to a pupil
   * @deprecated this is part of the old prepareCheck method
   */
  getAllFormsForCheckWindow: async function (checkWindowId) {
    return checkFormDataService.sqlFetchSortedActiveFormsByName(checkWindowId)
  },

  /**
   * Return all forms allocated to a checkWindow by check type, that can be assigned to a pupil
   * @param {Number} checkWindowId
   * @param {Boolean} isLiveCheck
   * @return {Promise<Array>}
   */
  getAllFormsForCheckWindowByType: async function (checkWindowId, isLiveCheck) {
    const sortDescending = undefined
    return checkFormDataService.sqlFetchSortedActiveFormsByName(checkWindowId, sortDescending, isLiveCheck)
  },

  /**
   * Extract the questions from the check-form, and add an `order` property.
   * @param questions
   */
  prepareQuestionData: function (questions) {
    return questions.map((q, i) => { return { order: ++i, factor1: q.f1, factor2: q.f2 } })
  },

  /**
   * Return a view friendly list of check-forms and their linked windows.
   * @param sortField
   * @param sortDirection
   * @returns {Promise.<*>}
   */
  formatCheckFormsAndWindows: async (sortField, sortDirection) => {
    let formData
    let sortByWindow = false
    let sortDescending = false

    if (sortField !== 'name') {
      sortByWindow = true
    }

    if (sortDirection !== 'asc') {
      sortDescending = true
    }

    if (sortByWindow) {
      formData = await checkFormDataService.sqlFetchSortedActiveFormsByWindow(null, sortDescending)
    } else {
      formData = await checkFormDataService.sqlFetchSortedActiveFormsByName(null, sortDescending)
    }

    if (formData.length > 0) {
      for (let index = 0; index < formData.length; index++) {
        const form = formData[index]
        form.removeLink = true
        const checkWindows = await checkWindowService.getCheckWindowsAssignedToForms([form.id])
        if (checkWindows.length > 0) {
          form.checkWindows = checkWindows.map(cw => cw.name)
          form.removeLink = moment(form.checkStartDate).isAfter(moment())
        } else {
          form.checkWindows = []
        }
      }
      // TODO - why on earth does a service have a view concern inside it?
      // TODO - this must be moved to the view
      formData.forEach(f => {
        f.checkWindows = f.checkWindows.join('<br>')
      })

      // TODO rereview server side sorting after SQL move.
      if (sortField === 'window') {
        formData = formData.sort((a, b) => {
          if (a.checkWindows === b.checkWindows) {
            return 0
          } else if (sortDirection === 'asc') {
            return a.checkWindows < b.checkWindows ? 1 : -1
          } else {
            return a.checkWindows < b.checkWindows ? -1 : 1
          }
        })
      }
    }
    return formData
  },

  /**
   * Un-assign check form from check window.
   * @param formId the check form to remove
   * @returns {Promise.<void>}
   */
  deleteCheckForm: async (formId) => {
    // remove assignments from windows
    await checkFormDataService.sqlRemoveAllWindowAssignments(formId)
    // mark as deleted
    return checkFormDataService.sqlMarkFormAsDeleted(formId)
  },

  /**
   * Return check windows name(s).
   * @param checkWindows
   * @returns {Array}
   */
  // TODO why is there functionality for check windows in the check form service?????
  checkWindowNames: (checkWindows) => {
    const checkWindowsName = []
    checkWindows.forEach(cw => {
      checkWindowsName.push(' ' + cw.name)
    })
    return checkWindowsName
  },

  /**
   * Return canDelete.
   * @param checkWindows
   * @returns {*}
   */
  // TODO why is there functionality for check windows in the check form service?????
  canDelete: (checkWindows) => {
    let canDelete = false
    checkWindows.forEach(cw => {
      if (cw.checkStartDate > moment.utc()) {
        canDelete = true
      }
    })
    return canDelete
  },

  /**
   * Build a form name based on the file name.
   * @param fileName
   * @returns {boolean} or {string}
   */
  buildFormName: (fileName) => {
    const minFileNameSize = 5
    const maxFileNameSize = 131
    if (!fileName || fileName.length < minFileNameSize || fileName.length > maxFileNameSize) {
      return false
    }
    return fileName.slice(0, -4)
  },

  /**
   * Validate check form name. Returns true if not already in use
   * @param formName
   * @returns {Promise<boolean>}
   */
  validateCheckFormName: async (formName) => {
    const matchingFileNames = await checkFormDataService.sqlFindCheckFormByName(formName)
    return matchingFileNames.length === 0
  },

  /**
   * Return true/false based on how many lines a file can have
   * @param file
   * @returns {boolean}
   */
  isRowCountValid: (file) => {
    const csvData = fs.readFileSync(file)
    const result = csvData.toString().split('\n').map(function (line) {
      return line.trim()
    }).filter(Boolean)
    return result.length === config.LINES_PER_CHECK_FORM
  },

  /**
   * Get unassigned forms for selected check window.
   * @param checkWindowAssignedForms
   * @returns {Promise<*>}
   */
  getUnassignedFormsForCheckWindow: async (windowId) => {
    return checkFormDataService.sqlFetchSortedActiveFormsNotAssignedToWindowByName(windowId)
  },

  /**
   * Get assigned forms for selected check window.
   * @param checkWindowAssignedForms
   * @returns {Promise<*>}
   */
  getAssignedFormsForCheckWindow: async (windowId) => {
    const sortDescending = false
    return checkFormDataService.sqlFetchSortedActiveFormsByName(windowId, sortDescending)
  },

  removeWindowAssignment: async (formId, windowId) => {
    const promises = [
      checkFormDataService.sqlFindOneById(formId),
      checkWindowDataService.sqlFindOneById(windowId)
    ]

    const [checkForm, checkWindow] = await Promise.all(promises)

    if (!checkForm) {
      throw new Error(`Invalid checkForm ID: [${formId}]`)
    }
    if (!checkWindow) {
      throw new Error(`Invalid checkWindow ID: [${windowId}]`)
    }

    // CheckForms can only be unassigned if the check window has not yet started
    if (checkWindow.checkStartDate.isBefore(moment())) {
      throw new Error('Forms cannot be unassigned from an active check window')
    }

    return checkFormDataService.sqlRemoveWindowAssignment(formId, windowId)
  },

  getCheckFormsByIds: async (ids) => {
    if (!ids || !Array.isArray((ids))) {
      throw new Error('batchIds list empty or not defined')
    }
    let checkForms
    checkForms = await checkFormDataService.sqlFindByIds(ids)
    checkForms = checkForms.map(cf => {
      cf.formData = JSON.parse(cf.formData)
      return cf
    })
    return checkForms
  }
}

module.exports = checkFormService
