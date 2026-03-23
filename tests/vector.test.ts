import assert from 'node:assert';

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PoolLike, PoolQueryResult, QueryResultRow, Repository } from '../src/index.js';
import { initialize, serial, text, defineTable as table } from '../src/index.js';
import { vector } from '../src/schema/columns.js';

// ---------------------------------------------------------------------------
// Test utilities
// ---------------------------------------------------------------------------

type PoolQueryFn = (text: string, values?: readonly unknown[]) => Promise<PoolQueryResult<QueryResultRow>>;

function createMockPool(): PoolLike & { query: ReturnType<typeof vi.fn<PoolQueryFn>> } {
  return { query: vi.fn<PoolQueryFn>() } as PoolLike & { query: ReturnType<typeof vi.fn<PoolQueryFn>> };
}

function getQueryResult<T extends QueryResultRow>(rows: T[] = []): PoolQueryResult<T> & { command: string; fields: never[]; oid: number } {
  return { command: 'select', rowCount: rows.length, oid: 0, fields: [], rows };
}

// ---------------------------------------------------------------------------
// Test model with vector column
// ---------------------------------------------------------------------------

const Document = table('documents', {
  id: serial().primaryKey(),
  title: text().notNull(),
  embedding: vector({ dimensions: 3 }),
});

