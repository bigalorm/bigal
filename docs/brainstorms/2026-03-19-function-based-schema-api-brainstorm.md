# Brainstorm: Function-Based Schema API (BigAl v Next)

**Date:** 2026-03-19
**Status:** Brainstorm complete, ready for planning

## What We're Building

A major version of BigAl that replaces the decorator-based model definition system with a function-based schema API.
This eliminates the dependency on TypeScript's `experimentalDecorators` compiler flag, which breaks under TC39 decorator transforms
used by modern build tools (Playwright, serverless framework/esbuild, Vite, SWC).

This is a breaking change that also bundles several other modernizations: dropping the Entity base class, always returning plain objects,
expanding lifecycle hooks, simplifying initialization, and adding logging/observability support.

## Why This Approach

### The Problem

BigAl's decorators use the legacy TypeScript `experimentalDecorators` signature `(target, propertyName)`.
When a consumer's build tool applies TC39 decorator transforms instead (which is increasingly the default),
BigAl receives `(undefined, DecoratorContext)` and crashes at class load time. This has been hit in production with:

- **Playwright e2e tests** — transpiler applies TC39 transforms regardless of tsconfig
- **Serverless framework (Lambda)** — esbuild applies TC39 transforms

The root cause is at `snakeCase()` calling `.match()` on a `DecoratorContext` object instead of a property name string.

### Why Function-Based Over Dual-Mode Decorators

1. **Industry trend is away from decorators.** Drizzle (4.5M weekly downloads) and Kysely (2.5M) never used decorators. MikroORM v7 now recommends `defineEntity()` over decorators.
2. **Better type inference.** Function-based schemas give compile-time type safety that decorators can't match — no `emitDecoratorMetadata` needed.
3. **Zero transpiler configuration.** Plain functions work with any build tool, any bundler, any runtime. No compiler flags required.
4. **Simpler codebase.** Eliminates the metadata storage singleton, inheritance tree walking, column modifier reconciliation, and the dual columns/columnModifiers arrays.

### Why Not Dual-Mode

Supporting both decorator styles adds complexity without moving toward the future. If we're going to do a breaking change,
we should do it once and land on the right foundation rather than carry two code paths indefinitely.

## Key Decisions

### 1. Function-based schema definitions replace decorators

**Before (decorators):**

```typescript
@table({ name: 'products' })
export class Product extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @createDateColumn()
  public createdAt!: Date;

  @column({ model: () => 'Store', name: 'store_id' })
  public store!: number | Store;
}
```

**After (function-based, conceptual — exact API to be designed in planning):**

```typescript
import { defineModel, column, primaryColumn, createDateColumn } from 'bigal';

export const Product = defineModel({
  name: 'products',
  columns: {
    id: primaryColumn({ type: 'integer' }),
    name: column({ type: 'string', required: true }),
    createdAt: createDateColumn(),
    store: column({ model: () => 'Store', name: 'store_id' }),
  },
});
```

### 2. Drop the Entity base class entirely

No more `extends Entity`. Models are schema definition objects, not classes. The abstract `id` requirement moves to the type system
via the `defineModel` return type. `NotEntity<T>` wrapper for JSON columns with `id` fields also goes away.

### 3. Always return plain objects (drop `.toJSON()`)

All query results are plain JavaScript objects by default. No class instances, no prototype chain. The `.toJSON()` toggle is removed entirely.

- **Instance methods:** Consumers who need to attach methods to results can use an `afterFind` hook or `.map()` on results. Instance methods on models were not commonly used.
- **Serialization:** Results are always JSON-serializable without an extra step.

### 4. Expanded lifecycle hooks, defined inline

Hooks are defined inside the model schema definition. The full set of lifecycle hooks:

- `beforeCreate(values)` — transform values before insert
- `afterCreate(result)` — react after insert (logging, side effects)
- `beforeUpdate(values)` — transform values before update
- `afterUpdate(result)` — react after update
- `beforeDestroy(where)` — intercept before delete
- `afterDestroy(result)` — react after delete
- `afterFind(results)` — transform results after any read query (replaces instance methods use case)

