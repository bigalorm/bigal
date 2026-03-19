---
title: "feat: Function-Based Schema API"
type: feat
date: 2026-03-19
---

# Function-Based Schema API

## Enhancement Summary

**Deepened on:** 2026-03-19
**Research:** 15+ ORMs analyzed across TypeScript, Ruby, Python, PHP, Elixir, Rust, Go
**Agents used:** Architecture Strategist, TypeScript Reviewer, Performance Oracle, Security Sentinel, Simplicity Reviewer, DHH Reviewer, Framework Docs Researcher (x3), Type System Prototyper

### Design Evolution

The plan went through three design iterations:

1. **v1:** `defineModel<IProduct>({ columns: { name: column({ type: 'string' }) } })` — consumer-provided interface + `RelatedModel<T>` brand
2. **v2:** DHH review challenged `RelatedModel<T>` as unnecessary ceremony. Simplicity review agreed to drop it.
3. **v3 (current):** Drizzle-inspired `table('products', { name: text('name').notNull() })` — types inferred from column builders. No separate interface, no brands. PostgreSQL-native column types.

---

## Overview

Replace BigAl's decorator-based model definition system with a function-based schema API using PostgreSQL-native column builder functions. Types are inferred directly from the schema definition — no separate interfaces, no `extends Entity`, no decorator flags required.

## Problem Statement

BigAl's decorators use the legacy TypeScript `experimentalDecorators` signature `(target, propertyName)`. Modern build tools (esbuild, SWC, Vite) increasingly apply TC39 decorator transforms by default, which pass `(value, DecoratorContext)` instead. This causes BigAl to crash at class load time.

**Confirmed failures in production:**
- Playwright e2e tests (transpiler applies TC39 transforms regardless of tsconfig)
- Serverless Framework / Lambda (esbuild applies TC39 transforms)

## Proposed Solution

A function-based `table()` API with PostgreSQL-native column builders that infer both `$inferSelect` and `$inferInsert` types. No classes, no decorators, no transpiler flags, no separate interface definitions.

## Technical Approach

### Consumer API

```typescript
import {
  table, serial, text, varchar, integer, real, boolean,
  jsonb, uuid, textArray, timestamptz,
  belongsTo, hasMany, createdAt, updatedAt,
} from 'bigal';

// Shared base columns — plain objects, spread them in
const modelBase = {
  id: serial('id').primaryKey(),
};

const timestamps = {
  createdAt: createdAt(),
  updatedAt: updatedAt(),
};

// Product
export const Product = table('products', {
  ...modelBase,
  ...timestamps,
  name: text('name').notNull(),
  sku: varchar('sku', { length: 100 }),
  location: text('location'),
  aliases: textArray('alias_names').default([]),
  priceCents: integer('price_cents').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb<{ color?: string }>('metadata'),
  store: belongsTo(() => Store, 'store_id'),
  categories: hasMany(() => Category)
    .through(() => ProductCategory)
    .via('product'),
});

// Types inferred from schema — no separate interface
type ProductSelect = typeof Product.$inferSelect;
// { id: number; name: string; sku: string | null; location: string | null;
//   aliases: string[]; priceCents: number; isActive: boolean;
//   metadata: { color?: string } | null; store: number;
//   createdAt: Date; updatedAt: Date }

type ProductInsert = typeof Product.$inferInsert;
// { name: string; priceCents: number; store: number;
//   id?: number; sku?: string | null; location?: string | null;
//   aliases?: string[]; isActive?: boolean;
//   metadata?: { color?: string } | null; }

// Store
export const Store = table('stores', {
  ...modelBase,
  ...timestamps,
  name: text('name'),
  products: hasMany(() => Product).via('store'),
});

// ProductCategory (junction table)
export const ProductCategory = table('product__category', {
  ...modelBase,
  product: belongsTo(() => Product, 'product_id'),
  category: belongsTo(() => Category, 'category_id'),
  ordering: integer('ordering'),
  isPrimary: boolean('is_primary'),
});
```

### PostgreSQL-Native Column Builders

Lean into Postgres. Each builder maps 1:1 to a PostgreSQL column type:

