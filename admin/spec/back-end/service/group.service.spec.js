'use strict'

/* global describe beforeEach afterEach it expect spyOn fail */

const sinon = require('sinon')

const groupService = require('../../../services/group.service')
const groupDataService = require('../../../services/data-access/group.data.service')
const pupilIdentificationFlagService = require('../../../services/pupil-identification-flag.service')
const groupMock = require('../mocks/group')
const groupsMock = require('../mocks/groups')
const pupilsMock = require('../mocks/pupils')
const groupsNamesMock = groupsMock.map(g => g.name)

describe('group.service', () => {
  let sandbox

  beforeEach(() => { sandbox = sinon.createSandbox() })
  afterEach(() => { sandbox.restore() })

  describe('#getGroups', () => {
    beforeEach(() => {
      spyOn(groupDataService, 'sqlFindGroups').and.returnValue(groupsMock)
    })

    it('should return groups', async (done) => {
      const schoolId = 1
      const groups = await groupService.getGroups(schoolId)
      expect(groups).toEqual(groupsMock)
      expect(groupDataService.sqlFindGroups).toHaveBeenCalled()
      done()
    })
  })

  describe('#getGroupsWithPresentPupils', () => {
    beforeEach(() => {
      spyOn(groupDataService, 'sqlFindGroupsWithAtleastOnePresentPupil').and.returnValue(groupsMock)
    })

    it('should return groups', async (done) => {
      const schoolId = 1
      const groups = await groupService.getGroupsWithPresentPupils(schoolId)
      expect(groups).toEqual(groupsMock)
      expect(groupDataService.sqlFindGroupsWithAtleastOnePresentPupil).toHaveBeenCalled()
      done()
    })
  })

  describe('#getGroupsAsArray', () => {
    describe('happy path', () => {
      beforeEach(() => {
        spyOn(groupDataService, 'sqlFindGroups').and.returnValue(groupsMock)
      })

      it('should return groups', async (done) => {
        const schoolId = 1
        const groups = await groupService.getGroupsAsArray(schoolId)
        expect(groups[1]).toEqual('Test Group 1')
        expect(groups[2]).toEqual('Test Group 2')
        expect(groups[3]).toEqual('Test Group 3')
        done()
      })

      it('should return an error if schoolId is missing', async (done) => {
        const schoolId = null
        try {
          await groupService.getGroupsAsArray(schoolId)
          fail('error not thrown')
        } catch (error) {
          expect(error.message).toEqual('schoolId is required')
        }
        done()
      })
    })
  })

  describe('#getPupils', () => {
    beforeEach(() => {
      spyOn(groupDataService, 'sqlFindPupilsInNoGroupOrSpecificGroup').and.returnValue(pupilsMock)
      spyOn(pupilIdentificationFlagService, 'addIdentificationFlags').and.returnValue(pupilsMock)
    })

    it('should return pupils', async (done) => {
      const schoolId = 1
      const groupIdToExclude = 1
      const pupils = await groupService.getPupils(schoolId, groupIdToExclude)
      expect(pupils).toEqual(pupilsMock)
      done()
    })

    it('should return an error if schoolId is missing', async (done) => {
      const schoolId = null
      const groupIdToExclude = 1
      try {
        await groupService.getPupils(schoolId, groupIdToExclude)
        fail('error not thrown')
      } catch (error) {
        expect(error.message).toEqual('schoolId is required')
      }
      done()
    })
  })

  describe('#getGroupById', () => {
    beforeEach(() => {
      spyOn(groupDataService, 'sqlFindOneById').and.returnValue(groupMock)
    })

    it('should return group document filtered by group id', async (done) => {
      const groupId = '123456abcde'
      const schoolId = 123
      const group = await groupService.getGroupById(groupId, schoolId)
      expect(group).toEqual(groupMock)
      done()
    })

    it('should return an error if schoolId or groupId are missing', async (done) => {
      const groupId = '123456abcde'
      const schoolId = null
      try {
        await groupService.getGroupById(groupId, schoolId)
        fail('error not thrown')
      } catch (error) {
        expect(error.message).toEqual('schoolId and groupId are required')
      }
      done()
    })
  })

  describe('#update', () => {
    let service

    describe('happy path', () => {
      beforeEach(() => {
        service = require('../../../services/group.service')
        spyOn(groupDataService, 'sqlUpdate').and.returnValue(Promise.resolve())
        spyOn(groupDataService, 'sqlModifyGroupMembers').and.returnValue(Promise.resolve())
        spyOn(service, 'getPupils').and.returnValue(pupilsMock)
      })

      it('should update group (including pupils)', async (done) => {
        const schoolId = 123
        const thisGroupMock = JSON.parse(JSON.stringify(groupMock))
        thisGroupMock.pupils = [2]
        await service.update(1, thisGroupMock, schoolId)
        expect(groupDataService.sqlUpdate).toHaveBeenCalled()
        expect(groupDataService.sqlModifyGroupMembers).toHaveBeenCalled()
        done()
      })

      it('should update group (including pupils) when sent as an object', async (done) => {
        const schoolId = 123
        const thisGroupMock = JSON.parse(JSON.stringify(groupMock))
        thisGroupMock.pupils = { 2: 2 }
        await service.update(1, thisGroupMock, schoolId)
        expect(groupDataService.sqlUpdate).toHaveBeenCalled()
        expect(groupDataService.sqlModifyGroupMembers).toHaveBeenCalled()
        done()
      })

      it('should update group (excluding pupils when they are the same)', async (done) => {
        const schoolId = 123
        const thisGroupMock = JSON.parse(JSON.stringify(groupMock))
        thisGroupMock.pupils = [3]
        await service.update(1, thisGroupMock, schoolId)
        expect(groupDataService.sqlUpdate).toHaveBeenCalled()
        expect(groupDataService.sqlModifyGroupMembers).toHaveBeenCalledTimes(0)
        done()
      })

      it('should trim whitespace from name', async (done) => {
        const schoolId = 123
        const thisGroupMock = JSON.parse(JSON.stringify(groupMock))
        thisGroupMock.name = 'Test '
        await service.update(1, thisGroupMock, schoolId)
        expect(groupDataService.sqlUpdate).toHaveBeenCalledWith(thisGroupMock.id, 'Test', schoolId)
        done()
      })
    })

    describe('unhappy path', () => {
      beforeEach(() => {
        service = require('../../../services/group.service')
        spyOn(groupDataService, 'sqlUpdate').and.returnValue(Promise.resolve())
        spyOn(groupDataService, 'sqlModifyGroupMembers').and.returnValue(Promise.resolve())
      })

      it('should return an error if schoolId is missing', async (done) => {
        const schoolId = null
        try {
          await service.update(1, groupMock, schoolId)
          fail('error not thrown')
        } catch (error) {
          expect(error.message).toEqual('id, group.name and schoolId are required')
        }
        done()
      })
    })

    describe('unhappy path', () => {
      beforeEach(() => {
        service = require('../../../services/group.service')
        spyOn(groupDataService, 'sqlUpdate').and.returnValue(Promise.reject(new Error('Failed to update group')))
        spyOn(groupDataService, 'sqlModifyGroupMembers').and.returnValue(Promise.resolve())
      })

      it('should not update group', async (done) => {
        try {
          const schoolId = 123
          const group = await service.update(1, groupMock, schoolId)
          fail('error not thrown')
          expect(group).toEqual(groupMock)
        } catch (error) {
          expect(error.message).toBe('Failed to update group')
        }
        done()
      })
    })
  })

  describe('#create', () => {
    let service

    describe('happy path', () => {
      beforeEach(() => {
        service = require('../../../services/group.service')
        spyOn(groupDataService, 'sqlCreate').and.returnValue(Promise.resolve({ insertId: 1 }))
        spyOn(groupDataService, 'sqlModifyGroupMembers').and.returnValue(Promise.resolve())
      })

      it('should create group', async (done) => {
        const schoolId = 123
        const group = await service.create(groupMock.name, [6, 2, 3], schoolId)
        expect(group).toEqual(groupMock.id)
        done()
      })

      it('should trim whitespace from name', async (done) => {
        const schoolId = 123
        await service.create('Test ', [6, 2, 3], schoolId)
        expect(groupDataService.sqlCreate).toHaveBeenCalledWith({ name: 'Test', school_id: schoolId })
        done()
      })
    })

    describe('unhappy path', () => {
      beforeEach(() => {
        service = require('../../../services/group.service')
        spyOn(groupDataService, 'sqlCreate').and.returnValue(Promise.resolve({ insertId: 1 }))
        spyOn(groupDataService, 'sqlModifyGroupMembers').and.returnValue(Promise.resolve())
      })

      it('should return an error if groupName or schoolId are missing', async (done) => {
        const schoolId = null
        try {
          await service.create(groupMock.name, [6, 2, 3], schoolId)
          fail('error not thrown')
        } catch (error) {
          expect(error.message).toEqual('groupName and schoolId are required')
        }
        done()
      })
    })

    describe('unhappy path', () => {
      beforeEach(() => {
        service = require('../../../services/group.service')
        spyOn(groupDataService, 'sqlCreate').and.returnValue(Promise.reject(new Error('Failed to create group')))
        spyOn(groupDataService, 'sqlModifyGroupMembers').and.returnValue(Promise.resolve())
      })

      it('should fail to create a group', async (done) => {
        try {
          const schoolId = 123
          await service.create(groupMock.name, [6, 2, 3], schoolId)
          fail('error not thrown')
        } catch (error) {
          expect(error.message).toBe('Failed to create group')
        }
        done()
      })
    })
  })

  describe('#findGroupsByPupil', () => {
    beforeEach(() => {
      spyOn(groupDataService, 'sqlFindGroupsByIds').and.returnValue(groupsMock)
    })

    it('should return groups that have pupils', async (done) => {
      const schoolId = 1
      const pupilIds = [1, 2, 3, 4]
      const groups = await groupService.findGroupsByPupil(schoolId, pupilIds)
      expect(groups).toEqual(groupsMock)
      done()
    })

    it('should return an error if no pupil id', async (done) => {
      const schoolId = 1
      const pupilIds = null

      try {
        await groupService.findGroupsByPupil(schoolId, pupilIds)
        fail('error not thrown')
      } catch (error) {
        expect(error.message).toEqual('schoolId and pupils are required')
      }
      done()
    })
  })

  describe('#assignGroupsToPupils', () => {
    beforeEach(() => {
      spyOn(groupService, 'getGroupsAsArray').and.returnValue(groupsNamesMock)
    })

    it('should return pupils with groups added', async (done) => {
      const schoolId = 1
      const pupils = await groupService.assignGroupsToPupils(schoolId, pupilsMock)
      expect(pupils.length).toBe(pupilsMock.length)
      expect(pupils[0].group).toEqual('')
      expect(pupils[1].group).toEqual('')
      expect(pupils[2].group).toEqual(groupsMock[1].name)
      done()
    })

    it('should return an empty array if there are no pupils', async (done) => {
      const schoolId = 1
      const pupils = await groupService.assignGroupsToPupils(schoolId, [])
      expect(pupils).toEqual([])
      done()
    })

    it('should return the pupils mock if there are no groups', async (done) => {
      const schoolId = null
      const pupils = await groupService.assignGroupsToPupils(schoolId, pupilsMock)
      expect(pupils).toEqual(pupilsMock)
      done()
    })
  })
})
