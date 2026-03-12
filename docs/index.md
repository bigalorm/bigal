---
layout: home
hero:
  name: BigAl
  text: PostgreSQL-optimized TypeScript ORM
  tagline: Built exclusively for Postgres. Type-safe fluent query builder, decorator-based models, and queries tuned for Postgres performance.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/bigalorm/bigal
features:
  - title: PostgreSQL-native
    details: Built exclusively for Postgres, not a lowest-common-denominator abstraction. Queries are tuned for Postgres performance. JSONB, DISTINCT ON, subquery joins, and ON CONFLICT upserts work out of the box.
  - title: Fluent builder pattern
    details: Chain .where(), .sort(), .limit(), .join(), and .populate() calls. Each method returns a new immutable instance.
  - title: Decorator-based models
    details: Define tables, columns, and relationships with TypeScript decorators. Inheritance and schema support built in.
  - title: Type-safe queries
    details: WhereQuery types narrow automatically — relationship fields resolve to foreign keys or populated entities without type assertions.
---

<!-- markdownlint-disable MD013 MD033 MD041 -->

<style>
.code-showcase {
  max-width: 768px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}

.code-showcase h2 {
  font-family: var(--bigal-font-display);
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 0.5rem;
}

.code-showcase .subtitle {
  color: var(--bigal-text-muted);
  text-align: center;
  margin-bottom: 1.5rem;
}
</style>

<div class="code-showcase">

<h2>What it looks like</h2>
<p class="subtitle">Define a model, query it — that's it.</p>

```ts
import { column, primaryColumn, table, Entity, initialize } from 'bigal';
import { Pool } from 'postgres-pool';

@table({ name: 'products' })
class Product extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({ type: 'integer', required: true })
  public priceCents!: number;

  @column({ model: () => 'Store', name: 'store_id' })
  public store!: number | Store;
}

const repos = initialize({
  models: [Product, Store],
  pool: new Pool('postgres://localhost/mydb'),
});
const productRepo = repos.Product as Repository<Product>;

// Fluent queries — just await the chain
const products = await productRepo
  .find()
  .where({ priceCents: { '>': 1000 }, name: { contains: 'widget' } })
  .sort('name asc')
  .limit(10);

// Joins and subqueries
const expensiveProducts = await productRepo
  .find()
  .join('store')
  .where({
    store: { name: 'Acme' },
    price: { '>': subquery(productRepo).avg('price') },
  });

// Upserts with ON CONFLICT
await productRepo.create({ name: 'Widget', sku: 'WDG-001', priceCents: 999 }, { onConflict: { action: 'merge', targets: ['sku'], merge: ['priceCents'] } });
```

</div>
