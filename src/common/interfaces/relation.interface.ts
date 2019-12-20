export interface Relation {
  collection: string
  localField: string
  foreignField: string
  filter?: string
  unwind?: boolean
}
