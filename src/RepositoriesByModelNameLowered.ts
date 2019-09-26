import { Entity } from './Entity';
// eslint-disable-next-line import/no-cycle
import { ReadonlyRepository } from './ReadonlyRepository';
// eslint-disable-next-line import/no-cycle
import { Repository } from './Repository';

export interface RepositoriesByModelNameLowered { [index: string]: ReadonlyRepository<Entity> | Repository<Entity> }
