'use strict'

const azureStorage = require('azure-storage')
const bluebird = require('bluebird')
const moment = require('moment')
const sqlService = require('less-tedious')
const uuid = require('uuid/v4')
const winston = require('winston')
const { TYPES } = require('tedious')
const R = require('ramda')

winston.level = 'error'
const config = require('../config')
sqlService.initialise(config)
const { deleteFromPreparedCheckTableStorage } = require('../lib/lib')

// SQL server table
const checkResultTable = '[checkResult]'
const checkFormAllocationTable = '[checkFormAllocation]'
const schema = ['mtc_admin']

let azureTableService
initAzureTableService()

module.exports = async function (context, completedCheckMessage) {
  context.log('completed-check message received', completedCheckMessage.checkCode)

  // Update the admin database to update the check status to Check Started
  try {
    await savePayloadToAdminDatabase(completedCheckMessage, context.log)
    context.log('SUCCESS: Admin DB updated')
  } catch (error) {
    context.log.error(`ERROR: unable to update admin db for [${completedCheckMessage.checkCode}]`)
    throw error
  }

  // Delete the row in the preparedCheck table - prevent pupils logging in again.
  // This is a backup process in case the check-started message was not received.
  try {
    await deleteFromPreparedCheckTableStorage(azureStorage, azureTableService, completedCheckMessage.checkCode, context.log)
    context.log('SUCCESS: pupil check row deleted from preparedCheck table')
  } catch (error) {
    // We can ignore "not found" errors in this function
    if (error.type !== 'NOT_FOUND') {
      context.log.error(`ERROR: unable to delete from table storage for [${completedCheckMessage.checkCode}]`)
      throw error
    }
  }

  // Default output is bound to the pupilEvents table (saved in table storage)
  context.bindings.pupilEventsTable = []
  const entity = {
    PartitionKey: completedCheckMessage.checkCode,
    RowKey: uuid(),
    eventType: 'completed-check',
    payload: JSON.stringify(completedCheckMessage),
    processedAt: moment().toDate()
  }
  context.bindings.pupilEventsTable.push(entity)
}

/**
 * High level function to save the payload into the admin db
 * @param completedCheckMessage
 * @param logger
 * @return {Promise<void>}
 */
async function savePayloadToAdminDatabase (completedCheckMessage, logger) {
  let checkFormAllocationData

  try {
    checkFormAllocationData = await sqlFetchCheckFormAllocation(completedCheckMessage.checkCode)
    logger.info('savePayloadToAdminDatabase: data retrieved from SQL: ' + checkFormAllocationData)
  } catch (error) {
    logger.error(`ERROR: savePayloadToAdminDatabase: failed to retrieve checkFormAllocationData for checkCode: [${completedCheckMessage.checkCode}]`)
    throw error
  }

  try {
    await sqlInsertPayload(completedCheckMessage, checkFormAllocationData.id)
  } catch (error) {
    logger.error(`ERROR: savePayloadToAdminDatabase: failed to insert for checkCode: [${completedCheckMessage.checkCode}]`)
    throw error
  }

  logger.info(`SUCCESS: savePayloadToAdminDatabase: succeeded for checkCode: [${completedCheckMessage.checkCode}]`)
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

/**
 * Retrieve the checkFormAllocation data from the db
 * @param checkCode
 * @return {Promise<void>}
 */
async function sqlFetchCheckFormAllocation(checkCode) {
  const sql = `SELECT TOP 1 * FROM ${schema}.${checkFormAllocationTable} WHERE checkCode = @checkCode`
  const params = [
    {
      name: 'checkCode',
      value: checkCode,
      type: TYPES.UniqueIdentifier
    },
  ]
  const res = await sqlService.query(sql, params)
  return R.head(res)
}

/**
 * Insert the payload into the checkResult table
 * @param payload
 * @param checkFormAllocationId
 * @return {Promise<void>}
 */
async function sqlInsertPayload (payload, checkFormAllocationId) {
  const sql = `INSERT INTO ${schema}.${checkResultTable} (payload, checkFormAllocation_id) VALUES (@payload, @checkFormAllocationId)`
  const params = [
    {
      name: 'payload',
      value: JSON.stringify(payload),
      type: TYPES.NVarChar
    },
    {
      name: 'checkFormAllocationId',
      value: checkFormAllocationId,
      type: TYPES.Int
    }
  ]

  await sqlService.modify(sql, params)
}
