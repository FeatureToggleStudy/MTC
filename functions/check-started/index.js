'use strict'

const azureStorage = require('azure-storage')
const bluebird = require('bluebird')
const moment = require('moment')
const sqlService = require('less-tedious')
const uuid = require('uuid/v4')
const winston = require('winston')
const { TYPES } = require('tedious')

winston.level = 'error'
const config = require('../config')
sqlService.initialise(config)
const { deleteFromPreparedCheckTableStorage } = require('../lib/lib')

const checkStatusTable = '[checkStatus]'
const checkTable = '[checkFormAllocation]'
const schema = ['mtc_admin']
let azureTableService
initAzureTableService()

module.exports = async function (context, checkStartMessage) {
  context.log('check-started message received', checkStartMessage.checkCode)

  // Update the admin database to update the check status to Check Started
  try {
    await updateAdminDatabaseForCheckStarted(checkStartMessage.checkCode, context.log)
    context.log('SUCCESS: Admin DB updated')
  } catch (error) {
    context.log.error(`ERROR: unable to update admin db for [${checkStartMessage.checkCode}]`)
    throw error
  }

  // Delete the row in the preparedCheck table - prevent pupils logging in again.
  try {
    await deleteFromPreparedCheckTableStorage(azureStorage, azureTableService, checkStartMessage.checkCode, context.log)
    context.log('SUCCESS: pupil check row deleted from preparedCheck table')
  } catch (error) {
    context.log.error(`ERROR: unable to delete from table storage for [${checkStartMessage.checkCode}]`)
    throw error
  }

  // Store the raw message to an audit log
  context.bindings.pupilEventsTable = []
  const entity = {
    PartitionKey: checkStartMessage.checkCode,
    RowKey: uuid(),
    eventType: 'check-started',
    payload: JSON.stringify(checkStartMessage),
    processedAt: moment().toDate()
  }

  context.bindings.pupilEventsTable.push(entity)
}

/**
 * Update the master SQL Server admin database that the check indicated by <checkCode> has now been started
 * @param {String} checkStarted - the unique GUID that identifies the check in the admin DB
 * @return {Promise<void>}
 */
async function updateAdminDatabaseForCheckStarted (checkCode, logger) {
  // For performance reasons we avoid doing a lookup on the checkCode - just issue the UPDATE
  const sql = `UPDATE ${schema}.${checkTable}
               SET checkStatus_id = 
                  (SELECT TOP 1 id from ${schema}.${checkStatusTable} WHERE code = 'STD')                  
               where checkCode = @checkCode`

  const params = [
    {
      name: 'checkCode',
      value: checkCode,
      type: TYPES.UniqueIdentifier
    }
  ]

  try {
    const res = await sqlService.modify(sql, params)
    if (res.rowsModified === 0) {
      logger('updateAdminDatabaseForCheckStarted: no rows modified.  This may be a bad checkCode.')
    }
  } catch (error) {
    logger('updateAdminDatabaseForCheckStarted: failed to update the SQL DB: ' + error.message)
    throw error
  }
}

/**
 * Promisify the azureStorage library as it still lacks Promise support
 */
function initAzureTableService () {
  if (!azureTableService) {
    azureTableService = azureStorage.createTableService()
    bluebird.promisifyAll(azureTableService, {
      promisifier: (originalFunction) => function (...args) {
        return new Promise((resolve, reject) => {
          try {
            originalFunction.call(this, ...args, (error, result, response) => {
              if (error) {
                return reject(error)
              }
              resolve({ result, response })
            })
          } catch (error) {
            reject(error)
          }
        })
      }
    })
  }
}
