'use strict'
/* global describe beforeEach afterEach it expect jasmine spyOn */

const sinon = require('sinon')
const proxyquire = require('proxyquire').noCallThru()
const httpMocks = require('node-mocks-http')
const R = require('ramda')

const azureFileDataService = require('../../../services/data-access/azure-file.data.service')
const fileValidator = require('../../../lib/validator/file-validator')
const pupilAddService = require('../../../services/pupil-add-service')
const pupilAgeReasonService = require('../../../services/pupil-age-reason.service')
const pupilDataService = require('../../../services/data-access/pupil.data.service')
const pupilMock = require('../mocks/pupil')
const pupilUploadService = require('../../../services/pupil-upload.service')
const pupilValidator = require('../../../lib/validator/pupil-validator')
const schoolDataService = require('../../../services/data-access/school.data.service')
const schoolMock = require('../mocks/school')
const uploadedFileService = require('../../../services/uploaded-file.service')
const businessAvailabilityService = require('../../../services/business-availability.service')
const checkWindowV2Service = require('../../../services/check-window-v2.service')
const ValidationError = require('../../../lib/validation-error')

describe('pupil controller:', () => {
  function getRes () {
    const res = httpMocks.createResponse()
    res.locals = {}
    return res
  }

  function getReq (params) {
    const req = httpMocks.createRequest(params)
    req.user = { School: 9991999 }
    req.breadcrumbs = jasmine.createSpy('breadcrumbs')
    req.flash = jasmine.createSpy('flash')
    return req
  }

  describe('getAddPupil() route', () => {
    let controller
    let sandbox
    let next
    const goodReqParams = {
      method: 'GET',
      url: '/school/pupil/add',
      session: {
        id: 'ArRFdOiz1xI8w0ljtvVuD6LU39pcfgqy'
      }
    }

    beforeEach(() => {
      sandbox = sinon.createSandbox()
      next = jasmine.createSpy('next')
    })

    afterEach(() => {
      sandbox.restore()
    })

    describe('when the school is found in the database', () => {
      beforeEach(() => {
        controller = require('../../../controllers/pupil.js').getAddPupil
      })

      it('displays an add pupil page', async (done) => {
        const res = getRes()
        const req = getReq(goodReqParams)
        spyOn(checkWindowV2Service, 'getActiveCheckWindow')
        spyOn(businessAvailabilityService, 'getAvailabilityData').and.returnValue({ hdfSubmitted: false })
        await controller(req, res, next)
        expect(res.statusCode).toBe(200)
        expect(next).not.toHaveBeenCalled()
        done()
      })

      it('catches errors in the render() call', async (done) => {
        const res = getRes()
        const req = getReq(goodReqParams)
        spyOn(checkWindowV2Service, 'getActiveCheckWindow')
        spyOn(businessAvailabilityService, 'getAvailabilityData').and.returnValue({ hdfSubmitted: false })
        spyOn(res, 'render').and.throwError('test')
        await controller(req, res, next)
        expect(res.statusCode).toBe(200)
        expect(next).toHaveBeenCalled()
        done()
      })
    })
  })

  describe('#postAddPupil route', () => {
    let sandbox, controller, nextSpy, pupilAddServiceSpy, next, req, res
    const goodReqParams = {
      method: 'POST',
      url: '/school/pupil/add',
      session: {
        id: 'ArRFdOiz1xI8w0ljtvVuD6LU39pcfgqy'
      }
    }

    beforeEach(() => {
      sandbox = sinon.createSandbox()
      res = getRes()
      req = getReq(goodReqParams)
      nextSpy = sandbox.spy()
      spyOn(checkWindowV2Service, 'getActiveCheckWindow')
      spyOn(businessAvailabilityService, 'getAvailabilityData').and.returnValue({ hdfSubmitted: false })
    })

    afterEach(() => { sandbox.restore() })

    describe('the pupilData is saved', () => {
      beforeEach(() => {
        pupilAddServiceSpy = sandbox.stub(pupilAddService, 'addPupil').resolves(pupilMock)
        controller = proxyquire('../../../controllers/pupil.js', {
          '../services/data-access/school.data.service': schoolDataService,
          '../services/pupil-add-service': pupilAddService
        }).postAddPupil
      })

      it('calls pupilAddService to add a new pupil to the database', async (done) => {
        await controller(req, res, nextSpy)
        expect(pupilAddServiceSpy.callCount).toBe(1)
        done()
      })

      it('redirects to the pupil register page', async (done) => {
        await controller(req, res, nextSpy)
        expect(res.statusCode).toBe(302)
        done()
      })
    })

    describe('the pupilData is not saved', () => {
      beforeEach(() => {
        const validationError = new ValidationError()
        validationError.addError('upn', 'Mock error')
        next = jasmine.createSpy('next')
        pupilAddServiceSpy = sandbox.stub(pupilAddService, 'addPupil').throws(validationError)
        controller = proxyquire('../../../controllers/pupil.js', {
          '../services/pupil-add-service': pupilAddService
        })
      })

      it('then it shows the page again', async (done) => {
        sandbox.stub(controller, 'getAddPupil').callsFake((req, res, next, error) => {
          res.end('mock doc')
          return Promise.resolve()
        })
        await controller.postAddPupil(req, res, nextSpy)
        expect(pupilAddServiceSpy.callCount).toBe(1)
        expect(next).not.toHaveBeenCalled()
        expect(res.statusCode).toBe(200)
        done()
      })
    })
  })

  describe('getAddMultiplePupils() route', () => {
    let controller
    let sandbox
    let next
    const goodReqParams = {
      method: 'GET',
      url: '/school/pupil/add-batch-pupils',
      session: {
        id: 'ArRFdOiz1xI8w0ljtvVuD6LU39pcfgqy'
      }
    }

    beforeEach(() => {
      sandbox = sinon.createSandbox()
      next = jasmine.createSpy('next')
      controller = require('../../../controllers/pupil.js').getAddMultiplePupils
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('displays an add multiple pupil page', async (done) => {
      const res = getRes()
      const req = getReq(goodReqParams)
      spyOn(uploadedFileService, 'getFilesize')
      spyOn(uploadedFileService, 'getAzureBlobFileSize')
      spyOn(checkWindowV2Service, 'getActiveCheckWindow')
      spyOn(businessAvailabilityService, 'getAvailabilityData').and.returnValue({ hdfSubmitted: false })
      await controller(req, res, next)
      expect(res.statusCode).toBe(200)
      expect(uploadedFileService.getFilesize).toHaveBeenCalled()
      expect(uploadedFileService.getAzureBlobFileSize).toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
      done()
    })

    it('catches errors in the render() call', async (done) => {
      const res = getRes()
      const req = getReq(goodReqParams)
      spyOn(uploadedFileService, 'getFilesize')
      spyOn(uploadedFileService, 'getAzureBlobFileSize')
      spyOn(checkWindowV2Service, 'getActiveCheckWindow')
      spyOn(businessAvailabilityService, 'getAvailabilityData').and.returnValue({ hdfSubmitted: false })
      spyOn(res, 'render').and.throwError('test')
      await controller(req, res, next)
      expect(res.statusCode).toBe(200)
      expect(uploadedFileService.getFilesize).toHaveBeenCalled()
      expect(uploadedFileService.getAzureBlobFileSize).toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
      done()
    })
  })

  describe('postAddMultiplePupils() route', () => {
    let controller
    let sandbox
    let next
    const goodReqParams = {
      method: 'POST',
      url: '/school/pupil/add-batch-pupils',
      session: {
        id: 'ArRFdOiz1xI8w0ljtvVuD6LU39pcfgqy'
      },
      files: {
        csvTemplate: {
          name: 'name'
        }
      }
    }
    beforeEach(() => {
      sandbox = sinon.createSandbox()
      next = jasmine.createSpy('next')
      spyOn(checkWindowV2Service, 'getActiveCheckWindow')
      spyOn(businessAvailabilityService, 'getAvailabilityData').and.returnValue({ hdfSubmitted: false })
    })

    afterEach(() => {
      sandbox.restore()
    })

    describe('when the school is found in the database', () => {
      beforeEach(() => {
        sandbox.mock(schoolDataService).expects('sqlFindOneById').resolves(schoolMock)
        controller = proxyquire('../../../controllers/pupil.js', {
          '../services/data-access/school.data.service': schoolDataService
        }).postAddMultiplePupils
      })

      it('saves the new pupil and redirects to the register pupils page', async (done) => {
        spyOn(fileValidator, 'validate').and.returnValue(Promise.resolve(new ValidationError()))
        spyOn(pupilUploadService, 'upload').and.returnValue(Promise
          .resolve({ pupilIds: ['1', '2'] }))
        spyOn(pupilDataService, 'sqlFindByIds').and.returnValue(Promise.resolve([pupilMock]))
        const res = getRes()
        const req = getReq(goodReqParams)
        req.flash = () => {}
        await controller(req, res, next)
        expect(res.statusCode).toBe(302)
        done()
      })

      it('displays the add multiple pupils page when file errors have been found', async (done) => {
        const validationError = new ValidationError()
        validationError.addError('test-field', 'test error message')
        spyOn(fileValidator, 'validate').and.returnValue(Promise.resolve(validationError))
        const res = getRes()
        const req = getReq(goodReqParams)
        await controller(req, res, next)
        expect(res.statusCode).toBe(200)
        expect(res.fileErrors.get('test-field')).toBe('test error message')
        expect(res.locals).toBeDefined()
        expect(res.locals.pageTitle).toBe('Add multiple pupils')
        done()
      })

      it('calls next for any thrown errors within pupilUpload service', async (done) => {
        spyOn(fileValidator, 'validate').and.returnValue(Promise.resolve(new ValidationError()))
        spyOn(pupilUploadService, 'upload').and.returnValue(Promise.reject(new Error('error')))
        const res = getRes()
        const req = getReq(goodReqParams)
        await controller(req, res, next)
        expect(res.statusCode).toBe(200)
        expect(next).toHaveBeenCalled()
        done()
      })

      it('calls next for any error that is returned from pupilUpload service', async (done) => {
        spyOn(fileValidator, 'validate').and.returnValue(Promise.resolve(new ValidationError()))
        spyOn(pupilUploadService, 'upload').and.returnValue(Promise
          .resolve({ error: 'error' }))
        const res = getRes()
        const req = getReq(goodReqParams)
        await controller(req, res, next)
        expect(res.statusCode).toBe(200)
        expect(next).toHaveBeenCalledWith('error')
        done()
      })

      it('displays the add multiple pupils page when csv validation returns errors', async (done) => {
        spyOn(fileValidator, 'validate').and.returnValue(Promise.resolve(new ValidationError()))
        spyOn(pupilUploadService, 'upload').and.returnValue(Promise.resolve({
          csvErrorFile: 'test.csv',
          hasValidationError: true
        }))
        const res = getRes()
        const req = getReq(goodReqParams)
        await controller(req, res, next)
        expect(res.statusCode).toBe(200)
        expect(req.session.csvErrorFile).toBe('test.csv')
        expect(res.locals).toBeDefined()
        expect(res.locals.pageTitle).toBe('Add multiple pupils')
        done()
      })
    })

    describe('when the school is not found in the database', () => {
      beforeEach(() => {
        sandbox.mock(schoolDataService).expects('sqlFindOneById').resolves(undefined)
        controller = proxyquire('../../../controllers/pupil.js', {
          '../services/data-access/school.data.service': schoolDataService
        }).postAddMultiplePupils
      })
      it('it throws an error', async (done) => {
        const res = getRes()
        const req = getReq(goodReqParams)
        await controller(req, res, next)
        expect(next).toHaveBeenCalled()
        expect(res.statusCode).toBe(200)
        done()
      })
    })
  })

  describe('getErrorCSVFile route', () => {
    let controller
    let sandbox
    let next
    const goodReqParams = {
      method: 'GET',
      url: '/pupil/download-error-csv',
      session: {
        id: 'ArRFdOiz1xI8w0ljtvVuD6LU39pcfgqy'
      }
    }

    beforeEach(() => {
      sandbox = sinon.createSandbox()
      next = jasmine.createSpy('next')
      controller = require('../../../controllers/pupil.js').getErrorCSVFile
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('writes csv file to response and calls end to begin download', async (done) => {
      spyOn(azureFileDataService, 'azureDownloadFile').and.returnValue(Promise.resolve('text'))
      const res = getRes()
      res.write = () => {}
      res.end = () => {}
      spyOn(res, 'write').and.returnValue(null)
      spyOn(res, 'end').and.returnValue(null)
      const req = getReq(goodReqParams)
      await controller(req, res, next)
      expect(res.statusCode).toBe(200)
      expect(res.write).toHaveBeenCalledWith('text')
      expect(res.end).toHaveBeenCalled()
      done()
    })
  })

  describe('#getEditPupilById', () => {
    let controller, next
    const populatedPupilMock = R.assoc('school', schoolMock, pupilMock)
    const goodReqParams = {
      method: 'GET',
      url: '/school/pupil/edit/pupil1234',
      session: {
        id: 'ArRFdOiz1xI8w0ljtvVuD6LU39pcfgqy'
      },
      params: {
        id: 'pupil999'
      },
      user: {
        schoolId: 42
      }
    }

    beforeEach(() => {
      controller = require('../../../controllers/pupil.js').getEditPupilById
      next = jasmine.createSpy('next')
    })

    it('retrieves the pupil data', async () => {
      const res = getRes()
      const req = getReq(goodReqParams)
      spyOn(pupilDataService, 'sqlFindOneBySlugWithAgeReason').and.returnValue(Promise.resolve(populatedPupilMock))
      await controller(req, res, next)
      expect(pupilDataService.sqlFindOneBySlugWithAgeReason).toHaveBeenCalled()
    })

    it('bails out if the pupil is not found', async () => {
      const res = getRes()
      const req = getReq(goodReqParams)
      spyOn(pupilDataService, 'sqlFindOneBySlugWithAgeReason').and.returnValue(Promise.resolve(null))
      await controller(req, res, next)
      expect(next).toHaveBeenCalledWith(new Error(`Pupil ${req.params.id} not found`))
    })

    it('bails out if any of the method raises an exception', async () => {
      const res = getRes()
      const req = getReq(goodReqParams)
      spyOn(pupilDataService, 'sqlFindOneBySlugWithAgeReason').and.callFake(() => { throw new Error('dummy error') })
      controller(req, res, next)
      expect(next).toHaveBeenCalledWith(new Error('dummy error'))
    })
  })

  describe('postEditPupil', () => {
    let controller, next
    const goodReqParams = {
      method: 'GET',
      url: '/school/pupil/edit/pupil1234',
      session: {
        id: 'ArRFdOiz1xI8w0ljtvVuD6LU39pcfgqy'
      },
      body: {
        slug: 'pupil998'
      }
    }

    beforeEach(() => {
      controller = require('../../../controllers/pupil.js').postEditPupil
      next = jasmine.createSpy('next')
    })

    it('makes a call to retrieve the pupil', async () => {
      const res = getRes()
      const req = getReq(goodReqParams)
      spyOn(pupilDataService, 'sqlFindOneBySlugWithAgeReason').and.returnValue(Promise.resolve(pupilMock))
      spyOn(schoolDataService, 'sqlFindOneById').and.returnValue(Promise.resolve(schoolMock))
      spyOn(pupilAgeReasonService, 'refreshPupilAgeReason')
      // As we do not want to run any more of the controller code than we need to we can trigger an
      // exception to bail out early, which saves mocking the remaining calls.
      spyOn(pupilValidator, 'validate').and.callFake(() => { throw new Error('unit test early exit') })
      await controller(req, res, next)
      expect(pupilDataService.sqlFindOneBySlugWithAgeReason).toHaveBeenCalled()
      expect(pupilAgeReasonService.refreshPupilAgeReason).not.toHaveBeenCalled()
    })

    it('bails out if the pupil if not found', async () => {
      const res = getRes()
      const req = getReq(goodReqParams)
      spyOn(pupilDataService, 'sqlFindOneBySlugWithAgeReason').and.returnValue(Promise.resolve(null))
      spyOn(pupilAgeReasonService, 'refreshPupilAgeReason')
      await controller(req, res, next)
      expect(next).toHaveBeenCalledWith(new Error(`Pupil ${req.body.urlSlug} not found`))
      expect(pupilAgeReasonService.refreshPupilAgeReason).not.toHaveBeenCalled()
    })

    it('makes a call to retrieve the school', async () => {
      const res = getRes()
      const req = getReq(goodReqParams)
      spyOn(pupilDataService, 'sqlFindOneBySlugWithAgeReason').and.returnValue(Promise.resolve(pupilMock))
      spyOn(schoolDataService, 'sqlFindOneById').and.returnValue(Promise.resolve(schoolMock))
      spyOn(pupilAgeReasonService, 'refreshPupilAgeReason')
      // As we do not want to run any more of the controller code than we need to we can trigger an
      // exception to bail out early, which saves mocking the remaining calls.
      spyOn(pupilValidator, 'validate').and.callFake(() => { throw new Error('unit test early exit') })
      await controller(req, res, next)
      expect(pupilDataService.sqlFindOneBySlugWithAgeReason).toHaveBeenCalled()
      expect(schoolDataService.sqlFindOneById).toHaveBeenCalledWith(pupilMock.school_id)
      expect(pupilAgeReasonService.refreshPupilAgeReason).not.toHaveBeenCalled()
    })

    // TODO - this method requires further coverage
  })
})
