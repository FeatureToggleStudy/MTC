'use strict'

/* global describe, expect, it, spyOn */

const azureStorageHelper = require('../lib/azure-storage-helper')
const pupilStatusService = require('./pupil-status.service')

describe('pupil-status.service', () => {
  const logger = {
    info: () => {},
    verbose: () => {},
    error: () => {}
  }
  const logPrefix = 'logPrefix'
  const checkData = []
  for (let i = 0; i < 300; i++) {
    checkData.push({ id: i + 1, isLiveCheck: i < 200, pupilId: i + 1, checkCode: `checkCode${i + 1}` })
  }
  describe('updatePupilStatusForLiveChecksV2', () => {
    it('calls addMessageToQueue repeadetly based on the number of batches', async () => {
      spyOn(azureStorageHelper, 'addMessageToQueue')
      try {
        await pupilStatusService.updatePupilStatusForLiveChecksV2(logger, logPrefix, checkData)
      } catch (err) {
        expect(err).not.toHaveBeenCalled()
      }
      expect(azureStorageHelper.addMessageToQueue).toHaveBeenCalledTimes(2)
    })
    it('calls addMessageToQueue for pupil-status queue with version 2 and 100 checks', async () => {
      const processedCheckData = []
      for (let i = 0; i < 300; i++) {
        processedCheckData.push({ pupilId: i + 1, checkCode: `checkCode${i + 1}` })
      }

      const addMessageToQueueSpy = spyOn(azureStorageHelper, 'addMessageToQueue')
      try {
        await pupilStatusService.updatePupilStatusForLiveChecksV2(logger, logPrefix, checkData)
      } catch (err) {
        expect(err).not.toHaveBeenCalled()
      }
      expect(addMessageToQueueSpy.calls.mostRecent().args[0]).toBe('pupil-status')
      expect(addMessageToQueueSpy.calls.mostRecent().args[1].version).toBe(2)
      expect(addMessageToQueueSpy.calls.first().args[1].messages).toEqual(processedCheckData.filter(i => i.pupilId >= 1 && i.pupilId <= 100))
      expect(addMessageToQueueSpy.calls.mostRecent().args[1].messages).toEqual(processedCheckData.filter(i => i.pupilId >= 101 && i.pupilId < 201))
    })
    it('calls logger error if addMessageToQueue method throws', async () => {
      spyOn(azureStorageHelper, 'addMessageToQueue').and.returnValue(Promise.reject(new Error('error')))
      spyOn(logger, 'error')
      try {
        await pupilStatusService.updatePupilStatusForLiveChecksV2(logger, logPrefix, checkData)
      } catch (err) {
        expect(err).toHaveBeenCalled()
      }
      expect(logger.error).toHaveBeenCalled()
    })
    it('should call logger error and return if check data parameter is undefined', async () => {
      spyOn(logger, 'error')
      spyOn(azureStorageHelper, 'addMessageToQueue')
      try {
        await pupilStatusService.updatePupilStatusForLiveChecksV2(logger, logPrefix, undefined)
      } catch (err) {
        expect(err).not.toHaveBeenCalled()
      }
      expect(azureStorageHelper.addMessageToQueue).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith('logPrefix: updatePupilStatusV2(): ERROR: check data provided must be an array')
    })
  })
})
