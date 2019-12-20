import { MongoClient } from 'mongodb'
import { Report, ReportOptions } from '../common/interfaces'
import { DatasetType } from '../common/enums'
import { logger } from './logger'
import * as R from 'ramda'
import * as jmespath from 'jmespath'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const BATCH_SIZE = 100

export async function generateReports(options: ReportOptions, reports: Array<Report>) {
  const client = new MongoClient(options.mongoUri, options.mongoOptions)

  try {
    logger.info('Connecting to the database...')
    await client.connect()
    logger.info('Succesfully connected to the database...')
    const db = client.db(options.mongoDb)

    // process the report
    await Promise.all(reports.map(async report => {
      const startTime = (new Date()).getTime()
      logger.info(`Processing ${report.name} report for the ${report.collection} collection`)

      const collections = await db.listCollections({}, { nameOnly: true }).toArray()
      if (!collections || !collections.find(c => c.name === report.collection)) {
        throw new Error(`Could not find the collection ${report.collection}`)
      }

      const c = db.collection(report.collection)

      let pipeline
      if (report.relations) {
        pipeline = report.relations.map(relation => {
          if (!collections.find(c => c.name === relation.collection)) {
            throw new Error(`Could not find the related collection ${relation.collection}`)
          }

          let commands: Array<object> = [{
            $lookup: {
              from: relation.collection,
              localField: relation.localField,
              foreignField: relation.foreignField,
              as: relation.collection
            }
          }]

          if (relation.unwind) {
            commands = [...commands, { $unwind: `$${relation.collection}` }]
          }

          return commands
        })

        logger.debug('Pipeline', JSON.stringify(pipeline))
      }

      let match = {}
      if (report.dataset &&
        report.dataset.type !== DatasetType.All) {
        const lastEntry = await c.findOne({}, { sort: { [report.dataset.type]: -1 }})
        const lastTimestamp = lastEntry[report.dataset.type]
        match = { [report.dataset.type]: { $gt: lastTimestamp } }

        logger.debug('Match Criteria', JSON.stringify(match))
      }

      if (report.rentention) {
        const days = report.rentention.days || 30
        const now = new Date()
        const rententionThreshold = now.getTime() - (days * DAY_IN_MS)
        await c.deleteMany({ [report.rentention.field]: { $lte: new Date(rententionThreshold) } })
      }

      let data
      if (pipeline) {
        logger.debug('Query', Object.getOwnPropertyNames(match).length > 0 ? JSON.stringify([match, ...R.flatten(pipeline)]) : JSON.stringify([...R.flatten(pipeline)]))
        data = Object.getOwnPropertyNames(match).length > 0 ? c.aggregate([match, ...R.flatten(pipeline)]) : c.aggregate([...R.flatten(pipeline)])
      } else {
        logger.debug('Query', JSON.stringify(match))
        data = c.find(match)
      }

      let batch: Array<Record<string, any>> = []
      data.batchSize(options.batchSize || 100)
      while (await data.hasNext()) {
        let obj: Record<string, any> = {}
        const d = await data.next()
        await Promise.all(report.fields.map(async field => {
          obj[field.name] = jmespath.search(d, `${field.value}`)
        }))

        batch.push(obj)
        if (batch.length >= (options.batchSize || BATCH_SIZE)) {
          await db.collection(report.name).insertMany(batch)
          batch = []
        }
      }

      if (batch.length > 0) {
        await db.collection(report.name).insertMany(batch)
      }

      const endTime = (new Date()).getTime()
      logger.info(`Finished Processing ${report.name} report, total elapsed time: ${endTime - startTime}ms`)
    }))

    if (client) {
      await client.close()
    }
  }
  catch (err) {
    if (client) {
      await client.close()
    }
    throw err
  }
}