| Builder | PostgreSQL Type | TypeScript Type |
|---------|----------------|-----------------|
| `serial(name)` | SERIAL | `number` (notNull + hasDefault implied) |
| `bigserial(name)` | BIGSERIAL | `number` |
| `text(name)` | TEXT | `string \| null` |
| `varchar(name, { length })` | VARCHAR(n) | `string \| null` |
| `integer(name)` | INTEGER | `number \| null` |
| `bigint(name)` | BIGINT | `number \| null` |
| `smallint(name)` | SMALLINT | `number \| null` |
| `real(name)` | REAL | `number \| null` |
| `doublePrecision(name)` | DOUBLE PRECISION | `number \| null` |
| `boolean(name)` | BOOLEAN | `boolean \| null` |
| `timestamp(name)` | TIMESTAMP | `Date \| null` |
| `timestamptz(name)` | TIMESTAMPTZ | `Date \| null` |
| `date(name)` | DATE | `Date \| null` |
| `json<T>(name)` | JSON | `T \| null` |
| `jsonb<T>(name)` | JSONB | `T \| null` |
| `uuid(name)` | UUID | `string \| null` |
| `bytea(name)` | BYTEA | `Buffer \| null` |
| `textArray(name)` | TEXT[] | `string[] \| null` |
| `integerArray(name)` | INTEGER[] | `number[] \| null` |
| `booleanArray(name)` | BOOLEAN[] | `boolean[] \| null` |
| `createdAt(name?)` | TIMESTAMPTZ | `Date` (notNull, auto-set on insert) |
| `updatedAt(name?)` | TIMESTAMPTZ | `Date` (notNull, auto-set on insert/update) |

**Chain methods on all builders:**
- `.notNull()` — removes `null` from the type
- `.default(value)` — makes column optional on insert
- `.primaryKey()` — implies `.notNull()`, makes column optional on insert
- `.unique()` — UNIQUE constraint (no type-level effect)

**`serial()` and `bigserial()`** imply both `.notNull()` and `.default()` — they are always `number` on select and optional on insert.

### Relationship Builders

Using the universal vocabulary from Rails/Eloquent/Ecto:

```typescript
// Many-to-one: this table has the FK column
belongsTo(() => Store, 'store_id')
// $inferSelect type: number (the FK value)
// $inferInsert type: number (required by default)
// Carries Store phantom type for Populated<T>

// One-to-many: other table has the FK
hasMany(() => Product).via('store')
// Excluded from $inferSelect and $inferInsert
// Populated via .populate()

// Many-to-many: via junction table
hasMany(() => Category).through(() => ProductCategory).via('product')
// Excluded from $inferSelect and $inferInsert
// Populated via .populate()

// Circular references: arrow functions defer evaluation
belongsTo(() => Store, 'store_id')  // () => Store resolves lazily
```

### Type Inference Engine (Drizzle-Inspired)

Each column builder carries a phantom `_` type that tracks metadata through generic parameters. Chain methods return `this & { _: { flag: true } }` via intersection typing.

```typescript
// Simplified — actual implementation uses Drizzle's intersection pattern
interface ColumnBuilder<TType, TNullability, TDefault, TPrimaryKey, TAutoSet> {
  declare _: {
    type: TType;
    notNull: TNullability;
    hasDefault: TDefault;
    isPrimaryKey: TPrimaryKey;
    autoSet: TAutoSet;
  };
  notNull(): ColumnBuilder<TType, true, TDefault, TPrimaryKey, TAutoSet>;
  default(value: TType): ColumnBuilder<TType, TNullability, true, TPrimaryKey, TAutoSet>;
  primaryKey(): ColumnBuilder<TType, true, true, true, TAutoSet>;  // implies notNull + hasDefault
}

// text('name') → ColumnBuilder<string, false, false, false, false>
// text('name').notNull() → ColumnBuilder<string, true, false, false, false>
// serial('id').primaryKey() → ColumnBuilder<number, true, true, true, false>
```

**`$inferSelect`** maps each column:
- Scalar: `notNull === true ? TType : TType | null`
- `belongsTo`: the FK type (`number`)
- `hasMany`: excluded (not a database column)

