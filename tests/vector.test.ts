import assert from 'node:assert';

import { beforeAll, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { type ColumnTypeMetadata, initialize, type PoolLike, type PoolQueryResult, type QueryResultRow, type Repository } from '../src/index.js';
import { type VectorDistanceConstraint, type VectorDistanceMetric } from '../src/query/index.js';

import { Document, DocumentNote, type KitchenSink, SimpleWithJson } from './models/index.js';

type PoolQueryFn = (text: string, values?: readonly unknown[]) => Promise<PoolQueryResult<QueryResultRow>>;

function createMockPool() {
  const pool = { query: vi.fn<PoolQueryFn>() };
  return pool as PoolLike & typeof pool;
}

function getQueryResult<T extends QueryResultRow>(rows: T[] = []): PoolQueryResult<T> & { command: string; oid: number; fields: never[] } {
  return {
    command: 'select',
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}

// Compile-time checks. This function is never invoked at runtime, but tsgo still type-checks the body
function _vectorTypeChecks(documentRepository: Repository<Document>, kitchenSinkRepository: Repository<KitchenSink>): void {
  void documentRepository.find().where({ embedding: { nearestTo: [1, 2, 3], metric: 'cosine', distance: { '<': 0.5 } } });
  // @ts-expect-error - a vector where constraint requires at least one distance bound
  void documentRepository.find().where({ embedding: { nearestTo: [1, 2, 3] } });
  void documentRepository.find().where({ embedding: [1, 2, 3] });
  void documentRepository.find().sort({ embedding: { nearestTo: [1, 2, 3], metric: 'l2' } });
  void documentRepository.find().sort({ title: 'asc' });
  // @ts-expect-error - nearestTo is not allowed on string[] properties
  void kitchenSinkRepository.find().where({ stringArrayColumn: { nearestTo: [1, 2, 3] } });
}

describe('pgvector support', () => {
  const mockedPool = createMockPool();

  let DocumentRepository: Repository<Document>;
  let DocumentNoteRepository: Repository<DocumentNote>;
  let SimpleWithJsonRepository: Repository<SimpleWithJson>;

  beforeAll(() => {
    const repositoriesByModelName = initialize({
      models: [Document, DocumentNote, SimpleWithJson],
      pool: mockedPool,
    });

    DocumentRepository = repositoriesByModelName.Document as Repository<Document>;
    DocumentNoteRepository = repositoriesByModelName.DocumentNote as Repository<DocumentNote>;
    SimpleWithJsonRepository = repositoriesByModelName.SimpleWithJson as Repository<SimpleWithJson>;
  });

  beforeEach(() => {
    mockedPool.query.mockReset();
  });

  describe('vector column definition', () => {
    it('should include embedding column with vector type and dimensions in model metadata', () => {
      const embeddingColumn = DocumentRepository.model.columnsByPropertyName.embedding as ColumnTypeMetadata;
      assert(embeddingColumn);
      expect(embeddingColumn.name).toBe('embedding');
      expect(embeddingColumn.type).toBe('vector');
      expect(embeddingColumn.dimensions).toBe(3);
    });

    it('should compile vector where and sort constraints', () => {
      // The actual type assertions live in `_vectorTypeChecks` above. tsgo verifies them at compile time
      expectTypeOf(_vectorTypeChecks).toBeFunction();
    });
  });

  describe('sort by vector distance', () => {
    it('should generate ORDER BY with L2 distance operator', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));
      const queryVector = [1, 2, 3];

      await DocumentRepository.find()
        .sort({ embedding: { nearestTo: queryVector, metric: 'l2' } })
        .limit(5);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <-> $');
      expect(query).toContain('ORDER BY');
      expect(query).toContain('LIMIT 5');
      expect(params).toContain('[1,2,3]');
    });

    it('should generate ORDER BY with cosine distance operator', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find()
        .sort({ embedding: { nearestTo: [0.1, 0.2, 0.3], metric: 'cosine' } })
        .limit(5);

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <=> $');
    });

    it('should generate ORDER BY with inner product operator', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find()
        .sort({ embedding: { nearestTo: [1, 2, 3], metric: 'innerProduct' } })
        .limit(5);

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <#> $');
    });

    it('should generate ORDER BY with L1 distance operator', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find()
        .sort({ embedding: { nearestTo: [1, 2, 3], metric: 'l1' } })
        .limit(5);

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <+> $');
    });

    it('should default metric to cosine when not specified', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find()
        .sort({ embedding: { nearestTo: [1, 2, 3] } })
        .limit(5);

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <=> $');
    });

    it('should combine vector sort with regular where clause', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find()
        .where({ title: 'test' })
        .sort({ embedding: { nearestTo: [1, 2, 3], metric: 'cosine' } })
        .limit(10);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('SELECT "id","title","embedding" FROM "documents" WHERE "title"=$1 ORDER BY "embedding" <=> $2 LIMIT 10');
      expect(params).toStrictEqual(['test', '[1,2,3]']);
    });

    it('should combine vector sort with regular column sort', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find()
        .sort('title asc')
        .sort({ embedding: { nearestTo: [1, 2, 3], metric: 'l2' } })
        .limit(5);

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('ORDER BY "title","embedding" <-> $1');
    });

    it('should reject an invalid metric instead of defaulting to cosine', async () => {
      await expect(
        DocumentRepository.find()
          .sort({ embedding: { nearestTo: [1, 2, 3], metric: 'bogus' as VectorDistanceMetric } })
          .limit(5),
      ).rejects.toThrow('Invalid vector distance metric: bogus. Must be one of: cosine, innerProduct, l1, l2');
    });
  });

  describe('where clause with vector distance', () => {
    it('should generate WHERE with distance threshold', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find().where({
        embedding: { nearestTo: [1, 2, 3], metric: 'cosine', distance: { '<': 0.5 } },
      });

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <=> $1 < $2');
      expect(params).toStrictEqual(['[1,2,3]', 0.5]);
    });

    it('should support <= distance threshold', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find().where({
        embedding: { nearestTo: [1, 2, 3], metric: 'l2', distance: { '<=': 1.0 } },
      });

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <-> $1 <= $2');
      assert(params);
      expect(params).toContain(1.0);
    });

    it('should combine distance filter with other where conditions', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find().where({
        title: { contains: 'biology' },
        embedding: { nearestTo: [1, 2, 3], metric: 'cosine', distance: { '<': 0.5 } },
      });

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"title"');
      expect(query).toContain('"embedding" <=> $');
    });

    it('should combine distance filter with sort by distance', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));
      const queryVector = [0.1, 0.2, 0.3];

      await DocumentRepository.find()
        .where({ embedding: { nearestTo: queryVector, metric: 'cosine', distance: { '<': 0.5 } } })
        .sort({ embedding: { nearestTo: queryVector, metric: 'cosine' } })
        .limit(10);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('WHERE "embedding" <=> $1 < $2');
      expect(query).toContain('ORDER BY "embedding" <=> $3');
      expect(params).toStrictEqual(['[0.1,0.2,0.3]', 0.5, '[0.1,0.2,0.3]']);
    });

    it('should reject a malicious distance operator', async () => {
      const maliciousDistance = { '< $2 OR 1=1 --': 0.5 } as unknown as VectorDistanceConstraint['distance'];

      await expect(
        DocumentRepository.find().where({
          embedding: { nearestTo: [1, 2, 3], metric: 'cosine', distance: maliciousDistance },
        }),
      ).rejects.toThrow('Invalid vector distance operator: < $2 OR 1=1 --');
    });

    it('should reject an invalid metric in a where constraint', async () => {
      await expect(
        DocumentRepository.find().where({
          embedding: { nearestTo: [1, 2, 3], metric: 'bogus' as VectorDistanceMetric, distance: { '<': 0.5 } },
        }),
      ).rejects.toThrow('Invalid vector distance metric: bogus. Must be one of: cosine, innerProduct, l1, l2');
    });

    it('should not treat a literal nearestTo key on a json column as a vector distance constraint', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await SimpleWithJsonRepository.find().where({
        bar: { nearestTo: [1, 2, 3] },
      });

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain(`"bar"->>'nearestTo'`);
      expect(query).not.toContain('<=>');
    });
  });

  describe('vector equality', () => {
    it('should generate = with a serialized vector param instead of =ANY()', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find().where({ embedding: [1, 2, 3] });

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('WHERE "embedding"=$1');
      expect(query).not.toContain('=ANY');
      expect(params).toStrictEqual(['[1,2,3]']);
    });

    it('should generate <> for negated vector equality', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find().where({ embedding: { '!': [1, 2, 3] } });

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('WHERE "embedding"<>$1');
      expect(params).toStrictEqual(['[1,2,3]']);
    });
  });

  describe('findOne with vector', () => {
    it('should work with sort by distance and limit 1', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, title: 'Nearest', embedding: '[1,2,3]' }]));

      const result = await DocumentRepository.findOne().sort({ embedding: { nearestTo: [1, 2, 3], metric: 'cosine' } });

      assert(result);
      expect(result.title).toBe('Nearest');
      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('ORDER BY');
      expect(query).toContain('"embedding" <=> $');
      expect(query).toContain('LIMIT 1');
    });
  });

  describe('create() with vector values', () => {
    it('should serialize the vector as pgvector text format instead of a postgres array', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, title: 'foo', embedding: '[0.1,0.2,0.3]' }]));

      const result = await DocumentRepository.create({
        title: 'foo',
        embedding: [0.1, 0.2, 0.3],
      });

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('INSERT INTO "documents" ("title","embedding") VALUES ($1,$2) RETURNING "id","title","embedding"');
      expect(params).toStrictEqual(['foo', '[0.1,0.2,0.3]']);
      expect(result.embedding).toStrictEqual([0.1, 0.2, 0.3]);
    });

    it('should reject non-finite vector values', async () => {
      await expect(
        DocumentRepository.create({
          title: 'foo',
          embedding: [1, Number.NaN, 3],
        }),
      ).rejects.toThrow('"embedding" vector value must be a non-empty array of finite numbers');
    });
  });

  describe('update() with vector values', () => {
    it('should serialize the vector as pgvector text format instead of a postgres array', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, title: 'foo', embedding: '[4,5,6]' }]));

      await DocumentRepository.update(
        { id: 1 },
        {
          embedding: [4, 5, 6],
        },
      );

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toBe('UPDATE "documents" SET "embedding"=$1 WHERE "id"=$2 RETURNING "id","title","embedding"');
      expect(params).toStrictEqual(['[4,5,6]', 1]);
    });
  });

  describe('read parsing', () => {
    it('should parse vector text values from the database into number arrays', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, title: 'foo', embedding: '[1,2.5,-3]' }]));

      const results = await DocumentRepository.find();

      expect(results).toHaveLength(1);
      expect(results[0]!.embedding).toStrictEqual([1, 2.5, -3]);
    });

    it('should parse vector text values when returning plain objects', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, title: 'foo', embedding: '[1,2,3]' }]));

      const results = await DocumentRepository.find().toJSON();

      expect(results).toHaveLength(1);
      expect(results[0]!.embedding).toStrictEqual([1, 2, 3]);
    });

    it('should leave null vector values untouched', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, title: 'foo', embedding: null }]));

      const results = await DocumentRepository.find();

      expect(results).toHaveLength(1);
      expect(results[0]!.embedding).toBeNull();
    });

    it('should leave vector values that are already arrays untouched', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, title: 'foo', embedding: [1, 2, 3] }]));

      const results = await DocumentRepository.find();

      expect(results).toHaveLength(1);
      expect(results[0]!.embedding).toStrictEqual([1, 2, 3]);
    });
  });

  describe('edge cases', () => {
    it('should reject an empty vector (pgvector requires at least 1 dimension)', async () => {
      await expect(
        DocumentRepository.find()
          .sort({ embedding: { nearestTo: [], metric: 'cosine' } })
          .limit(5),
      ).rejects.toThrow('"embedding" nearestTo must be a non-empty array of finite numbers');
    });

    it('should handle high-dimensional vectors', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      const largeVector = Array.from({ length: 1536 }, () => Math.random());
      await DocumentRepository.find()
        .sort({ embedding: { nearestTo: largeVector, metric: 'cosine' } })
        .limit(5);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <=> $');
      assert(params);
      const vectorParam = params.find((param) => typeof param === 'string' && param.startsWith('['));
      expect(vectorParam).toBeDefined();
    });

    it('should handle negative vector values', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find()
        .sort({ embedding: { nearestTo: [-1, -0.5, 0.3], metric: 'l2' } })
        .limit(5);

      const [, params] = mockedPool.query.mock.calls[0]!;
      expect(params).toContain('[-1,-0.5,0.3]');
    });

    it('should handle single-element vector', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find()
        .sort({ embedding: { nearestTo: [1.0], metric: 'l2' } })
        .limit(5);

      const [, params] = mockedPool.query.mock.calls[0]!;
      expect(params).toContain('[1]');
    });

    it('should handle scientific notation in vector values', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find()
        .sort({ embedding: { nearestTo: [1e-10, 2e10, 3], metric: 'cosine' } })
        .limit(5);

      const [, params] = mockedPool.query.mock.calls[0]!;
      expect(params).toContain('[1e-10,20000000000,3]');
    });

    it('should reject NaN in vector array', async () => {
      await expect(
        DocumentRepository.find()
          .sort({ embedding: { nearestTo: [1, Number.NaN, 3], metric: 'l2' } })
          .limit(5),
      ).rejects.toThrow('nearestTo must be a non-empty array of finite numbers');
    });

    it('should reject Infinity in vector array', async () => {
      await expect(
        DocumentRepository.find()
          .sort({ embedding: { nearestTo: [1, Number.POSITIVE_INFINITY, 3], metric: 'l2' } })
          .limit(5),
      ).rejects.toThrow('nearestTo must be a non-empty array of finite numbers');
    });

    it('should handle float precision in vector values', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find()
        .sort({ embedding: { nearestTo: [1.23456789, 2.34567891, 3.45678912], metric: 'cosine' } })
        .limit(5);

      const [, params] = mockedPool.query.mock.calls[0]!;
      const vectorParam = params?.find((param) => typeof param === 'string' && param.startsWith('['));
      expect(vectorParam).toContain('1.23456789');
    });
  });
  describe('constraint validation and joined-model support', () => {
    it('should combine multiple distance bounds with AND', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find().where({
        embedding: { nearestTo: [1, 2, 3], distance: { '>': 0.1, '<': 0.5 } },
      });

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <=> $1 > $2 AND "embedding" <=> $1 < $3');
      expect(params).toStrictEqual(['[1,2,3]', 0.1, 0.5]);
    });

    it('should reject a where vector constraint without a distance bound', async () => {
      await expect(
        DocumentRepository.find().where({
          embedding: { nearestTo: [1, 2, 3] } as never,
        }),
      ).rejects.toThrow('"embedding" vector distance constraint requires at least one distance bound');
    });

    it('should reject a negated vector distance constraint', async () => {
      await expect(
        DocumentRepository.find().where({
          embedding: { '!': { nearestTo: [1, 2, 3], distance: { '<': 0.5 } } } as never,
        }),
      ).rejects.toThrow('Negation is not supported for vector distance constraints on "embedding"');
    });

    it('should reject a non-finite distance threshold', async () => {
      await expect(
        DocumentRepository.find().where({
          embedding: { nearestTo: [1, 2, 3], distance: { '<': undefined } } as never,
        }),
      ).rejects.toThrow('"embedding" distance threshold must be a finite number');
    });

    it('should reject sorting a non-vector column by distance', async () => {
      await expect(
        DocumentRepository.find().sort({
          title: { nearestTo: [1, 2, 3] },
        } as never),
      ).rejects.toThrow('"title" is not a vector column and cannot be sorted by distance');
    });

    it('should reject nearestTo on a non-vector, non-json column', async () => {
      await expect(
        DocumentRepository.find().where({
          title: { nearestTo: [1, 2, 3] },
        } as never),
      ).rejects.toThrow('"title" is not a vector column');
    });

    it('should match any of multiple vectors with OR equality', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepository.find().where({
        embedding: [
          [1, 2, 3],
          [4, 5, 6],
        ] as never,
      });

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('("embedding"=$1 OR "embedding"=$2)');
      expect(params).toStrictEqual(['[1,2,3]', '[4,5,6]']);
    });

    it('should apply vector distance constraints to joined models using a nested alias', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentNoteRepository.find()
        .join('document')
        .where({
          document: {
            embedding: { nearestTo: [1, 2, 3], distance: { '<': 0.5 } },
          },
        } as never);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"document"."embedding" <=> $1 < $2');
      expect(params).toStrictEqual(['[1,2,3]', 0.5]);
    });

    it('should apply vector distance constraints to joined models using dot notation', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentNoteRepository.find()
        .join('document')
        .where({
          'document.embedding': { nearestTo: [1, 2, 3], distance: { '<': 0.5 } },
        } as never);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"document"."embedding" <=> $1 < $2');
      expect(params).toStrictEqual(['[1,2,3]', 0.5]);
    });

    it('should serialize vector equality on joined models using a nested alias', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentNoteRepository.find()
        .join('document')
        .where({
          document: {
            embedding: [1, 2, 3],
          },
        } as never);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"document"."embedding"=$1');
      expect(params).toStrictEqual(['[1,2,3]']);
    });

    it('should leave malformed vector strings unparsed when reading', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, title: 'foo', embedding: '[1,,3]' }]));

      const results = await DocumentRepository.find();

      expect(results[0]!.embedding).toStrictEqual('[1,,3]');
    });
  });
});
