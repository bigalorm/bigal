import type { Entity } from '../Entity.js';
import type { ModelMetadata } from '../metadata/index.js';
import type { WhereQuery } from '../query/index.js';

export class QueryError<T extends Entity> extends Error {
  public model: ModelMetadata<T>;

  public where: WhereQuery<T> | undefined;

  public constructor(message: string, model: ModelMetadata<T>, where?: WhereQuery<T>) {
    super(message);

    this.name = 'QueryError';
    this.model = model;
    this.where = where;

    Object.setPrototypeOf(this, QueryError.prototype);
  }
}
