import type { Entity } from '../Entity.js';
import type { ModelMetadata } from '../metadata/index.js';

export type JoinType = 'inner' | 'left';

export interface JoinDefinition<T extends Entity = Entity> {
  propertyName: string;
  alias: string;
  type: JoinType;
  relatedModel?: ModelMetadata<T>;
  foreignKeyColumn?: string;
  relatedPrimaryKey?: string;
}
