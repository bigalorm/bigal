import { describe, it } from 'vitest';

import type { IReadonlyRepository, IRepository, WhereQuery } from '../src/index.js';

import type { ModelBase } from './models/ModelBase.js';
import type { Product } from './models/Product.js';
import type { SimpleWithJson } from './models/SimpleWithJson.js';

// Compile-time assignability checks - a type error means variance is broken
function acceptWhereQuery(_where: WhereQuery<ModelBase>): void {}
function acceptReadonlyRepository(_repo: IReadonlyRepository<ModelBase>): void {}
function acceptRepository(_repo: IRepository<ModelBase>): void {}

describe('Type variance', () => {
  it('should allow WhereQuery<SpecificModel> where WhereQuery<BaseModel> is expected', () => {
    const where: WhereQuery<Product> = { name: 'test' };
    acceptWhereQuery(where);
  });

  it('should allow WhereQuery<ModelWithJsonColumn> where WhereQuery<BaseModel> is expected', () => {
    const where: WhereQuery<SimpleWithJson> = { name: 'test' };
    acceptWhereQuery(where);
  });

  it('should allow IReadonlyRepository<SpecificModel> where IReadonlyRepository<BaseModel> is expected', () => {
    const repo = {} as IReadonlyRepository<Product>;
    acceptReadonlyRepository(repo);
  });

  it('should allow IReadonlyRepository<ModelWithJsonColumn> where IReadonlyRepository<BaseModel> is expected', () => {
    const repo = {} as IReadonlyRepository<SimpleWithJson>;
    acceptReadonlyRepository(repo);
  });

  it('should allow IRepository<SpecificModel> where IRepository<BaseModel> is expected', () => {
    const repo = {} as IRepository<Product>;
    acceptRepository(repo);
  });

  it('should allow IRepository<ModelWithJsonColumn> where IRepository<BaseModel> is expected', () => {
    const repo = {} as IRepository<SimpleWithJson>;
    acceptRepository(repo);
  });
});
