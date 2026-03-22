import type { ModelReference } from './BelongsToBuilder.js';

export interface HasManyConfig {
  brand: 'hasMany';
}

export interface HasManyThroughIntermediate {
  via(propertyName: string): HasManyBuilder;
}

export class HasManyBuilder {
  declare public readonly _: HasManyConfig;

  public readonly modelRef: ModelReference;

  public viaPropertyName: string | undefined;

  public throughRef: ModelReference | undefined;

  public constructor(modelRef: ModelReference) {
    this.modelRef = modelRef;
  }

  public via(propertyName: string): HasManyBuilder {
    this.viaPropertyName = propertyName;
    return this;
  }

  public through(throughRef: ModelReference): HasManyThroughIntermediate {
    this.throughRef = throughRef;
    return {
      via: (propertyName: string): HasManyBuilder => {
        this.viaPropertyName = propertyName;
        return this;
      },
    };
  }
}

/**
 * Defines a one-to-many or many-to-many (hasMany) relationship.
 *
 * @param {string | Function} modelRef - Model name string or arrow function returning a TableDefinition
 */
export function hasMany(modelRef: ModelReference): HasManyBuilder {
  return new HasManyBuilder(modelRef);
}
