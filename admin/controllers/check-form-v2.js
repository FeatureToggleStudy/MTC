const checkFormPresenter = require('../helpers/check-form-presenter')
const checkFormV2Service = require('../services/check-form-v2.service')
const ValidationError = require('../lib/validation-error')

const controller = {}

/**
 * Display initial 'upload and view' check forms page.
 * @param req
 * @param res
 * @param next
 * @returns {Promise.<*>}
 */
controller.getViewFormsPage = async (req, res, next) => {
  res.locals.pageTitle = 'Upload and view forms'
  let checkForms
  try {
    checkForms = await checkFormV2Service.getSavedForms()
  } catch (error) {
    return next(error)
  }
  req.breadcrumbs(res.locals.pageTitle)
  return res.render('check-form/view-forms', {
    checkForms,
    breadcrumbs: req.breadcrumbs(),
    messages: res.locals.messages
  })
}

/**
 * Upload check form(s) view.
 * @param req
 * @param res
 * @param next
 * @param error
 * @returns {Promise.<void>}
 */
controller.getUploadNewFormsPage = async (req, res, next, error = null) => {
  req.breadcrumbs('Upload and view forms', '/check-form/view-forms')
  res.locals.pageTitle = 'Upload new form'
  let hasExistingFamiliarisationCheckForm
  try {
    hasExistingFamiliarisationCheckForm = await checkFormV2Service.hasExistingFamiliarisationCheckForm()
  } catch (error) {
    return next(error)
  }
  req.breadcrumbs(res.locals.pageTitle)
  res.render('check-form/upload-new-forms', {
    breadcrumbs: req.breadcrumbs(),
    errors: error || new ValidationError(),
    formData: req.body,
    hasExistingFamiliarisationCheckForm
  })
}

/**
 * Upload check form(s).
 * @param req
 * @param res
 * @param next
 * @returns {Promise.<*>}
 */
controller.postUpload = async (req, res, next) => {
  const uploadData = req.files && req.files.csvFiles
  const requestData = req.body
  try {
    await checkFormV2Service.saveCheckForms(uploadData, requestData)
  } catch (error) {
    if (error.name === 'ValidationError') {
      return controller.getUploadNewFormsPage(req, res, next, error)
    }
    return next(error)
  }
  const highlightData = checkFormPresenter.getHighlightData(uploadData)
  req.flash('info', highlightData)
  res.redirect('/check-form/view-forms')
}

/**
 * Delete check form
 * @param req
 * @param res
 * @param next
 * @returns {Promise.<*>}
 */
controller.getDelete = async (req, res, next) => {
  const urlSlug = req.params && req.params.urlSlug
  const checkFormName = req.params && req.params.checkFormName
  try {
    await checkFormV2Service.deleteCheckForm(urlSlug)
  } catch (error) {
    return next(error)
  }
  const highlightData = { message: `Successfully deleted form ${checkFormName}` }
  req.flash('info', highlightData)
  return res.redirect(`/check-form/view-forms`)
}

module.exports = controller
