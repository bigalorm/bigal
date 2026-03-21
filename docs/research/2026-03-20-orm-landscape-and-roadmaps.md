# ORM Landscape & Roadmaps Research (March 2026)

Features and trends from competing ORMs that BigAl should consider.

## High Priority (widespread adoption, clear user demand)

### pgvector / vector column type

Now supported by Drizzle, Prisma, MikroORM, and TypeORM. BigAl should add a
`vector(name, { dimensions })` column builder with distance operator support
(`<->` L2, `<#>` inner product, `<=>` cosine) and HNSW/IVFFlat index creation.
Users building AI/RAG applications expect this.

### Streaming / async iterables for large result sets

Prisma Next and MikroORM v7 both add `stream()` for processing large datasets
without loading everything into memory. BigAl could add
`repo.find().where({...}).stream()` returning an `AsyncIterable<T>`.

### Standard Schema / Zod validation generation

The industry is converging on Standard Schema (joint spec by Zod, Valibot,
ArkType creators). Drizzle ships `drizzle-zod`, `drizzle-valibot`,
`drizzle-arktype` with `createSelectSchema()` / `createInsertSchema()`.
BigAl could auto-generate validation schemas from table definitions.

### CTEs and recursive queries

MikroORM v7 added `with()` and `withRecursive()`. These are common for
tree structures, reporting, and analytics queries. BigAl's query builder
could add `.with(name, subquery)` support.

### Edge runtime compatibility

Prisma 7 removed its Rust engine partly for edge deployment (90% smaller
bundle). MikroORM v7 has zero Node.js built-in dependencies. BigAl should
audit its Node.js built-in usage and consider HTTP-based PostgreSQL driver
support (Neon, Supabase) for edge environments.

## Medium Priority (emerging patterns, competitive differentiation)

### Lifecycle hooks

Drizzle's **#1 most requested missing feature** since 2023. BigAl already
has `beforeCreate` and `beforeUpdate` — this is a genuine competitive
advantage. Expanding to the full set (afterCreate, afterUpdate,
beforeDestroy, afterDestroy, afterFind) would further differentiate.

### Graph-based migrations

Prisma Next is building graph-based migrations that handle parallel
development, squashing, baselines, and data migrations with type-safe
transformations. Worth watching for BigAl's future migration tooling.

### AI-friendly error messages

Prisma Next is designing machine-readable error codes and compile-time
guardrails specifically for AI agents. As more development happens via
AI pair programming, structured error output becomes valuable.

### Multi-tenancy primitives

No major TypeScript ORM offers built-in multi-tenancy yet. Three common
approaches: separate databases, separate PostgreSQL schemas, shared schema
with discriminator column. MikroORM has a schema option for schema-based
tenancy. Ent (Go) has a privacy layer that enforces tenancy at the ORM level.

### Many-to-many simplification

Drizzle v2's `defineRelations()` with `through()` and simplified query
syntax (plain objects instead of callback functions) has been well received.
BigAl's `hasMany().through().via()` already follows this pattern.

## Worth Watching (innovative but early)

### Declarative access control in schema

ZenStack's `@@allow` and `@@deny` annotations define authorization rules
in the schema itself, automatically enforced at runtime. Ent (Go) has a
similar privacy layer. Powerful pattern but adds significant complexity.

### Real-time CDC integration

Prisma Pulse provides type-safe database event subscriptions via PostgreSQL
logical replication. ElectricSQL syncs Postgres subsets to local SQLite
via CRDTs. Real-time is typically handled at a higher layer, but providing
after-mutation callbacks that a CDC layer could consume would be valuable.

### Prisma Next: Dual schema definition

Prisma Next will support defining schemas in either `.prisma` DSL OR pure
TypeScript. This validates BigAl's direction of TypeScript-native schema
definitions. Prisma is converging toward what BigAl v16 already offers.

### Drizzle + PlanetScale

PlanetScale hired the entire Drizzle core team in early 2026. Drizzle
remains independent but now has full-time resources. Their v1.0 beta
includes a massive "alternation engine" rework with 9,000+ tests.

### MikroORM v7: Zero dependencies, Kysely integration

MikroORM replaced Knex with Kysely as its query runner, dropped all runtime
dependencies from core, and added edge runtime support via `mikro-orm compile`.
The decorator-free `defineEntity` pattern is now the default.

### TypeORM 1.0

Targeting H1 2026 (98.6% milestone progress). Still no TC39 decorator
migration planned. Dropping Node 16/18. Growing liability as ecosystem
moves to standard decorators.

## Key Takeaway

The TypeScript ORM ecosystem is converging on:
1. **Function-based schema definitions** (Drizzle, MikroORM, Prisma Next)
2. **Type inference from schema** (no separate interfaces)
3. **SQL-first with type safety** (not heavy abstraction)
4. **Zero/minimal dependencies** for edge compatibility
5. **pgvector as table stakes** for AI applications

BigAl v16's direction aligns well with all five trends. The main gaps to
address are pgvector support, streaming, and Standard Schema integration.
