'use strict'
require('dotenv').config()
const os = require('os')
const toBool = require('to-bool')
const oneMinuteInMilliseconds = 60000

const getEnvironment = () => {
  return process.env.ENVIRONMENT_NAME || 'Local-Dev'
}

module.exports = {
  AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING,
  REDIS_CACHING: Object.prototype.hasOwnProperty.call(process.env, 'REDIS_CACHING') ? toBool(process.env.REDIS_CACHING) : false,
  Sql: {
    Database: process.env.SQL_DATABASE || 'mtc',
    Server: process.env.SQL_SERVER || 'localhost',
    Port: process.env.SQL_PORT || 1433,
    Timeout: process.env.SQL_TIMEOUT || oneMinuteInMilliseconds,
    requestTimeout: parseInt(process.env.SQL_REQUEST_TIMEOUT, 10) || oneMinuteInMilliseconds,
    connectionTimeout: parseInt(process.env.SQL_CONNECTION_TIMEOUT, 10) || oneMinuteInMilliseconds,
    Encrypt: Object.prototype.hasOwnProperty.call(process.env, 'SQL_ENCRYPT') ? toBool(process.env.SQL_ENCRYPT) : true,
    Application: {
      Name: process.env.SQL_APP_NAME || 'mtc-local-dev', // docker default
      Username: process.env.SQL_APP_USER || 'mtcAdminUser', // docker default
      Password: process.env.SQL_APP_USER_PASSWORD || 'your-chosen*P4ssw0rd_for_dev_env!' // docker default
    },
    PupilCensus: {
      Username: process.env.SQL_PUPIL_CENSUS_USER || 'CensusImportUser',
      Password: process.env.SQL_PUPIL_CENSUS_USER_PASSWORD
    },
    Pooling: {
      MinCount: process.env.SQL_POOL_MIN_COUNT || 5,
      MaxCount: process.env.SQL_POOL_MAX_COUNT || 10,
      LoggingEnabled: Object.prototype.hasOwnProperty.call(process.env, 'SQL_POOL_LOG_ENABLED') ? toBool(process.env.SQL_POOL_LOG_ENABLED) : true
    },
    Azure: {
      Scale: process.env.SQL_AZURE_SCALE
    }
  },
  DatabaseRetry: {
    MaxRetryAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS, 10) || 3,
    InitialPauseMs: parseInt(process.env.RETRY_PAUSE_MS, 10) || 5000,
    PauseMultiplier: parseFloat(process.env.RETRY_PAUSE_MULTIPLIER) || 1.5
  },
  Logging: {
    LogLevel: process.env.LOG_LEVEL || 'debug',
    LogDna: {
      key: process.env.LOGDNA_API_KEY,
      hostname: `${os.hostname()}:${process.pid}`,
      ip: undefined,
      mac: undefined,
      app: `MTCAdmin:${getEnvironment()}`,
      env: `${getEnvironment()}`
    },
    Express: {
      UseWinston: process.env.EXPRESS_LOGGING_WINSTON || false
    },
    ApplicationInsights: {
      LogToWinston: process.env.APPINSIGHTS_WINSTON_LOGGER || false,
      Key: process.env.APPINSIGHTS_INSTRUMENTATIONKEY
    }
  },
  Environment: getEnvironment()
}
