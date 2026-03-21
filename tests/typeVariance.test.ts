import { describe, it } from 'vitest';

import type { Entity, IReadonlyRepository, IRepository, WhereQuery } from '../src/index.js';

import type { ProductSelect } from './models/index.js';
import type { SimpleWithJsonSelect } from './models/index.js';

type ModelBase = Entity & { id: number };

// Compile-time assignability checks - a type error means variance is broken
function acceptWhereQuery(_where: WhereQuery<ModelBase>): void {}
function acceptReadonlyRepository(_repo: IReadonlyRepository<ModelBase>): void {}
function acceptRepository(_repo: IRepository<ModelBase>): void {}

describe('Type variance', () => {
  it('should allow WhereQuery<SpecificModel> where WhereQuery<BaseModel> is expected', () => {
    const where: WhereQuery<ProductSelect & Entity> = { name: 'test' };
    acceptWhereQuery(where);
  });

  it('should allow WhereQuery<ModelWithJsonColumn> where WhereQuery<BaseModel> is expected', () => {
    const where: WhereQuery<SimpleWithJsonSelect & Entity> = { name: 'test' };
    acceptWhereQuery(where);
  });

  it('should allow IReadonlyRepository<SpecificModel> where IReadonlyRepository<BaseModel> is expected', () => {
    const repo = {} as IReadonlyRepository<ProductSelect & Entity>;
    acceptReadonlyRepository(repo);
  });

  it('should allow IReadonlyRepository<ModelWithJsonColumn> where IReadonlyRepository<BaseModel> is expected', () => {
    const repo = {} as IReadonlyRepository<SimpleWithJsonSelect & Entity>;
    acceptReadonlyRepository(repo);
  });

  it('should allow IRepository<SpecificModel> where IRepository<BaseModel> is expected', () => {
    const repo = {} as IRepository<ProductSelect & Entity>;
    acceptRepository(repo);
  });

  it('should allow IRepository<ModelWithJsonColumn> where IRepository<BaseModel> is expected', () => {
    const repo = {} as IRepository<SimpleWithJsonSelect & Entity>;
    acceptRepository(repo);
  });
});
