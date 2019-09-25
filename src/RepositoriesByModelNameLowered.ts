import { ReadonlyRepository } from './ReadonlyRepository';
import { Entity } from './Entity';

export interface RepositoriesByModelNameLowered { [index: string]: ReadonlyRepository<Entity> }
