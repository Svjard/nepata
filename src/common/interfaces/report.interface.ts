import { DatasetType } from '../enums/dataset-type.enum'
import { Relation } from './relation.interface'
import { Field } from './field.interface'

export interface Report {
  name: string
  collection: string
  dataset?: {
    type: DatasetType,
    field?: string
  },
  rentention?: {
    days?: number
    field: string
  },
  relations?: Array<Relation>,
  fields: Array<Field>
}
