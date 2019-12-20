import axios from 'axios'
import { Plugin, PluginOptions } from '../common/interfaces/plugin.interface'
import { PluginAuth } from '../common/interfaces/plugin-auth.interface'
import { Report } from '../common/interfaces/report.interface'
import { check } from 'Test'

export interface ConfluenceAuth extends PluginAuth {
  username: string
  password: string
}

export interface ConfluenceOptions extends PluginOptions {
  url: string
  spaceKey: string
  title: string
}

export class ConfluencePlugin implements Plugin {
  private auth: ConfluenceAuth
  private options: ConfluenceOptions

  public constructor(auth: ConfluenceAuth, options: ConfluenceOptions) {
    this.auth = auth
    this.options = options
  }

  public async authenticate(): Promise<boolean> {
    const response = await axios({
      method: 'GET',
      url: `${this.options.url}/rest/api/space`,
      headers: {
        Authorization: `Basic ${new Buffer(`${this.auth.username}:${this.auth.password}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    })

    return response.status === 200
  }

  public async update(reports: Report[]): Promise<void> {
    const checkResponse = await axios({
      method: 'GET',
      url: `${this.options.url}/rest/api/content?title=${encodeURIComponent(this.options.title)}&spaceKey=${this.options.spaceKey}`,
      headers: {
        Authorization: `Basic ${new Buffer(`${this.auth.username}:${this.auth.password}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    })

    // generate the HTML content for the report references
    let content = ''
    reports.forEach((r: Report, index: number) => {
      if (index > 0) {
        content += '<br/><br/>'
      }

      content += `<h1>Report: ${r.name}</h1>`
      content += '<br/>'
      content += '<table><thead><tr><th>Field</th><th>Description</th><th>Derivation</th></tr></thead><tbody>'
      r.fields.forEach(f => {
        content += `<tr><td>${f.name}</td><td>${f.description || ''}</td><td>${f.value}</td></tr>`
      })
      content += '</tbody></table>'
    })

    if (checkResponse.data.results.length === 0) {
      // create the page
      await axios({
        method: 'POST',
        url: `${this.options.url}/rest/api/content`,
        headers: {
          Authorization: `Basic ${new Buffer(`${this.auth.username}:${this.auth.password}`).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        data: {
          type: 'page',
          title: this.options.title || 'Nepata Reports Reference',
          space: {
            key: this.options.spaceKey
          },
          body: {
            storage: {
              value: content,
              representation: 'storage'
            }
          }
        }
      })
    }
    else if (checkResponse.status === 200) {
      // just update the page contents
      await axios({
        method: 'PUT',
        url: `${this.options.url}/rest/api/content`,
        headers: {
          Authorization: `Basic ${new Buffer(`${this.auth.username}:${this.auth.password}`).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        data: {
          type: 'page',
          id: checkResponse.data.results[0].id,
          title: this.options.title || 'Nepata Reports Reference',
          space: {
            key: this.options.spaceKey
          },
          body: {
            storage: {
              value: content,
              representation: 'storage'
            }
          }
        }
      })
    }
    else {
      throw new Error(`Did not recieve expected response for ${this.options.title}`)
    }
  }
}