**`$inferInsert`** splits columns into required and optional:
- **Required:** `notNull === true && hasDefault === false && !isPrimaryKey && !autoSet`
- **Optional:** everything else (nullable, has default, primary key, auto-set)

### How This Integrates with Existing Query API

The query builder API (`find`, `findOne`, `create`, `update`, `destroy`, `populate`, `where`, `sort`, `limit`) stays **identical**. Only the model definition and initialization change.

```typescript
// Before (decorators)
const repos = initialize({ models: [Product, Store], pool });
const ProductRepo = repos.Product as IRepository<Product>;

// After (function-based)
const bigal = createBigAl({ pool, models: [Product, Store] });
const ProductRepo = bigal.getRepository(Product);
// ProductRepo is IRepository<typeof Product.$inferSelect>
```

**Query usage — unchanged:**

```typescript
// find with where
const products = await ProductRepo.find({ name: 'Widget' }).sort('name').limit(10);
// products: ProductSelect[]

// create
const product = await ProductRepo.create({ name: 'Widget', priceCents: 999, store: 1 });
// product: ProductSelect

// populate — changes store from number to QueryResult<StoreSelect>
const populated = await ProductRepo.findOne()
  .where({ id: 42 })
  .populate('store');
// populated.store is QueryResult<StoreSelect> (not number)

// populate with select
const populated = await ProductRepo.findOne()
  .where({ id: 42 })
  .populate('store', { select: ['name'] });
// populated.store is QueryResult<Pick<StoreSelect, 'id' | 'name'>>
```

**Key type flow:**
- `WhereQuery<T>` works on `T = typeof Product.$inferSelect`
- `Populated<T, 'store', StoreSelect>` changes `store` from `number` to `QueryResult<StoreSelect>`
- `CreateUpdateParams<T>` works on `typeof Product.$inferInsert`, FKs accept `number | { id: number }`

### Initialization

```typescript
const bigal = createBigAl({
  pool,
  readonlyPool,                    // optional, defaults to pool
  models: [Product, Store, Category, ProductCategory],
  connections: {                   // optional named connections
    audit: { pool: auditPool },
  },
  onQuery({ sql, params, duration, error, model, operation }) {  // optional
    logger.debug({ sql, params, duration, model, operation });
  },
});

const ProductRepo = bigal.getRepository(Product);  // IRepository<ProductSelect>
const StoreRepo = bigal.getRepository(Store);       // IRepository<StoreSelect>
```

**Batch registration with eager validation.** All models passed upfront. Relationship references validated at construction time. No lazy resolution, no `validate()` method — just fail fast.

---

## Implementation Phases

### Phase 1: Core (Schema API + Initialization + Type System + Tests)

**Goal:** Ship the complete new API end-to-end. Tests converted alongside implementation.

**Column builders:**

- [ ] Implement `ColumnBuilder` base with phantom `_` type and chain methods (`.notNull()`, `.default()`, `.primaryKey()`, `.unique()`)
- [ ] Implement PostgreSQL-native builders: `serial`, `bigserial`, `text`, `varchar`, `integer`, `bigint`, `smallint`, `real`, `doublePrecision`, `boolean`, `timestamp`, `timestamptz`, `date`, `json`, `jsonb`, `uuid`, `bytea`, `textArray`, `integerArray`, `booleanArray`
- [ ] Implement convenience builders: `createdAt`, `updatedAt` (auto-set, notNull)
- [ ] `serial` / `bigserial` imply notNull + hasDefault
- [ ] `primaryKey()` implies notNull + hasDefault
- [ ] Validate all column names via `assertValidSqlIdentifier()` at construction

**Relationship builders:**

- [ ] Implement `belongsTo(modelFn, fkColumnName)` — returns `BelongsToBuilder<TModel, TFkType>`
- [ ] Implement `hasMany(modelFn)` with `.via(propertyName)` and `.through(modelFn).via(propertyName)` chains
- [ ] Arrow functions for circular reference handling

**Table definition:**

