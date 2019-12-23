import { FieldRestrictions } from './field-restrictions.interface'

export interface Field {
  name: string
  value: string
  description?: string
  default?: any
  restrictions: FieldRestrictions
  type?: string
}
