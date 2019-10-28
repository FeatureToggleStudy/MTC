import * as R from 'ramda'
import * as RA from 'ramda-adjunct'
import { IRedisService, RedisService } from '../../caching/redis-service'
import config from '../../config'
import { IDateTimeService, DateTimeService } from '../../common/datetime.service'
import { ICheckAllocationDataService, CheckAllocationDataService } from './check-allocation.data.service'
import { IPupilAllocationService, PupilAllocationService } from './pupil-allocation.service'
import { ILogger } from '../../common/logger'

/**
 * Responsible for allocation of pupil check and associated credentials over a specified school.
 * Only performs an allocation for pupils that do not have an existing allocation.
 * Used solely by the check-allocator function
 */
export class SchoolCheckAllocationService {
  private _dataService: ICheckAllocationDataService
  private _redisService: IRedisService
  private _dateTimeService: IDateTimeService
  private _pupilAllocationService: IPupilAllocationService
  private uuidV4RegexPattern = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i)
  private redisAllocationsKeyPrefix = 'pupil-allocations:'

  constructor (
    logger: ILogger,
    checkAllocatorDataService?: ICheckAllocationDataService,
    redisService?: IRedisService,
    dateTimeService?: IDateTimeService,
    pupilAllocationService?: IPupilAllocationService) {

    if (checkAllocatorDataService === undefined) {
      checkAllocatorDataService = new CheckAllocationDataService()
    }
    this._dataService = checkAllocatorDataService

    if (redisService === undefined) {
      redisService = new RedisService(logger)
    }
    this._redisService = redisService

    if (dateTimeService === undefined) {
      dateTimeService = new DateTimeService()
    }
    this._dateTimeService = dateTimeService

    if (pupilAllocationService === undefined) {
      pupilAllocationService = new PupilAllocationService()
    }
    this._pupilAllocationService = pupilAllocationService
  }

  /**
   * @description performs check allocation for all pupils within a specified school
   * @param schoolUUID urlSlug of the school to perform allocation over
   */
  async allocate (schoolUUID: string) {
    if (!schoolUUID.match(this.uuidV4RegexPattern)) {
      throw new Error('schoolUUID argument was not a v4 UUID')
    }

    const pupils = await this._dataService.getPupilsBySchoolUuid(schoolUUID)
    if (RA.isNilOrEmpty(pupils)) return
    const schoolKey = this.redisAllocationsKeyPrefix.concat(schoolUUID)
    const allocationCache = await this._redisService.get(schoolKey)

    for (let pupilIndex = 0; pupilIndex < pupils.length; pupilIndex++) {
      const pupil = pupils[pupilIndex]
      const match = R.find(R.propEq('id', pupil.id), allocationCache.pupils)
      if (match !== undefined) continue
      await this._pupilAllocationService.allocate(pupil)
    }
    allocationCache.lastReplenishmentUtc = this._dateTimeService.utcNow()
    await this._redisService.setex(schoolKey, allocationCache,
      +config.CheckAllocation.ExpiryTimeInSeconds)
  }
}
