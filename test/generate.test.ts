import * as path from 'path'
import { MongoClient } from 'mongodb'
import { loadReports } from '../src/core/loader'
import { generateReports } from '../src/core/generate'
import { isDoStatement } from 'typescript'

let client: any
let db: any
describe('Report Generate Tests', () => {
  beforeAll(async () => {
    client = new MongoClient('mongodb://localhost:27017')
    await client.connect()
    db = client.db('test')
  })

  afterAll(async () => {
    await client.close()
  })

  beforeEach(async () => {
    await db.collection('dataset').deleteMany({})

    const preCollections = await db.listCollections({}).toArray()
    if (preCollections.find((c: any) => c.name === 'testReport')) {
      await db.collection('testReport').drop()
    }

    if (preCollections.find((c: any) => c.name === 't1')) {
      await db.collection('t1').drop()
    }

    if (preCollections.find((c: any) => c.name === 't2')) {
      await db.collection('t2').drop()
    }
  })

  it ('should fail if unable to connect to MongoDB', async () => {
    const reports = await loadReports({
      mongoUri: 'mongodb://localhost:27017',
      mongoDb: 'test',
      batchSize: 500,
      reportDir: path.resolve('test/schemas/t3')
    })

    try {
      await generateReports({
        mongoUri: 'mongodb://localhost123:27017',
        mongoDb: 'test',
      }, reports)
    } catch (err) {
      expect(true).toBeTruthy()
      expect(err.message.indexOf('ENOTFOUND')).toBeGreaterThan(-1)
    }
  })

  it ('should fail if collection does not exist in MongoDB', async () => {
    const reports = await loadReports({
      mongoUri: 'mongodb://localhost:27017',
      mongoDb: 'test',
      batchSize: 500,
      reportDir: path.resolve('test/schemas/t3')
    })

    try {
      await generateReports({
        mongoUri: 'mongodb://localhost:27017',
        mongoDb: 'test',
      }, reports)
    } catch (err) {
      expect(true).toBeTruthy()
      expect(err.message).toEqual('Could not find the collection test')
    }
  })

  it ('should fail if a related collection does not exist in MongoDB', async () => {
    const reports = await loadReports({
      mongoUri: 'mongodb://localhost:27017',
      mongoDb: 'test',
      batchSize: 500,
      reportDir: path.resolve('test/schemas/t4')
    })

    try {
      await generateReports({
        mongoUri: 'mongodb://localhost:27017',
        mongoDb: 'test',
      }, reports)
    } catch (err) {
      expect(true).toBeTruthy()
      expect(err.message).toEqual('Could not find the related collection doesnotexist')
    }
  })

  it ('should create a 1 field report from existing collection', async () => {
    const reports = await loadReports({
      mongoUri: 'mongodb://localhost:27017',
      mongoDb: 'test',
      batchSize: 500,
      reportDir: path.resolve('test/schemas/t5')
    })

    await db.collection('dataset').insertMany([
      { name: 'foo' },
      { name: 'bar' }
    ])

    await generateReports({
      mongoUri: 'mongodb://localhost:27017',
      mongoDb: 'test',
    }, reports)

    const collections = await db.listCollections({}).toArray()
    expect(collections.length).toEqual(2)
    expect(collections.find((c: any) => c.name === 'dataset')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 'testReport')).toBeTruthy()

    const data = await db.collection('dataset').find({}).toArray()
    expect(data.length).toEqual(2) // data should be unchanged in collection we read from
    const results = await db.collection('testReport').find({}).toArray()
    expect(results.length).toEqual(2)
    expect(Object.keys(results[0])).toEqual(expect.arrayContaining(['_id', 'id']))
    expect(Object.keys(results[1])).toEqual(expect.arrayContaining(['_id', 'id']))
  })

  it ('should create a report with joined unwind collections', async () => {
    const reports = await loadReports({
      mongoUri: 'mongodb://localhost:27017',
      mongoDb: 'test',
      batchSize: 500,
      reportDir: path.resolve('test/schemas/t8')
    })

    await db.collection('dataset').insertMany([
      { name: 'foo', t1name: 'foo', t2name: 'foo' },
      { name: 'bar', t1name: 'bar', t2name: 'bar' }
    ])
    await db.collection('t1').insertMany([
      { name: 'foo', age: 1 },
      { name: 'bar', age: 2 }
    ])
    await db.collection('t2').insertMany([
      { name: 'foo', weight: 100 },
      { name: 'bar', weight: 200 }
    ])

    await generateReports({
      mongoUri: 'mongodb://localhost:27017',
      mongoDb: 'test',
    }, reports)

    const collections = await db.listCollections({}).toArray()
    expect(collections.length).toEqual(4)
    expect(collections.find((c: any) => c.name === 'dataset')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 't1')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 't2')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 'testReport')).toBeTruthy()

    const data = await db.collection('dataset').find({}).toArray()
    expect(data.length).toEqual(2) // data should be unchanged in collection we read from
    const t1data = await db.collection('dataset').find({}).toArray()
    expect(t1data.length).toEqual(2) // data should be unchanged in collection we read from
    const t2data = await db.collection('dataset').find({}).toArray()
    expect(t2data.length).toEqual(2) // data should be unchanged in collection we read from
    const results = await db.collection('testReport').find({}).toArray()
    expect(results.length).toEqual(2)
    expect(Object.keys(results[0])).toEqual(expect.arrayContaining(['_id', 'id', 't1age', 't2weight']))
    expect(results[0].t1age).toEqual(1)
    expect(results[0].t2weight).toEqual(100)
    expect(Object.keys(results[1])).toEqual(expect.arrayContaining(['_id', 'id', 't1age', 't2weight']))
    expect(results[1].t1age).toEqual(2)
    expect(results[1].t2weight).toEqual(200)
  })

  it.skip ('should create a report with joined unwind collections and filtering applied', async () => {
    const reports = await loadReports({
      mongoUri: 'mongodb://localhost:27017',
      mongoDb: 'test',
      batchSize: 500,
      reportDir: path.resolve('test/schemas/t8')
    })

    await db.collection('dataset').insertMany([
      { name: 'foo', t1name: 'foo', t2name: 'foo' },
      { name: 'bar', t1name: 'bar', t2name: 'bar' }
    ])
    await db.collection('t1').insertMany([
      { name: 'foo', age: 1 },
      { name: 'bar', age: 2 }
    ])
    await db.collection('t2').insertMany([
      { name: 'foo', weight: 100 },
      { name: 'bar', weight: 200 }
    ])

    await generateReports({
      mongoUri: 'mongodb://localhost:27017',
      mongoDb: 'test',
    }, reports)

    const collections = await db.listCollections({}).toArray()
    expect(collections.length).toEqual(4)
    expect(collections.find((c: any) => c.name === 'dataset')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 't1')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 't2')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 'testReport')).toBeTruthy()

    const data = await db.collection('dataset').find({}).toArray()
    expect(data.length).toEqual(2) // data should be unchanged in collection we read from
    const t1data = await db.collection('dataset').find({}).toArray()
    expect(t1data.length).toEqual(2) // data should be unchanged in collection we read from
    const t2data = await db.collection('dataset').find({}).toArray()
    expect(t2data.length).toEqual(2) // data should be unchanged in collection we read from
    const results = await db.collection('testReport').find({}).toArray()
    expect(results.length).toEqual(2)
    expect(Object.keys(results[0])).toEqual(expect.arrayContaining(['_id', 'id', 't1age', 't2weight']))
    expect(results[0].t1age).toEqual(1)
    expect(results[0].t2weight).toEqual(100)
    expect(Object.keys(results[1])).toEqual(expect.arrayContaining(['_id', 'id', 't1age', 't2weight']))
    expect(results[1].t1age).toEqual(2)
    expect(results[1].t2weight).toEqual(200)
  })

  it ('should create a report with joined collections not unwinded', async () => {
    const reports = await loadReports({
      mongoUri: 'mongodb://localhost:27017',
      mongoDb: 'test',
      batchSize: 500,
      reportDir: path.resolve('test/schemas/t9')
    })

    await db.collection('dataset').insertMany([
      { name: 'foo', t1name: 'foo', t2name: 'foo' },
      { name: 'bar', t1name: 'bar', t2name: 'bar' }
    ])
    await db.collection('t1').insertMany([
      { name: 'foo', age: 1 },
      { name: 'foo', age: 2 },
      { name: 'bar', age: 10 },
      { name: 'bar', age: 20 }
    ])
    await db.collection('t2').insertMany([
      { name: 'foo', weight: 100 },
      { name: 'foo', weight: 200 },
      { name: 'bar', weight: 1000 },
      { name: 'bar', weight: 2000 }
    ])

    await generateReports({
      mongoUri: 'mongodb://localhost:27017',
      mongoDb: 'test',
    }, reports)

    const collections = await db.listCollections({}).toArray()
    expect(collections.length).toEqual(4)
    expect(collections.find((c: any) => c.name === 'dataset')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 't1')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 't2')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 'testReport')).toBeTruthy()

    const data = await db.collection('dataset').find({}).toArray()
    expect(data.length).toEqual(2) // data should be unchanged in collection we read from
    const t1data = await db.collection('dataset').find({}).toArray()
    expect(t1data.length).toEqual(2) // data should be unchanged in collection we read from
    const t2data = await db.collection('dataset').find({}).toArray()
    expect(t2data.length).toEqual(2) // data should be unchanged in collection we read from
    const results = await db.collection('testReport').find({}).toArray()
    expect(results.length).toEqual(2)
    expect(Object.keys(results[0])).toEqual(expect.arrayContaining(['_id', 'id', 'totalAge', 'totalWeight']))
    expect(results[0].totalAge).toEqual(3)
    expect(results[0].totalWeight).toEqual(300)
    expect(Object.keys(results[1])).toEqual(expect.arrayContaining(['_id', 'id', 'totalAge', 'totalWeight']))
    expect(results[1].totalAge).toEqual(30)
    expect(results[1].totalWeight).toEqual(3000)
  })

  it ('should honor rentention policy', async () => {
    const reports = await loadReports({
      mongoUri: 'mongodb://localhost:27017',
      mongoDb: 'test',
      batchSize: 500,
      reportDir: path.resolve('test/schemas/t10')
    })

    const TWELVEDAYS = 12 * 24 * 60 * 60 * 1000
    const now = (new Date()).getTime()
    await db.collection('dataset').insertMany([
      { name: 'foo', createdAt: new Date(now - TWELVEDAYS) },
      { name: 'bar', createdAt: new Date() }
    ])

    await generateReports({
      mongoUri: 'mongodb://localhost:27017',
      mongoDb: 'test',
    }, reports)
    const collections = await db.listCollections({}).toArray()
    expect(collections.length).toEqual(2)

    const data = await db.collection('dataset').find({}).toArray()
    expect(data.length).toEqual(1)
    expect(data[0].name).toEqual('bar')

    const results = await db.collection('testReport').find({}).toArray()
    expect(results.length).toEqual(1)
  })
})
