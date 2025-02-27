
import 'dotenv/config'
import * as toBool from './common/to-bool'

const getEnvironment = () => {
  return process.env.ENVIRONMENT_NAME || 'Local-Dev'
}

const oneMinuteInMilliseconds = 60000

function optionalValueParser (input: any, substitute: number): string {
  if (input) {
    return input
  }
  return substitute.toString()
}

export default {
  Environment: getEnvironment(),
  Sql: {
    user: process.env.SQL_APP_USER || 'mtcAdminUser', // docker default
    password: process.env.SQL_APP_USER_PASSWORD || 'your-chosen*P4ssw0rd_for_dev_env!', // docker default
    server: process.env.SQL_SERVER || 'localhost',
    port: parseInt(optionalValueParser(process.env.SQL_PORT, 1433), 10),
    database: process.env.SQL_DATABASE || 'mtc',
    connectionTimeout: parseInt(optionalValueParser(process.env.SQL_CONNECTION_TIMEOUT, oneMinuteInMilliseconds), 10),
    requestTimeout: parseInt(optionalValueParser(process.env.SQL_REQUEST_TIMEOUT,oneMinuteInMilliseconds), 10),
    options: {
      encrypt: process.env.hasOwnProperty('SQL_ENCRYPT') ? toBool.primitiveToBoolean(process.env.SQL_ENCRYPT) : true,
      useUTC: true,
      appName: process.env.SQL_APP_NAME || 'mtc-local-dev' // docker default
    },
    Pooling: {
      MinCount: process.env.SQL_POOL_MIN_COUNT || 5,
      MaxCount: process.env.SQL_POOL_MAX_COUNT || 10,
      LoggingEnabled: process.env.hasOwnProperty('SQL_POOL_LOG_ENABLED') ? toBool.primitiveToBoolean(process.env.SQL_POOL_LOG_ENABLED) : true
    }
  },
  DatabaseRetry: {
    MaxRetryAttempts: parseInt(optionalValueParser(process.env.RETRY_MAX_ATTEMPTS, 3), 10),
    InitialPauseMs: parseInt(optionalValueParser(process.env.RETRY_PAUSE_MS, 5000), 10),
    PauseMultiplier: parseFloat(optionalValueParser(process.env.RETRY_PAUSE_MULTIPLIER, 1.5))
  },
  Redis: {
    Host: process.env.REDIS_HOST || 'localhost',
    Port: process.env.REDIS_PORT || 6379,
    Key: process.env.REDIS_KEY,
    useTLS: getEnvironment() === 'Local-Dev' ? false : true
  },
  CheckAllocation: {
    ExpiryTimeInSeconds: process.env.CHECK_ALLOCATION_EXPIRY_SECONDS || 15778476 // 6 months
  }
}
