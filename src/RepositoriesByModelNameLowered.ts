import { Entity } from './Entity';
import { ReadonlyRepository } from './ReadonlyRepository';
import { Repository } from './Repository';

export interface RepositoriesByModelNameLowered { [index: string]: ReadonlyRepository<Entity> | Repository<Entity>; }
