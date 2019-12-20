import * as fs from 'fs';
import * as path from 'path'
import * as YAML from 'yaml'
import * as Ajv from 'ajv'

import { Report, ReportOptions } from '../common/interfaces'
import { logger } from './logger'

const ajv = new Ajv()
const schemaData = fs.readFileSync(path.resolve('src/schema/schema.json'), 'utf8')
const validate = ajv.compile(JSON.parse(schemaData))

function readReportsDir(reportsDir: string) {
  try {
    return fs.readdirSync(reportsDir)
  } catch (err) {
    const errMsg = `Failed to read reports directory. ${err.code === 'ENOENT' ? 'Directory does not exist.' : `Error messsage was${err.message ? `\`${err.message || ''}\`` : ''}.`}`
    logger.error(errMsg)
    throw new Error(errMsg)
  }
}

function readReport(report: string) {
  try {
    return fs.readFileSync(report, 'utf8')
  } catch (err) {
    const errMsg = `Failed to read report schema. ${err.code === 'ENOENT' ? 'Report schema does not exist.' : `Error messsage was${err.message ? `\`${err.message || ''}\`` : ''}.`}`
    logger.error(errMsg)
    throw new Error(errMsg)
  }
}

export function loadReports(options: ReportOptions) {
  const reportsDir = (options.reportDir as string) || 'reports'
  let reports = readReportsDir(reportsDir)
  return reports.map((report: string) => {
    logger.info(`Loading report...${report}`)
    const data = readReport(path.resolve(`${reportsDir}/${report}`))
    const json = YAML.parse(data)
    const valid = validate(json)
    if (!valid) {
      const errMsg = ajv.errorsText(validate.errors)
      logger.error(errMsg)
      throw new Error(errMsg)
    }

    return Object.assign({...json, ...{ batchSize: options.batchSize }}) as Report
  })
}
