import { type Entity } from './Entity.js';
import { type IRepositoryOptions } from './ReadonlyRepository.js';

const repositoryOptionsByInstance = new WeakMap<object, IRepositoryOptions<Entity>>();

export function getRepositoryOptions(repository: object): IRepositoryOptions<Entity> | undefined {
  return repositoryOptionsByInstance.get(repository);
}

export function registerRepositoryOptions<T extends Entity>(repository: object, options: IRepositoryOptions<T>): void {
  repositoryOptionsByInstance.set(repository, options);
}
