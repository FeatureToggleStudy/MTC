'use strict'
/* global describe beforeEach afterEach it expect jasmine spyOn */

const sinon = require('sinon')
const httpMocks = require('node-mocks-http')

const businessAvailabilityService = require('../../../services/business-availability.service')
const attendanceCodeService = require('../../../services/attendance.service')
const attendanceService = require('../../../services/attendance.service')
const checkWindowV2Service = require('../../../services/check-window-v2.service')
const pupilDataService = require('../../../services/data-access/pupil.data.service')
const pupilsNotTakingCheckService = require('../../../services/pupils-not-taking-check.service')
const pupilStatusService = require('../../../services/pupil.status.service')
const groupService = require('../../../services/group.service')
const headteacherDeclarationService = require('../../../services/headteacher-declaration.service')

const pupilMock = require('../mocks/pupil-with-reason')
const pupilsWithReasonsFormattedMock = require('../mocks/pupils-with-reason-formatted')
const pupilsWithReasonsMock = require('../mocks/pupils-with-reason-2')
const groupsMock = require('../mocks/groups')
const schoolHomeFeatureEligibilityPresenter = require('../../../helpers/school-home-feature-eligibility-presenter')

describe('pupils-not-taking-the-check controller:', () => {
  function getRes () {
    const res = httpMocks.createResponse()
    res.locals = {}
    return res
  }

  function getReq (params) {
    const req = httpMocks.createRequest(params)
    req.user = { School: 9991001 }
    req.breadcrumbs = jasmine.createSpy('breadcrumbs')
    req.flash = jasmine.createSpy('flash')
    return req
  }

  describe('Check routes', () => {
    let controller
    let sandbox
    let next
    const goodReqParams = {
      method: 'GET',
      url: '/pupils-not-taking-the-check/pupils-list'
    }

    beforeEach(() => {
      sandbox = sinon.createSandbox()
      next = jasmine.createSpy('next')
      spyOn(pupilStatusService, 'recalculateStatusByPupilSlugs')
    })

    afterEach(() => {
      sandbox.restore()
    })

    describe('#getPupilNotTakingCheck: When there are pupils for the active school', () => {
      beforeEach(() => {
        controller = require('../../../controllers/school').getPupilNotTakingCheck
      })

      it('should display \'pupils not taking the check\' initial page', async (done) => {
        spyOn(pupilsNotTakingCheckService, 'getPupilsWithReasons').and.returnValue(pupilsWithReasonsFormattedMock)
        spyOn(checkWindowV2Service, 'getActiveCheckWindow')
        spyOn(schoolHomeFeatureEligibilityPresenter, 'getPresentationData')
        spyOn(headteacherDeclarationService, 'isHdfSubmittedForCurrentCheck').and.returnValue(false)
        controller = require('../../../controllers/pupils-not-taking-the-check').getPupilNotTakingCheck

        const res = getRes()
        const req = getReq(goodReqParams)
        await controller(req, res, next)
        expect(res.statusCode).toBe(200)
        expect(pupilsNotTakingCheckService.getPupilsWithReasons).toHaveBeenCalled()
        expect(res.locals.pageTitle).toBe('Pupils not taking the check')
        expect(next).not.toHaveBeenCalled()
        expect(checkWindowV2Service.getActiveCheckWindow).toHaveBeenCalled()
        expect(schoolHomeFeatureEligibilityPresenter.getPresentationData).toHaveBeenCalled()
        expect(headteacherDeclarationService.isHdfSubmittedForCurrentCheck).toHaveBeenCalled()
        done()
      })

      it('should execute next if initial page fails to render', async (done) => {
        spyOn(pupilsNotTakingCheckService, 'getPupilsWithReasons').and.returnValue(Promise.reject(new Error()))
        controller = require('../../../controllers/pupils-not-taking-the-check').getPupilNotTakingCheck
        spyOn(checkWindowV2Service, 'getActiveCheckWindow')
        spyOn(schoolHomeFeatureEligibilityPresenter, 'getPresentationData')
        spyOn(headteacherDeclarationService, 'isHdfSubmittedForCurrentCheck').and.returnValue(false)

        const res = getRes()
        const req = getReq(goodReqParams)
        await controller(req, res, next)
        expect(res.statusCode).toBe(200)
        expect(res.locals.pageTitle).toBe('Pupils not taking the check')
        expect(next).toHaveBeenCalled()
        expect(checkWindowV2Service.getActiveCheckWindow).not.toHaveBeenCalled()
        expect(schoolHomeFeatureEligibilityPresenter.getPresentationData).not.toHaveBeenCalled()
        expect(headteacherDeclarationService.isHdfSubmittedForCurrentCheck).not.toHaveBeenCalled()
        done()
      })
    })

    describe('#getSelectPupilNotTakingCheck : Select reason for pupils', () => {
      it('happy path', async () => {
        spyOn(attendanceCodeService, 'getAttendanceCodes').and.returnValue([])
        spyOn(pupilsNotTakingCheckService, 'getPupilsWithoutReasons').and.returnValue(pupilsWithReasonsMock)
        spyOn(groupService, 'getGroupsWithPresentPupils').and.returnValue(groupsMock)
        spyOn(checkWindowV2Service, 'getActiveCheckWindow')
        spyOn(businessAvailabilityService, 'getAvailabilityData').and.returnValue({ hdfSubmitted: false })
        controller = require('../../../controllers/pupils-not-taking-the-check').getSelectPupilNotTakingCheck

        const res = getRes()
        const req = getReq(goodReqParams)
        await controller(req, res, next)
        expect(attendanceCodeService.getAttendanceCodes).toHaveBeenCalled()
        expect(pupilsNotTakingCheckService.getPupilsWithoutReasons).toHaveBeenCalled()
        expect(groupService.getGroupsWithPresentPupils).toHaveBeenCalled()
        expect(next).not.toHaveBeenCalled()
      })

      it('unhappy path - attendanceCodeService.getAttendanceCodes fails', async () => {
        spyOn(attendanceCodeService, 'getAttendanceCodes').and.returnValue(Promise.reject(new Error()))
        spyOn(groupService, 'getGroups').and.returnValue(groupsMock)
        spyOn(checkWindowV2Service, 'getActiveCheckWindow')
        spyOn(businessAvailabilityService, 'getAvailabilityData').and.returnValue({ hdfSubmitted: false })
        controller = require('../../../controllers/pupils-not-taking-the-check').getSelectPupilNotTakingCheck

        const res = getRes()
        const req = getReq(goodReqParams)
        await controller(req, res, next)
        expect(attendanceCodeService.getAttendanceCodes).toHaveBeenCalled()
        expect(groupService.getGroups).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalled()
      })

      it('unhappy path - pupilsNotTakingCheckService.getPupilsWithoutReasons fails', async () => {
        spyOn(attendanceCodeService, 'getAttendanceCodes').and.returnValue([])
        spyOn(pupilsNotTakingCheckService, 'getPupilsWithoutReasons').and.returnValue(Promise.reject(new Error()))
        spyOn(groupService, 'getGroupsWithPresentPupils').and.returnValue(groupsMock)
        spyOn(checkWindowV2Service, 'getActiveCheckWindow')
        spyOn(businessAvailabilityService, 'getAvailabilityData').and.returnValue({ hdfSubmitted: false })
        controller = require('../../../controllers/pupils-not-taking-the-check').getSelectPupilNotTakingCheck

        const res = getRes()
        const req = getReq(goodReqParams)
        await controller(req, res, next)
        expect(attendanceCodeService.getAttendanceCodes).toHaveBeenCalled()
        expect(pupilsNotTakingCheckService.getPupilsWithoutReasons).toHaveBeenCalled()
        expect(groupService.getGroupsWithPresentPupils).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalled()
      })

      it('unhappy path - groupService.getGroups fails', async () => {
        spyOn(attendanceCodeService, 'getAttendanceCodes').and.returnValue([])
        spyOn(pupilsNotTakingCheckService, 'getPupilsWithoutReasons').and.returnValue(pupilsWithReasonsMock)
        spyOn(groupService, 'getGroupsWithPresentPupils').and.returnValue(Promise.reject(new Error()))
        spyOn(checkWindowV2Service, 'getActiveCheckWindow')
        spyOn(businessAvailabilityService, 'getAvailabilityData').and.returnValue({ hdfSubmitted: false })
        controller = require('../../../controllers/pupils-not-taking-the-check').getSelectPupilNotTakingCheck

        const res = getRes()
        const req = getReq(goodReqParams)
        await controller(req, res, next)
        expect(attendanceCodeService.getAttendanceCodes).toHaveBeenCalled()
        expect(pupilsNotTakingCheckService.getPupilsWithoutReasons).toHaveBeenCalled()
        expect(groupService.getGroupsWithPresentPupils).toHaveBeenCalled()
        expect(next).toHaveBeenCalled()
      })
    })

    describe('#savePupilNotTakingCheck: Save reason for pupil', () => {
      it('should save and redirect', async (done) => {
        spyOn(attendanceService, 'updatePupilAttendanceBySlug')
        controller = require('../../../controllers/pupils-not-taking-the-check').savePupilNotTakingCheck

        const res = getRes()
        const req = getReq(
          {
            method: 'POST',
            url: '/pupils-not-taking-the-check/save-pupils',
            body: {
              attendanceCode: '59df7e1c283960b43172ac6c',
              pupil: {
                _id: ['595cd5416e5ca13e48ed2518']
              }
            }
          }
        )

        await controller(req, res, next)
        expect(attendanceService.updatePupilAttendanceBySlug).toHaveBeenCalled()
        expect(res.statusCode).toBe(302)
        // expect(pupilStatusService.recalculateStatusByPupilSlugs).toHaveBeenCalled()
        done()
      })

      it('should redirect because req.body has missing data', async (done) => {
        spyOn(attendanceService, 'updatePupilAttendanceBySlug')
        controller = require('../../../controllers/pupils-not-taking-the-check').savePupilNotTakingCheck

        const res = getRes()
        const req = getReq(
          {
            method: 'POST',
            url: '/pupils-not-taking-the-check/save-pupils',
            body: {
              attendanceCode: undefined,
              pupil: {
                _id: ['595cd5416e5ca13e48ed2518']
              }
            }
          }
        )

        await controller(req, res, next)
        expect(attendanceService.updatePupilAttendanceBySlug).not.toHaveBeenCalled()
        expect(res.statusCode).toBe(302)
        done()
      })

      it('should return next because attendanceCodeService.updatePupilAttendanceBySlug fails', async (done) => {
        spyOn(attendanceService, 'updatePupilAttendanceBySlug').and.returnValue(Promise.reject(new Error()))
        controller = require('../../../controllers/pupils-not-taking-the-check').savePupilNotTakingCheck

        const res = getRes()
        const req = getReq(
          {
            method: 'POST',
            url: '/pupils-not-taking-the-check/save-pupils',
            body: {
              attendanceCode: '59df7e1c283960b43172ac6c',
              pupil: {
                _id: ['595cd5416e5ca13e48ed2518']
              }
            }
          }
        )

        await controller(req, res, next)
        expect(attendanceService.updatePupilAttendanceBySlug).toHaveBeenCalled()
        expect(res.statusCode).toBe(200)
        expect(next).toHaveBeenCalled()
        done()
      })
    })

    describe('#removePupilNotTakingCheck: Remove:  reason for pupil', () => {
      it('should redirect to the select pupils page if pupilId is not supplied', async () => {
        spyOn(attendanceService, 'unsetAttendanceCode').and.returnValue(Promise.resolve(true))
        spyOn(pupilDataService, 'sqlFindOneBySlugAndSchool').and.returnValue(Promise.resolve(pupilMock))

        controller = require('../../../controllers/pupils-not-taking-the-check').removePupilNotTakingCheck

        const res = getRes()
        const req = getReq(
          {
            method: 'GET',
            url: '/pupils-not-taking-the-check/remove',
            params: {
              pupilId: undefined
            },
            user: {
              school: '42'
            }
          }
        )
        await controller(req, res, next)
        expect(res.statusCode).toBe(302)
        expect(res._getRedirectUrl()).toBe('/pupils-not-taking-the-check/select-pupils')
        expect(next).not.toHaveBeenCalled()
      })

      it('should delete reason from pupils document and redirect', async () => {
        spyOn(attendanceService, 'unsetAttendanceCode').and.returnValue(Promise.resolve(true))
        spyOn(pupilDataService, 'sqlFindOneBySlugAndSchool').and.returnValue(Promise.resolve(pupilMock))
        controller = require('../../../controllers/pupils-not-taking-the-check').removePupilNotTakingCheck

        const res = getRes()
        const req = getReq(
          {
            method: 'GET',
            url: '/pupils-not-taking-the-check/remove',
            params: {
              pupilId: '59d02ab09b865f35a3f51940'
            },
            user: {
              schoolId: '42'
            }
          }
        )
        await controller(req, res, next)
        expect(attendanceService.unsetAttendanceCode).toHaveBeenCalledWith(req.params.pupilId, req.user.schoolId)
        expect(req.flash).toHaveBeenCalled()
        expect(res.statusCode).toBe(302)
        // expect(pupilStatusService.recalculateStatusByPupilSlugs).toHaveBeenCalled()
      })

      it('should execute next if attendanceCodeService.unsetAttendanceCode fails', async () => {
        spyOn(attendanceService, 'unsetAttendanceCode').and.returnValue(Promise.reject(new Error()))
        spyOn(pupilDataService, 'sqlFindOneBySlugAndSchool').and.returnValue(Promise.resolve(pupilMock))
        controller = require('../../../controllers/pupils-not-taking-the-check').removePupilNotTakingCheck

        const res = getRes()
        const req = getReq(
          {
            method: 'GET',
            url: '/pupils-not-taking-the-check/remove',
            params: {
              pupilId: '59d02ab09b865f35a3f51940'
            },
            user: {
              schoolId: '42'
            }
          }
        )
        await controller(req, res, next)
        expect(attendanceService.unsetAttendanceCode).toHaveBeenCalledWith(req.params.pupilId, req.user.schoolId)
        expect(pupilDataService.sqlFindOneBySlugAndSchool).not.toHaveBeenCalled()
        expect(req.flash).not.toHaveBeenCalled()
        expect(res.statusCode).toBe(200)
        expect(next).toHaveBeenCalled()
      })

      it('should execute next if pupilDataService.sqlFindOneBySlugAndSchool fails', async () => {
        spyOn(attendanceService, 'unsetAttendanceCode').and.returnValue()
        spyOn(pupilDataService, 'sqlFindOneBySlugAndSchool').and.returnValue(Promise.reject(new Error()))
        controller = require('../../../controllers/pupils-not-taking-the-check').removePupilNotTakingCheck

        const res = getRes()
        const req = getReq(
          {
            method: 'GET',
            url: '/pupils-not-taking-the-check/remove',
            params: {
              pupilId: '59d02ab09b865f35a3f51940'
            },
            user: {
              schoolId: '42'
            }
          }
        )
        await controller(req, res, next)
        expect(attendanceService.unsetAttendanceCode).toHaveBeenCalledWith(req.params.pupilId, req.user.schoolId)
        expect(pupilDataService.sqlFindOneBySlugAndSchool).toHaveBeenCalled()
        expect(req.flash).not.toHaveBeenCalled()
        expect(res.statusCode).toBe(200)
        expect(next).toHaveBeenCalled()
      })
    })

    describe('#viewPupilsNotTakingTheCheck', () => {
      it('should make a call to get the pupils', async () => {
        spyOn(pupilsNotTakingCheckService, 'getPupilsWithReasons').and.returnValue(Promise.resolve(pupilsWithReasonsMock))
        spyOn(headteacherDeclarationService, 'isHdfSubmittedForCurrentCheck').and.returnValue(false)
        spyOn(checkWindowV2Service, 'getActiveCheckWindow')
        spyOn(schoolHomeFeatureEligibilityPresenter, 'getPresentationData')
        controller = require('../../../controllers/pupils-not-taking-the-check').viewPupilsNotTakingTheCheck
        const res = getRes()
        const req = getReq(
          {
            method: 'GET',
            url: '/pupils-not-taking-the-check/remove',
            user: {
              school: '9991999'
            }
          }
        )
        await controller(req, res, next)
        expect(pupilsNotTakingCheckService.getPupilsWithReasons).toHaveBeenCalled()
        expect(checkWindowV2Service.getActiveCheckWindow).toHaveBeenCalled()
        expect(schoolHomeFeatureEligibilityPresenter.getPresentationData).toHaveBeenCalled()
      })
      it('should execute next if pupilsNotTakingCheckService.getPupilsWithReasons fails', async () => {
        spyOn(pupilsNotTakingCheckService, 'getPupilsWithReasons').and.returnValue(Promise.resolve(Promise.reject(new Error())))
        spyOn(headteacherDeclarationService, 'isHdfSubmittedForCurrentCheck').and.returnValue(false)
        spyOn(checkWindowV2Service, 'getActiveCheckWindow')
        spyOn(schoolHomeFeatureEligibilityPresenter, 'getPresentationData')
        controller = require('../../../controllers/pupils-not-taking-the-check').viewPupilsNotTakingTheCheck
        const res = getRes()
        const req = getReq(
          {
            method: 'GET',
            url: '/pupils-not-taking-the-check/remove',
            user: {
              school: '9991999'
            }
          }
        )
        await controller(req, res, next)
        expect(pupilsNotTakingCheckService.getPupilsWithReasons).toHaveBeenCalled()
        expect(checkWindowV2Service.getActiveCheckWindow).not.toHaveBeenCalled()
        expect(schoolHomeFeatureEligibilityPresenter.getPresentationData).not.toHaveBeenCalled()
        expect(res.statusCode).toBe(200)
        expect(next).toHaveBeenCalled()
      })
    })
  })
})
