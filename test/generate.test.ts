import * as path from 'path'
import { MongoClient } from 'mongodb'
import { loadReports } from '../src/core/loader'
import { generateReports } from '../src/core/generate'
import { MONGO_URI, MONGO_DB } from './utils'

const mongoConfig = {
  mongoUri: MONGO_URI,
  mongoDb: MONGO_DB,
  batchSize: 500
}

let client: any
let db: any
describe('Report Generate Tests', () => {
  beforeAll(async () => {
    client = new MongoClient(MONGO_URI)
    await client.connect()
    db = client.db(MONGO_DB)
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

  it('should fail if unable to connect to MongoDB', async () => {
    const reports = await loadReports({
      ...mongoConfig,
      reportDir: path.resolve('test/schemas/t3')
    })

    try {
      await generateReports(
        {
          mongoUri: 'mongodb://localhost123:27017',
          mongoDb: MONGO_DB
        },
        reports
      )
    } catch (err) {
      expect(true).toBeTruthy()
      expect(err.message.indexOf('ENOTFOUND')).toBeGreaterThan(-1)
    }
  })

  it('should fail if collection does not exist in MongoDB', async () => {
    const reports = await loadReports({
      ...mongoConfig,
      reportDir: path.resolve('test/schemas/t3')
    })

    try {
      await generateReports(
        {
          mongoUri: MONGO_URI,
          mongoDb: MONGO_DB
        },
        reports
      )
    } catch (err) {
      expect(true).toBeTruthy()
      expect(err.message).toEqual('Could not find the collection test')
    }
  })

  it('should fail if a related collection does not exist in MongoDB', async () => {
    const reports = await loadReports({
      ...mongoConfig,
      reportDir: path.resolve('test/schemas/t4')
    })

    await db.collection('dataset').insertMany([{ name: 'foo' }])

    try {
      await generateReports(
        {
          mongoUri: MONGO_URI,
          mongoDb: MONGO_DB
        },
        reports
      )
    } catch (err) {
      expect(true).toBeTruthy()
      expect(err.message).toEqual('Could not find the related collection doesnotexist')
    }
  })

  it('should create a 1 field report from existing collection', async () => {
    const reports = await loadReports({
      ...mongoConfig,
      reportDir: path.resolve('test/schemas/t5')
    })

    await db.collection('dataset').insertMany([{ name: 'foo' }, { name: 'bar' }])

    await generateReports(
      {
        mongoUri: MONGO_URI,
        mongoDb: MONGO_DB
      },
      reports
    )

    const collections = await db.listCollections({}).toArray()
    console.log('collections', collections)
    expect(collections.length).toEqual(2)
    expect(collections.find((c: any) => c.name === 'dataset')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 'testReport')).toBeTruthy()

    const data = await db
      .collection('dataset')
      .find({})
      .toArray()
    expect(data.length).toEqual(2) // data should be unchanged in collection we read from
    const results = await db
      .collection('testReport')
      .find({})
      .toArray()
    expect(results.length).toEqual(2)
    expect(Object.keys(results[0])).toEqual(expect.arrayContaining(['_id', 'id']))
    expect(Object.keys(results[1])).toEqual(expect.arrayContaining(['_id', 'id']))
  })

  it('should create a report with joined unwind collections', async () => {
    const reports = await loadReports({
      ...mongoConfig,
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

    await generateReports(
      {
        mongoUri: MONGO_URI,
        mongoDb: MONGO_DB
      },
      reports
    )

    const collections = await db.listCollections({}).toArray()
    expect(collections.length).toEqual(4)
    expect(collections.find((c: any) => c.name === 'dataset')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 't1')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 't2')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 'testReport')).toBeTruthy()

    const data = await db
      .collection('dataset')
      .find({})
      .toArray()
    expect(data.length).toEqual(2) // data should be unchanged in collection we read from
    const t1data = await db
      .collection('dataset')
      .find({})
      .toArray()
    expect(t1data.length).toEqual(2) // data should be unchanged in collection we read from
    const t2data = await db
      .collection('dataset')
      .find({})
      .toArray()
    expect(t2data.length).toEqual(2) // data should be unchanged in collection we read from
    const results = await db
      .collection('testReport')
      .find({})
      .toArray()
    expect(results.length).toEqual(2)
    expect(Object.keys(results[0])).toEqual(
      expect.arrayContaining(['_id', 'id', 't1age', 't2weight'])
    )
    expect(results[0].t1age).toEqual(1)
    expect(results[0].t2weight).toEqual(100)
    expect(Object.keys(results[1])).toEqual(
      expect.arrayContaining(['_id', 'id', 't1age', 't2weight'])
    )
    expect(results[1].t1age).toEqual(2)
    expect(results[1].t2weight).toEqual(200)
  })

  it.skip('should create a report with joined unwind collections and filtering applied', async () => {
    const reports = await loadReports({
      ...mongoConfig,
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

    await generateReports(
      {
        mongoUri: MONGO_URI,
        mongoDb: MONGO_DB
      },
      reports
    )

    const collections = await db.listCollections({}).toArray()
    expect(collections.length).toEqual(4)
    expect(collections.find((c: any) => c.name === 'dataset')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 't1')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 't2')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 'testReport')).toBeTruthy()

    const data = await db
      .collection('dataset')
      .find({})
      .toArray()
    expect(data.length).toEqual(2) // data should be unchanged in collection we read from
    const t1data = await db
      .collection('dataset')
      .find({})
      .toArray()
    expect(t1data.length).toEqual(2) // data should be unchanged in collection we read from
    const t2data = await db
      .collection('dataset')
      .find({})
      .toArray()
    expect(t2data.length).toEqual(2) // data should be unchanged in collection we read from
    const results = await db
      .collection('testReport')
      .find({})
      .toArray()
    expect(results.length).toEqual(2)
    expect(Object.keys(results[0])).toEqual(
      expect.arrayContaining(['_id', 'id', 't1age', 't2weight'])
    )
    expect(results[0].t1age).toEqual(1)
    expect(results[0].t2weight).toEqual(100)
    expect(Object.keys(results[1])).toEqual(
      expect.arrayContaining(['_id', 'id', 't1age', 't2weight'])
    )
    expect(results[1].t1age).toEqual(2)
    expect(results[1].t2weight).toEqual(200)
  })

  it('should create a report with joined collections not unwinded', async () => {
    const reports = await loadReports({
      ...mongoConfig,
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

    await generateReports(
      {
        mongoUri: MONGO_URI,
        mongoDb: MONGO_DB
      },
      reports
    )

    const collections = await db.listCollections({}).toArray()
    expect(collections.length).toEqual(4)
    expect(collections.find((c: any) => c.name === 'dataset')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 't1')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 't2')).toBeTruthy()
    expect(collections.find((c: any) => c.name === 'testReport')).toBeTruthy()

    const data = await db
      .collection('dataset')
      .find({})
      .toArray()
    expect(data.length).toEqual(2) // data should be unchanged in collection we read from
    const t1data = await db
      .collection('dataset')
      .find({})
      .toArray()
    expect(t1data.length).toEqual(2) // data should be unchanged in collection we read from
    const t2data = await db
      .collection('dataset')
      .find({})
      .toArray()
    expect(t2data.length).toEqual(2) // data should be unchanged in collection we read from
    const results = await db
      .collection('testReport')
      .find({})
      .toArray()
    expect(results.length).toEqual(2)
    expect(Object.keys(results[0])).toEqual(
      expect.arrayContaining(['_id', 'id', 'totalAge', 'totalWeight'])
    )
    expect(results[0].totalAge).toEqual(3)
    expect(results[0].totalWeight).toEqual(300)
    expect(Object.keys(results[1])).toEqual(
      expect.arrayContaining(['_id', 'id', 'totalAge', 'totalWeight'])
    )
    expect(results[1].totalAge).toEqual(30)
    expect(results[1].totalWeight).toEqual(3000)
  })

  it('should honor rentention policy', async () => {
    const reports = await loadReports({
      ...mongoConfig,
      reportDir: path.resolve('test/schemas/t10')
    })

    const TWELVEDAYS = 12 * 24 * 60 * 60 * 1000
    const now = new Date().getTime()
    await db.collection('dataset').insertMany([{ name: 'foo' }, { name: 'bar' }])

    await db.collection('testReport').insertMany([
      { name: 'baz', createdAt: new Date(now - TWELVEDAYS) },
      { name: 'ber', createdAt: new Date() }
    ])

    await generateReports(
      {
        mongoUri: MONGO_URI,
        mongoDb: MONGO_DB
      },
      reports
    )
    const collections = await db.listCollections({}).toArray()
    expect(collections.length).toEqual(2)

    const data = await db
      .collection('dataset')
      .find({})
      .toArray()
    expect(data.length).toEqual(2)
    const results = await db
      .collection('testReport')
      .find({})
      .toArray()
    expect(results.length).toEqual(3)
    expect(results.find((r: any) => r.name === 'baz')).toBeFalsy()
  })

  it('should handle full replace of materialized view', async () => {
    const reports = await loadReports({
      ...mongoConfig,
      reportDir: path.resolve('test/schemas/t11')
    })

    await db.collection('testReport').insertMany([{ name: 'acme' }, { name: 'omega' }])
    await db.collection('dataset').insertMany([{ name: 'foo' }, { name: 'bar' }])

    await generateReports(
      {
        mongoUri: MONGO_URI,
        mongoDb: MONGO_DB
      },
      reports
    )
    const collections = await db.listCollections({}).toArray()
    expect(collections.length).toEqual(2)
    const data = await db
      .collection('dataset')
      .find({})
      .toArray()
    expect(data.length).toEqual(2)
    const results = await db
      .collection('testReport')
      .find({})
      .toArray()
    expect(results.length).toEqual(2)
    expect(results.find((r: any) => r.name === 'acme')).toBeFalsy()
    expect(results.find((r: any) => r.name === 'omega')).toBeFalsy()
  })

  it('should handle partial update of materialized view', async () => {
    const reports = await loadReports({
      ...mongoConfig,
      reportDir: path.resolve('test/schemas/t12')
    })

    const now = new Date().getTime()
    const ONEDAYMS = 24 * 60 * 60 * 1000
    await db.collection('testReport').insertMany([
      { name: 'acme', createdAt: new Date(now - 2 * ONEDAYMS) },
      { name: 'omega', createdAt: new Date(now - 2 * ONEDAYMS) }
    ])
    await db.collection('dataset').insertMany([
      { name: 'foo', timestamp: new Date(now - 5 * ONEDAYMS) },
      { name: 'bar', timestamp: new Date(now - ONEDAYMS) }
    ])

    await generateReports(
      {
        mongoUri: MONGO_URI,
        mongoDb: MONGO_DB
      },
      reports
    )
    const collections = await db.listCollections({}).toArray()
    expect(collections.length).toEqual(2)
    const data = await db
      .collection('dataset')
      .find({})
      .toArray()
    expect(data.length).toEqual(2)
    const results = await db
      .collection('testReport')
      .find({})
      .toArray()
    expect(results.length).toEqual(3)
    expect(results.find((r: any) => r.name === 'foo')).toBeFalsy()
  })

  it('should correctly default to fallback values', async () => {
    const reports = await loadReports({
      ...mongoConfig,
      reportDir: path.resolve('test/schemas/t13')
    })

    await db.collection('dataset').insertMany([{ name: 'foo', age: 10 }, { name: 'bar' }])
    await generateReports(
      {
        mongoUri: MONGO_URI,
        mongoDb: MONGO_DB
      },
      reports
    )
    const collections = await db.listCollections({}).toArray()
    expect(collections.length).toEqual(2)
    const data = await db
      .collection('dataset')
      .find({})
      .toArray()
    expect(data.length).toEqual(2)
    const results = await db
      .collection('testReport')
      .find({})
      .toArray()
    expect(results.length).toEqual(2)
    expect(results.find((r: any) => r.name === 'bar' && r.age === 0)).toBeTruthy()
  })

  it('should correctly discard unmatched types', async () => {
    const reports = await loadReports({
      ...mongoConfig,
      reportDir: path.resolve('test/schemas/t14')
    })

    await db.collection('dataset').insertMany([
      { name: 'foo', age: 10 },
      { name: 'bar', age: '20' }
    ])
    await generateReports(
      {
        mongoUri: MONGO_URI,
        mongoDb: MONGO_DB
      },
      reports
    )
    const collections = await db.listCollections({}).toArray()
    expect(collections.length).toEqual(2)
    const data = await db
      .collection('dataset')
      .find({})
      .toArray()
    expect(data.length).toEqual(2)
    const results = await db
      .collection('testReport')
      .find({})
      .toArray()
    expect(results.length).toEqual(1)
    expect(results.find((r: any) => r.name === 'bar')).toBeFalsy()
  })
})
