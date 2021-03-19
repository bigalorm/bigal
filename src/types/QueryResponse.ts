import type { Entity } from '../Entity';

import type { ExcludeEntityCollections } from './ExcludeEntityCollections';
import type { OmitSubclassOfType } from './OmitSubclassOfType';

/**
 * Changes all properties with Entity values to Primitive (string|number). Removes any properties that with values
 * of Entity arrays
 */
export type QueryResponse<T extends Entity> = Pick<T, 'id'> &
  {
    [K in keyof T as ExcludeEntityCollections<T[K], K>]: OmitSubclassOfType<T[K], Entity>;
  };