- [ ] Implement `table(name, columns)` — returns `TableDefinition<TName, TSchema>`
- [ ] Validate table name via `assertValidSqlIdentifier()`
- [ ] Build indexed lookups at definition time (`columnsByPropertyName`, `columnsByColumnName`, `primaryKeyColumn`, `createDateColumns`, `updateDateColumns`, `versionColumns`)
- [ ] Expose `$inferSelect` and `$inferInsert` as phantom types (via `declare readonly`)

**Type inference:**

- [ ] Implement `InferSelect<TSchema>` mapped type — reads phantom `_` on each builder
- [ ] Implement `InferInsert<TSchema>` mapped type — splits required vs optional keys
- [ ] Implement `SelectKeys<TSchema>` — filters out `hasMany` columns
- [ ] Implement `RequiredInsertKeys<TSchema>` / `OptionalInsertKeys<TSchema>`
- [ ] Handle nullable (`TType | null` when notNull is false)
- [ ] Handle `belongsTo` → FK type in select/insert
- [ ] Handle `hasMany` → excluded from both
- [ ] Handle optional properties: use `-?` modifier, `NonNullable<T>` in conditional checks

**Type system migration:**

- [ ] Replace `T extends Entity` with `T extends Record<string, unknown> & { id: unknown }` across all generic types
- [ ] Rewrite `QueryResult<T>` — strip `belongsTo` columns to FK type, exclude collections (using column metadata phantom types instead of `extends Entity` checks)
- [ ] Rewrite `CreateUpdateParams<T>` — FK columns accept `TFkType | { id: TFkType }`
- [ ] Rewrite `WhereQuery<T>` — exclude collections, include FK columns as their primitive type
- [ ] Rewrite `Populated<T, K, TPropertyType>` — changes property `K` from FK type to `QueryResult<TPropertyType>`
- [ ] Remove `NotEntity<T>`, `NotEntityBrand`, `Entity`, `EntityStatic`
- [ ] Remove `ExcludeEntityCollections`, `OmitEntityCollections`, `ExcludeFunctions`, `IncludeFunctions`, `PickFunctions`, `OmitFunctions`
- [ ] Remove `FindResultJSON`, `FindOneResultJSON`, `CreateResultJSON`, `UpdateResultJSON`, `DestroyResultJSON`
- [ ] Remove `.toJSON()` from all result types entirely
- [ ] Remove `_buildInstance()` — only `_buildPlainObject()` remains

**Initialization:**

- [ ] Implement `createBigAl(options)` — accepts `pool`, `readonlyPool?`, `connections?`, `models`, `onQuery?`
- [ ] Implement `bigal.getRepository(tableDef)` — returns typed `IRepository<T>` or `IReadonlyRepository<T>`
- [ ] Batch registration with eager relationship validation at construction
- [ ] Wire hooks from table definition into repository
- [ ] Remove `initialize()`, `getInheritanceTree()`, `MetadataStorage`, `global.bigAlMetadataArgsStorage`
- [ ] Update `ReadonlyRepository` / `Repository` constructors to accept table definition metadata

**Tests:**

- [ ] Rewrite all 38 test models from decorator classes to `table()` calls
- [ ] Rewrite test data generators to return plain objects
- [ ] Update test initialization to use `createBigAl()` + `getRepository()`
- [ ] Add type-level tests (`expectTypeOf`) for every public type utility:
  - `$inferSelect` and `$inferInsert` for models with scalars, FKs, collections, JSON, arrays
  - `QueryResult<T>` strips collections and FK brands correctly
  - `CreateUpdateParams<T>` allows FK value or `{ id }` for belongsTo columns
  - `Populated<T, K, TPropertyType>` changes FK to `QueryResult<TPropertyType>`
  - `WhereQuery<T>` excludes collections, includes FK as primitive
  - Optional FK, self-referential model, JSON-with-id edge cases
- [ ] Remove `experimentalDecorators` and `useDefineForClassFields` from `tsconfig.json`

**Delete old system:**

- [ ] `src/Entity.ts`
- [ ] `src/decorators/` (entire directory — 12 files)
- [ ] `src/metadata/MetadataStorage.ts`, `src/metadata/index.ts`

**Success criteria:**
- `table('products', {...})` compiles and produces correct metadata + phantom types
- `$inferSelect` and `$inferInsert` match expected types for all test models
- `createBigAl({ pool, models: [...] })` registers all models with eager validation
- All query operations work end-to-end
- All type-level tests pass
- `npm run build && npm test && npm run lint && npm run check:types` all pass

