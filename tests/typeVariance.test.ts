import { describe, it } from 'vitest';

import type { IReadonlyRepository, IRepository, WhereQuery } from '../src/index.js';

import type { ProductSelect, SimpleWithJsonSelect } from './utils/testModels.js';

type ModelBase = Record<string, unknown> & { id: number };

// Compile-time assignability checks - a type error means variance is broken
function acceptWhereQuery(_where: WhereQuery<ModelBase>): void {}
function acceptReadonlyRepository(_repo: IReadonlyRepository<ModelBase>): void {}
function acceptRepository(_repo: IRepository<ModelBase>): void {}

describe('Type variance', () => {
  it('should allow WhereQuery<SpecificModel> where WhereQuery<BaseModel> is expected', () => {
    const where: WhereQuery<ProductSelect> = { name: 'test' };
    acceptWhereQuery(where);
  });

  it('should allow WhereQuery<ModelWithJsonColumn> where WhereQuery<BaseModel> is expected', () => {
    const where: WhereQuery<SimpleWithJsonSelect> = { name: 'test' };
    acceptWhereQuery(where);
  });

  it('should allow IReadonlyRepository<SpecificModel> where IReadonlyRepository<BaseModel> is expected', () => {
    const repo = {} as IReadonlyRepository<ProductSelect>;
    acceptReadonlyRepository(repo);
  });

  it('should allow IReadonlyRepository<ModelWithJsonColumn> where IReadonlyRepository<BaseModel> is expected', () => {
    const repo = {} as IReadonlyRepository<SimpleWithJsonSelect>;
    acceptReadonlyRepository(repo);
  });

  it('should allow IRepository<SpecificModel> where IRepository<BaseModel> is expected', () => {
    const repo = {} as IRepository<ProductSelect>;
    acceptRepository(repo);
  });

  it('should allow IRepository<ModelWithJsonColumn> where IRepository<BaseModel> is expected', () => {
    const repo = {} as IRepository<SimpleWithJsonSelect>;
    acceptRepository(repo);
  });
});
