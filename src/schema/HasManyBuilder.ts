export interface HasManyConfig<TModelName extends string = string> {
  brand: 'hasMany';
  modelName: TModelName;
}

export interface HasManyThroughIntermediate<TModelName extends string = string> {
  via(propertyName: string): HasManyBuilder<TModelName>;
}

export class HasManyBuilder<TModelName extends string = string> {
  declare public readonly _: HasManyConfig<TModelName>;

  public readonly modelRef: string;

  public viaPropertyName: string | undefined;

  public throughRef: string | undefined;

  public constructor(modelRef: string) {
    this.modelRef = modelRef;
  }

  public via(propertyName: string): HasManyBuilder<TModelName> {
    this.viaPropertyName = propertyName;
    return this;
  }

  public through(throughRef: string): HasManyThroughIntermediate<TModelName> {
    this.throughRef = throughRef;
    return {
      via: (propertyName: string): HasManyBuilder<TModelName> => {
        this.viaPropertyName = propertyName;
        return this;
      },
    };
  }
}

/**
 * Defines a one-to-many or many-to-many (hasMany) relationship.
 *
 * @param {string} modelRef - Model name string (resolved at initialize() time)
 */
export function hasMany<TModelName extends string = string>(modelRef: TModelName): HasManyBuilder<TModelName> {
  return new HasManyBuilder<TModelName>(modelRef);
}
