import { BaseAttribute } from './BaseAttribute';

export interface CollectionAttribute extends BaseAttribute {
  collection: string;
  through?: string;
  via: string;
}
