# BigAl vs Raw SQL

## When to use BigAl

BigAl is a good fit for standard CRUD operations and queries that map naturally to its fluent API:

- Simple to moderately complex WHERE clauses
- Joins on defined relationships
- Pagination, sorting, and counting
- Subqueries with aggregates
- DISTINCT ON queries
- Upserts with ON CONFLICT

## When to use raw SQL

Drop to raw SQL (via your pool directly) when:

- You need CTEs (WITH clauses)
- Window functions beyond what DISTINCT ON provides
- Complex recursive queries
- Bulk operations with custom locking (SELECT FOR UPDATE)
- Database-specific features BigAl does not wrap

## Translation reference

### Basic queries

| SQL                                                   | BigAl                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `SELECT * FROM products WHERE id = 1`                 | `productRepo.findOne().where({ id: 1 })`                     |
| `SELECT name FROM products WHERE id = 1`              | `productRepo.findOne({ select: ['name'] }).where({ id: 1 })` |
| `SELECT * FROM products WHERE name ILIKE '%widget%'`  | `productRepo.find().where({ name: { contains: 'widget' } })` |
| `SELECT * FROM products WHERE price >= 100`           | `productRepo.find().where({ price: { '>=': 100 } })`         |
| `SELECT * FROM products WHERE status IN ('a','b')`    | `productRepo.find().where({ status: ['a', 'b'] })`           |
| `SELECT * FROM products WHERE status <> 'x'`          | `productRepo.find().where({ status: { '!': 'x' } })`         |
| `SELECT * FROM products WHERE deleted_at IS NOT NULL` | `productRepo.find().where({ deletedAt: { '!': null } })`     |
| `SELECT * FROM products ORDER BY name LIMIT 10`       | `productRepo.find().where({}).sort('name asc').limit(10)`    |
| `SELECT COUNT(*) FROM products WHERE active = true`   | `productRepo.count().where({ active: true })`                |

### CRUD

| SQL                                                         | BigAl                                          |
| ----------------------------------------------------------- | ---------------------------------------------- |
| `INSERT INTO products (name) VALUES ('Widget') RETURNING *` | `productRepo.create({ name: 'Widget' })`       |
| `UPDATE products SET name = 'X' WHERE id = 1 RETURNING *`   | `productRepo.update({ id: 1 }, { name: 'X' })` |
| `DELETE FROM products WHERE id = 1 RETURNING *`             | `productRepo.destroy({ id: 1 })`               |

### Subqueries, joins, and advanced

| SQL                                                                      | BigAl                                                                                   |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `WHERE store_id IN (SELECT id FROM stores WHERE active)`                 | `.where({ store: { in: subquery(storeRepo).select(['id']).where({ active: true }) } })` |
| `INNER JOIN stores s ON p.store_id = s.id WHERE s.name = 'Acme'`         | `.join('store').where({ store: { name: 'Acme' } })`                                     |
| `SELECT DISTINCT ON (store_id) * ... ORDER BY store_id, created_at DESC` | `.distinctOn(['store']).sort('store').sort('createdAt desc')`                           |
| `ON CONFLICT (sku) DO NOTHING`                                           | `{ onConflict: { action: 'ignore', targets: ['sku'] } }`                                |
| `ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name`                   | `{ onConflict: { action: 'merge', targets: ['sku'], merge: ['name'] } }`                |

## Mixing BigAl and raw SQL

BigAl does not lock you in. Use the same pool for raw queries:

```ts
const { rows } = await pool.query('SELECT * FROM products WHERE tsv @@ plainto_tsquery($1)', ['search term']);
```

Use BigAl for the 90% of queries that are straightforward, and raw SQL for the rest.
