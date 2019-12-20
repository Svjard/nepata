import { RetentionPeriod } from './retention-period.interface'
import { MongoClientOptions } from 'mongodb'

export interface ReportOptions {
  mongoUri: string
  mongoOptions?: MongoClientOptions
  mongoDb: string
  batchSize?: number
  reportDir?: string
}
