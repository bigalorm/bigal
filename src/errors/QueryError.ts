import type { Entity } from '../Entity';
import type { ModelMetadata } from '../metadata';
import type { WhereQuery } from '../query';

export class QueryError<T extends Entity> extends Error {
  public model: ModelMetadata<T>;

  public where: WhereQuery<T> | undefined;

  public constructor(message: string, model: ModelMetadata<T>, where?: WhereQuery<T>) {
    super(message);

    this.model = model;
    this.where = where;

    Object.setPrototypeOf(this, QueryError.prototype);
  }
}
