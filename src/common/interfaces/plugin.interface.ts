import { PluginAuth } from './plugin-auth.interface'
import { Report } from './report.interface'

export interface PluginOptions {}

export interface Plugin {
  authenticate(): Promise<boolean>
  update(reports: Report[]): Promise<void>
}