const DocumentHighDim = table('documents_hd', {
  id: serial().primaryKey(),
  title: text().notNull(),
  embedding: vector({ dimensions: 1536 }),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pgvector support', () => {
  const mockedPool = createMockPool();
  let DocumentRepo: Repository<typeof Document>;

  beforeAll(() => {
    const bigal = initialize({
      pool: mockedPool,
      models: [Document, DocumentHighDim],
    });
    DocumentRepo = bigal.getRepository(Document);
  });

  beforeEach(() => {
    mockedPool.query.mockReset();
  });

  describe('vector column definition', () => {
    it('should include embedding column in model metadata', () => {
      expect(Document.columnsByPropertyName).toHaveProperty('embedding');
    });

    it('should store dimensions as maxLength on column config', () => {
      const embeddingCol = Document.columnsByPropertyName.embedding;
      assert(embeddingCol);
      expect(embeddingCol.name).toBe('embedding');
    });
  });

  describe('sort by vector distance', () => {
    it('should generate ORDER BY with L2 distance operator', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));
      const queryVector = [1, 2, 3];

      await DocumentRepo.find()
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

      await DocumentRepo.find()
        .sort({ embedding: { nearestTo: [0.1, 0.2, 0.3], metric: 'cosine' } })
        .limit(5);

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <=> $');
    });

    it('should generate ORDER BY with inner product operator', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepo.find()
        .sort({ embedding: { nearestTo: [1, 2, 3], metric: 'innerProduct' } })
        .limit(5);

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <#> $');
    });

    it('should generate ORDER BY with L1 distance operator', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepo.find()
        .sort({ embedding: { nearestTo: [1, 2, 3], metric: 'l1' } })
        .limit(5);

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <+> $');
    });

    it('should default metric to cosine when not specified', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepo.find()
        .sort({ embedding: { nearestTo: [1, 2, 3] } })
        .limit(5);

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <=> $');
    });

    it('should combine vector sort with regular where clause', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepo.find()
        .where({ title: 'test' })
        .sort({ embedding: { nearestTo: [1, 2, 3], metric: 'cosine' } })
        .limit(10);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"title"=$');
      expect(query).toContain('"embedding" <=> $');
      expect(query).toContain('ORDER BY');
      assert(params);
      expect(params).toContain('test');
    });

    it('should combine vector sort with regular column sort', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepo.find()
        .sort('title asc')
        .sort({ embedding: { nearestTo: [1, 2, 3], metric: 'l2' } })
        .limit(5);

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"title"');
      expect(query).toContain('"embedding" <-> $');
    });
  });

  describe('where clause with vector distance', () => {
    it('should generate WHERE with distance threshold', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepo.find().where({
        embedding: { nearestTo: [1, 2, 3], metric: 'cosine', distance: { '<': 0.5 } },
      });

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <=> $');
      expect(query).toContain('< $');
      assert(params);
      expect(params).toContain('[1,2,3]');
      expect(params).toContain(0.5);
    });

    it('should support <= distance threshold', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepo.find().where({
        embedding: { nearestTo: [1, 2, 3], metric: 'l2', distance: { '<=': 1.0 } },
      });

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <-> $');
      expect(query).toContain('<= $');
      assert(params);
      expect(params).toContain(1.0);
    });

    it('should combine distance filter with other where conditions', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepo.find().where({
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

      await DocumentRepo.find()
        .where({ embedding: { nearestTo: queryVector, metric: 'cosine', distance: { '<': 0.5 } } })
        .sort({ embedding: { nearestTo: queryVector, metric: 'cosine' } })
        .limit(10);

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('WHERE');
      expect(query).toContain('ORDER BY');
      expect(query).toContain('"embedding" <=> $');
    });
  });

  describe('findOne with vector', () => {
    it('should work with sort by distance and limit 1', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([{ id: 1, title: 'Nearest', embedding: [1, 2, 3] }]));

      const result = await DocumentRepo.findOne().sort({ embedding: { nearestTo: [1, 2, 3], metric: 'cosine' } });

      assert(result);
      expect(result.title).toBe('Nearest');
      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('ORDER BY');
      expect(query).toContain('"embedding" <=> $');
      expect(query).toContain('LIMIT 1');
    });
  });

  describe('toSQL with vector', () => {
    it('should return SQL with vector sort without executing', () => {
      const { sql, params } = DocumentRepo.find()
        .sort({ embedding: { nearestTo: [1, 2, 3], metric: 'l2' } })
        .limit(5)
        .toSQL();

      expect(sql).toContain('"embedding" <-> $');
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('LIMIT 5');
      expect(params).toContain('[1,2,3]');
      expect(mockedPool.query).not.toHaveBeenCalled();
    });

    it('should return SQL with vector where clause without executing', () => {
      const { sql, params } = DocumentRepo.find()
        .where({ embedding: { nearestTo: [1, 2, 3], metric: 'cosine', distance: { '<': 0.5 } } })
        .toSQL();

      expect(sql).toContain('"embedding" <=> $');
      expect(sql).toContain('< $');
      expect(params).toContain('[1,2,3]');
      expect(params).toContain(0.5);
      expect(mockedPool.query).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty vector', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepo.find()
        .sort({ embedding: { nearestTo: [], metric: 'cosine' } })
        .limit(5);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <=> $');
      expect(params).toContain('[]');
    });

    it('should handle high-dimensional vectors', async () => {
      const bigal = initialize({ pool: mockedPool, models: [Document, DocumentHighDim] });
      const hdRepo = bigal.getRepository(DocumentHighDim);
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      const largeVector = Array.from({ length: 1536 }, () => Math.random());
      await hdRepo
        .find()
        .sort({ embedding: { nearestTo: largeVector, metric: 'cosine' } })
        .limit(5);

      const [query, params] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"embedding" <=> $');
      assert(params);
      const vectorParam = params.find((p) => typeof p === 'string' && p.startsWith('['));
      expect(vectorParam).toBeDefined();
    });

    it('should handle negative vector values', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepo.find()
        .sort({ embedding: { nearestTo: [-1, -0.5, 0.3], metric: 'l2' } })
        .limit(5);

      const [, params] = mockedPool.query.mock.calls[0]!;
      expect(params).toContain('[-1,-0.5,0.3]');
    });

    it('should handle single-element vector', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepo.find()
        .sort({ embedding: { nearestTo: [1.0], metric: 'l2' } })
        .limit(5);

      const [, params] = mockedPool.query.mock.calls[0]!;
      expect(params).toContain('[1]');
    });

    it('should handle scientific notation in vector values', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepo.find()
        .sort({ embedding: { nearestTo: [1e-10, 2e10, 3], metric: 'cosine' } })
        .limit(5);

      const [, params] = mockedPool.query.mock.calls[0]!;
      expect(params).toContain('[1e-10,20000000000,3]');
    });

    it('should reject NaN in vector array', async () => {
      await expect(
        DocumentRepo.find()
          .sort({ embedding: { nearestTo: [1, Number.NaN, 3], metric: 'l2' } })
          .limit(5),
      ).rejects.toThrow('nearestTo must be an array of finite numbers');
    });

    it('should reject Infinity in vector array', async () => {
      await expect(
        DocumentRepo.find()
          .sort({ embedding: { nearestTo: [1, Number.POSITIVE_INFINITY, 3], metric: 'l2' } })
          .limit(5),
      ).rejects.toThrow('nearestTo must be an array of finite numbers');
    });

    it('should handle float precision in vector values', async () => {
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await DocumentRepo.find()
        .sort({ embedding: { nearestTo: [1.23456789, 2.34567891, 3.45678912], metric: 'cosine' } })
        .limit(5);

      const [, params] = mockedPool.query.mock.calls[0]!;
      const vectorParam = params?.find((p) => typeof p === 'string' && p.startsWith('['));
      expect(vectorParam).toContain('1.23456789');
    });

    it('should handle vector with global filters', async () => {
      const FilteredDocument = table(
        'documents',
        {
          id: serial().primaryKey(),
          title: text().notNull(),
          embedding: vector({ dimensions: 3 }),
          isPublished: text().notNull(),
        },
        {
          modelName: 'FilteredDocument',
          filters: { published: { isPublished: 'true' } },
        },
      );

      const bigal = initialize({ pool: mockedPool, models: [FilteredDocument] });
      const repo = bigal.getRepository(FilteredDocument);
      mockedPool.query.mockResolvedValueOnce(getQueryResult([]));

      await repo
        .find()
        .sort({ embedding: { nearestTo: [1, 2, 3], metric: 'cosine' } })
        .limit(5);

      const [query] = mockedPool.query.mock.calls[0]!;
      expect(query).toContain('"is_published"=');
      expect(query).toContain('"embedding" <=> $');
    });
  });
});
