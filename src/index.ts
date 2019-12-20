import { loadReports } from './core/loader'
import { generateReports } from './core/generate'
import { ReportOptions, Report } from './common/interfaces'

export async function nepata(options: ReportOptions) {
  const reports: Array<Report> = loadReports(options)
  await generateReports(options, reports)
}
