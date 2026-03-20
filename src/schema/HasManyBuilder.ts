import type { LazyTableReference } from './BelongsToBuilder.js';

export interface HasManyConfig {
  brand: 'hasMany';
}

export interface HasManyThroughIntermediate {
  throughFn: LazyTableReference;
  via(propertyName: string): HasManyBuilder;
}

export class HasManyBuilder {
  declare public readonly _: HasManyConfig;

  public readonly modelFn: LazyTableReference;

  public viaPropertyName: string | undefined;

  public throughFn: LazyTableReference | undefined;

  public constructor(modelFn: LazyTableReference) {
    this.modelFn = modelFn;
  }

  public via(propertyName: string): HasManyBuilder {
    this.viaPropertyName = propertyName;
    return this;
  }

  public through(throughModelFn: LazyTableReference): HasManyThroughIntermediate {
    this.throughFn = throughModelFn;
    return {
      throughFn: throughModelFn,
      via: (propertyName: string): HasManyBuilder => {
        this.viaPropertyName = propertyName;
        return this;
      },
    };
  }
}

export function hasMany(modelFn: LazyTableReference): HasManyBuilder {
  return new HasManyBuilder(modelFn);
}