```typescript
export const Product = defineModel({
  name: 'products',
  columns: {
    /* ... */
  },
  hooks: {
    beforeCreate(values) {
      return { ...values, slug: slugify(values.name) };
    },
    afterFind(results) {
      return results; // transform if needed
    },
  },
});
```

### 5. Simplify initialize()

Rethink the initialization API. The current approach requires passing all model class constructors as an array so decorators are evaluated.
With function-based schemas, metadata is captured at definition time — no deferred evaluation needed.

**Conceptual direction:**

```typescript
import { createBigAl } from 'bigal';

const bigal = createBigAl({
  pool,
  readonlyPool,
  connections: { analytics: { pool: analyticsPool } },
});

const ProductRepo = bigal.register(Product);
const StoreRepo = bigal.register(Store);
```

Or auto-registration by passing schemas directly:

```typescript
const { Product: ProductRepo, Store: StoreRepo } = createBigAl({
  pool,
  models: [Product, Store],
});
```

Exact API to be designed in planning.

### 6. Add logging and observability support

Currently BigAl has zero hooks for logging, tracing, or query observation. The `PoolLike` interface only exposes `query(text, values)`. This major version should add first-class observability:

**Options to explore in planning:**

- **Query event hooks:** `onQuery(sql, params, durationMs)` callback on the BigAl instance
- **Middleware/interceptor pattern:** Wrap query execution with before/after hooks
- **OpenTelemetry-compatible spans:** Emit trace spans for each query automatically
- **Simple logger interface:** Accept a `logger: { debug, info, warn, error }` in config

The goal is to make it easy for consumers to add logging without wrapping the pool themselves. Should be opt-in and lightweight.

### 7. Automated upgrade path via AI skill

Provide a BigAl migration skill (Claude Code skill or codemod) that automatically converts decorator-based models to the new function-based API. This lowers the barrier for existing consumers to upgrade.

### 8. Documentation updates

All documentation must be updated as part of this effort:

- **Docs site** (VitePress at `/docs`)
- **context7** documentation for AI consumers
- **README.md**
- **BigAl agent skill** (`npx skills add bigalorm/bigal`)
- Migration guide for the breaking change

## Open Questions

1. **Exact `defineModel` return type** — What does the model definition object look like at the type level?
   How does it encode column types, relationships, and optionality for `Insertable<T>` / `Selectable<T>` / `Updateable<T>` utility types?

2. **Relationship syntax** — How do `model` (many-to-one), `collection` (one-to-many), and `through` (many-to-many) relationships work
   in the function-based API? Circular references need lazy evaluation (functions).

3. **Inheritance / shared columns** — Current pattern uses class inheritance (e.g., `BaseModel` with `id`, `createdAt`, `updatedAt`).
   Function-based equivalent could be object spread: `columns: { ...baseColumns, name: column(...) }`.
   Need to validate this works with the type system.

4. **`afterFind` hook semantics** — Does it receive raw rows or already-typed objects? Can it change the return type? Should it run on `findOne` results too?

5. **Observability API design** — Logger interface vs event emitter vs middleware pattern. Need to research what Drizzle and Kysely do here.

6. **Pool override per query** — Currently supported via internal `poolOverride` parameter. Should this be a public API?

7. **Upsert and `ON CONFLICT` behavior** — Are there any changes needed to how `createDateColumn` and `updateDateColumn` columns are handled during upserts in the new system?

8. **What other modernizations are worth bundling?** — Review the full codebase for other pain points, deprecated patterns, or technical debt that should be addressed in this breaking change.

## Out of Scope

- **CLI / codegen tool** — Not part of this effort. May be a future addition.
- **Prisma-style schema DSL** — We're staying in TypeScript, not creating a new language.
- **Query builder changes** — The fluent query API (`.where()`, `.sort()`, `.populate()`, etc.) is not changing. Only model definition and initialization.

## Next Steps

Run `/workflows:plan` to design the implementation in detail.
