import { Model } from './Model';

export interface ModelClassesByGlobalId {
  [index: string]: Model<object>;
}
