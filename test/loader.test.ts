import { loadReports } from '../src/core/loader'
import * as path from 'path'

describe('Reports Loader Tests', () => {
  it('should fail if reports directory does not exist', async () => {
    try {
      await loadReports({
        mongoUri: 'mongodb://localhost:27017',
        mongoDb: 'test',
        batchSize: 500,
        reportDir: path.resolve('notexists')
      })
    } catch (err) {
      expect(err).toBeTruthy()
      expect(err.message).toEqual('Failed to read reports directory. Directory does not exist.')
    }
  })

  it.skip('should fail if reports directory is not readable', async () => {
    try {
      await loadReports({
        mongoUri: 'mongodb://localhost:27017',
        mongoDb: 'test',
        batchSize: 500,
        reportDir: path.resolve('test/schemas/t7')
      })
    } catch (err) {
      expect(err).toBeTruthy()
      expect(err.message.indexOf('Failed to read reports directory')).toBeGreaterThan(-1)
      expect(err.message.indexOf('EACCES: permission denied')).toBeGreaterThan(-1)
    }
  })

  it.skip('should fail if yaml file cannot be read', async () => {
    try {
      await loadReports({
        mongoUri: 'mongodb://localhost:27017',
        mongoDb: 'test',
        batchSize: 500,
        reportDir: path.resolve('test/schemas/t6')
      })
    } catch (err) {
      expect(err).toBeTruthy()
      expect(err.message.indexOf('Failed to read report schema')).toBeGreaterThan(-1)
      expect(err.message.indexOf('EACCES: permission denied')).toBeGreaterThan(-1)
    }
  })

  it('should fail if yaml file cannot be parsed', async () => {
    try {
      await loadReports({
        mongoUri: 'mongodb://localhost:27017',
        mongoDb: 'test',
        batchSize: 500,
        reportDir: path.resolve('test/schemas/t1')
      })
    } catch (err) {
      expect(err).toBeTruthy()
      expect(err.message).toEqual('Nested mappings are not allowed in compact mappings')
    }
  })

  it('should fail if schema is incorrect', async () => {
    try {
      await loadReports({
        mongoUri: 'mongodb://localhost:27017',
        mongoDb: 'test',
        batchSize: 500,
        reportDir: path.resolve('test/schemas/t2')
      })
    } catch (err) {
      expect(err).toBeTruthy()
      expect(err.message).toEqual('data should have required property \'name\'')
    }
  })
})
