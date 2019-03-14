import { CollectionAttribute } from './CollectionAttribute';
import { ModelAttribute } from './ModelAttribute';
import { TypeAttribute } from './TypeAttribute';

type AnyFunction = () => any;

export interface Attributes {
  [index: string]: CollectionAttribute | ModelAttribute | TypeAttribute | AnyFunction;
}