---

### Phase 2: Observability

**Goal:** Replace `DEBUG_BIGAL` env var with structured `onQuery` callback.

```typescript
interface QueryEvent {
  sql: string;
  params: readonly unknown[];
  duration: number;
  error?: Error;
  model: string;
  operation: 'find' | 'findOne' | 'count' | 'create' | 'update' | 'destroy';
}
```

**Implementation pattern (zero-cost when unused):**

```typescript
const onQuery = this._onQuery;
let startTime: number | undefined;
if (onQuery) {
  startTime = performance.now();
}

const results = await pool.query(query, params);

if (onQuery) {
  try {
    onQuery({ sql: query, params, duration: performance.now() - startTime!, model, operation });
  } catch {
    // Swallow — observability must not crash queries
  }
}
```

**Tasks:**
- [ ] Add `onQuery` to `createBigAl` options
- [ ] Read `DEBUG_BIGAL` once at startup — use as default `onQuery` if none provided
- [ ] Instrument all query paths (find, findOne, count, create, update, destroy)
- [ ] Populate sub-queries fire `onQuery` naturally through the repository chain
- [ ] Remove `console.log` in `SqlHelper.ts:184`
- [ ] Document that `params` may contain sensitive data

**Success criteria:**
- Every query fires `onQuery` with accurate data
- Zero overhead when `onQuery` not provided
- `DEBUG_BIGAL=true` still works

---

### Phase 3: Documentation and Migration Tooling

**Tasks:**
- [ ] Migration guide (`docs/guide/migration-v16.md`) with before/after for every pattern
- [ ] Migration skill (Claude Code) that converts decorator models to `table()` calls
- [ ] Complete docs rewrite (see Documentation Plan below)
- [ ] Update context7 documentation
- [ ] Update BigAl agent skill

---

## Lifecycle Hooks

### v16.0: Ship `beforeCreate` and `beforeUpdate`

These exist today and consumers depend on them. Defined inline in the table definition:

```typescript
export const Product = table('products', {
  ...modelBase,
  name: text('name').notNull(),
  // ...columns
}, {
  hooks: {
    beforeCreate(values) {
      return { ...values, slug: slugify(values.name) };
    },
    beforeUpdate(values) {
      return { ...values, updatedBy: getCurrentUserId() };
    },
  },
});
```

The `ModelHooks<T>` interface defines all 7 slots for forward compatibility, but only `beforeCreate` and `beforeUpdate` are wired in v16.0. Remaining hooks (`afterCreate`, `afterUpdate`, `beforeDestroy`, `afterDestroy`, `afterFind`) ship in v16.1+.

---

## Acceptance Criteria

### Functional Requirements

- [ ] `table()` with column builders creates typed schema definitions
- [ ] `$inferSelect` and `$inferInsert` correctly inferred from schema
- [ ] All PostgreSQL column types supported with native builders
- [ ] `belongsTo` / `hasMany` / `hasMany().through().via()` work
- [ ] Object spread works for shared columns
- [ ] `beforeCreate` and `beforeUpdate` hooks work
- [ ] `createBigAl()` with batch registration and eager validation
- [ ] `getRepository()` returns typed `IRepository<T>`
- [ ] `onQuery` callback with SQL, params, duration, error, model, operation
- [ ] `DEBUG_BIGAL=true` works as fallback
- [ ] All results are plain objects
- [ ] `.populate('store')` changes type from `number` to `QueryResult<StoreSelect>`
- [ ] `find()`, `findOne()`, `create()`, `update()`, `destroy()` API unchanged
- [ ] No `experimentalDecorators` required
- [ ] Works with tsc, esbuild, SWC, Vite, Playwright

### Non-Functional Requirements

- [ ] Zero runtime dependencies
- [ ] Dual ESM/CJS packaging
- [ ] Bundle size decreases
- [ ] No global mutable state
- [ ] Zero overhead for unused hooks/callbacks
- [ ] All identifiers validated at registration time

### Quality Gates

- [ ] `npm test` passes
- [ ] `npm run check:types` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Type-level tests (`expectTypeOf`) cover all public type utilities
- [ ] Migration guide covers every breaking change

---

## Security Considerations

Per security sentinel review (overall: LOW risk):

1. **Identifier validation at registration:** `assertValidSqlIdentifier()` on all table, schema, and column names during `table()` construction
2. **`onQuery` callback isolation:** Wrapped in try/catch. Document sensitive data in params.
3. **Column whitelist preserved:** SQL generation iterates registered columns, never raw value keys

---

## Performance Considerations

Per performance oracle review (net positive):

1. **Plain objects faster than class instances** — no `new Entity()` + `Object.assign()`
2. **Hook/callback gating:** Single property check (`if (hooks.beforeCreate)`), zero cost when unused
3. **Startup improved:** No prototype chain walking, no inheritance tree reconciliation
4. **`DEBUG_BIGAL` read once** at `createBigAl` construction, not per query
5. **Cache resolved relationship repositories** after first populate lookup

---

## Documentation Plan

| Document | Action | Priority |
|----------|--------|----------|
| `docs/guide/models.md` | Complete rewrite — `table()` API with Postgres-native builders | P0 |
| `docs/guide/migration-v16.md` | New — step-by-step upgrade guide | P0 |
| `docs/reference/api.md` | Complete rewrite — new public API surface | P0 |
| `docs/reference/configuration.md` | Update — `createBigAl` options, `onQuery` | P0 |
| `README.md` | Update — quick start, examples | P0 |
| `docs/guide/crud-operations.md` | Update — remove .toJSON(), update init | P1 |
| `docs/guide/relationships.md` | Update — `belongsTo`/`hasMany` syntax | P1 |
| `docs/guide/querying.md` | Update — model references | P1 |
| `docs/advanced/known-issues.md` | Update — remove NotEntity, update DEBUG_BIGAL | P1 |
| context7 documentation | Update | P1 |
| BigAl agent skill | Update | P1 |

---

## References

### Internal

- Brainstorm: `docs/brainstorms/2026-03-19-function-based-schema-api-brainstorm.md`
- Current decorators: `src/decorators/` (6 files)
- Current Entity: `src/Entity.ts`
- Current initialize: `src/index.ts:63-264`
- Current logging: `src/SqlHelper.ts:184`
- Type system: `src/types/QueryResult.ts`, `src/types/CreateUpdateParams.ts`, `src/types/Populated.ts`
- Test models: `tests/models/` (38 files)

### Cross-Ecosystem Research

- **Drizzle ORM** — `pgTable()`, column builders, `$inferSelect`/`$inferInsert`, phantom type state machine via intersection typing
- **MikroORM v7** — `defineEntity()`, `p` property builders, `addHook()`, spread for shared columns
- **Kysely** — `ColumnType<S,I,U>` branded type, `Generated<T>`, `Selectable`/`Insertable`/`Updateable`
- **Rails ActiveRecord** — `belongs_to`, `has_many`, `has_one`, convention-based FK naming, `timestamps`
- **Django ORM** — Required `on_delete`, `auto_now_add`, abstract base classes
- **Eloquent (Laravel)** — `belongsTo()`, `hasMany()`, `belongsToMany()`, `morphMany()`
- **SQLAlchemy 2.0** — `Mapped[T]` type inference, `relationship()`, mixin classes
- **Ecto (Elixir)** — `schema` macro, `belongs_to`, `has_many`, `many_to_many`, changeset pipelines
- **Ent (Go)** — Builder-pattern fields (`field.String("name").Unique()`), edge model, mixin composition
- **GORM (Go)** — `gorm.Model` embedding, convention-based relationships, struct tags
- **SQLModel (Python)** — Type hints as schema, `Field()` vs `Relationship()` separation
- **Diesel (Rust)** — `table!` macro, separate Queryable/Insertable/AsChangeset structs
- **SeaORM (Rust)** — Inline `#[sea_orm(has_many)]` attributes, `from`/`to` FK mapping
- **SQLx (Rust)** — Compile-time SQL verification, anonymous struct inference from queries
- **SQLC (Go)** — SQL-first code generation
