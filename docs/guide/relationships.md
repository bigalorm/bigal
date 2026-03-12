# Relationships

BigAl supports three relationship patterns via the `@column` decorator: many-to-one, one-to-many, and many-to-many.

## Many-to-one (model)

Use `model` when the current entity holds the foreign key:

```ts
import { column, Entity, primaryColumn, table } from 'bigal';
import type { Store } from './Store';

@table({ name: 'products' })
export class Product extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({ model: () => 'Store', name: 'store_id' })
  public store!: number | Store;
}
```

- The property type is `number | Store` — foreign key when not populated, full entity after `.populate()`
- Use `name: 'store_id'` when the database column differs from the property name
- Reference the model by string name (`'Store'`) to avoid circular imports
- Model names are case-insensitive

## One-to-many (collection)

Use `collection` on the inverse side:

```ts
import { column, Entity, primaryColumn, table } from 'bigal';
import type { Product } from './Product';

@table({ name: 'stores' })
export class Store extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string' })
  public name?: string;

  @column({ collection: () => 'Product', via: 'store' })
  public products?: Product[];
}
```

- `via` references the property name on the related model (not the database column)
- Collections **must** be optional (`?`) — they are only present after `.populate()`

## Many-to-many (through)

Use `through` for relationships that require a join table:

```ts
// Product.ts
@table({ name: 'products' })
export class Product extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({
    collection: () => 'Category',
    through: () => 'ProductCategory',
    via: 'product',
  })
  public categories?: Category[];
}
```

```ts
// Category.ts
@table({ name: 'categories' })
export class Category extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({
    collection: () => 'Product',
    through: () => 'ProductCategory',
    via: 'category',
  })
  public products?: Product[];
}
```

```ts
// ProductCategory.ts (join table)
@table({ name: 'product__category' })
export class ProductCategory extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ model: () => 'Product', name: 'product_id' })
  public product!: number | Product;

  @column({ model: () => 'Category', name: 'category_id' })
  public category!: number | Category;
}
```

- `through` specifies the join table model
- `via` references the property on the join table that points back to this entity
- The join table must have `model` relationships to both sides

## Self-referencing relationships

Entities can reference themselves for hierarchical data:

```ts
@table({ name: 'categories' })
export class Category extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({ model: () => 'Category', name: 'parent_id' })
  public parent?: number | Category | null;

  @column({ collection: () => 'Category', via: 'parent' })
  public children?: Category[];
}
```

## QueryResult type narrowing

When you query entities, BigAl returns `QueryResult<T>` which automatically narrows relationship fields:

```ts
const product = await productRepository.findOne().where({ id: 1 });

// product.store is `number`, not `number | Store`
// QueryResult narrows the union automatically
console.log(product.store); // number (the foreign key ID)
```

The narrowing rules:

| Entity property type      | QueryResult type     |
| ------------------------- | -------------------- |
| `number \| Store`         | `number`             |
| `number \| Store \| null` | `number \| null`     |
| `Product[]` (collection)  | Excluded from result |

### Using QueryResult in type definitions

Use `Pick<QueryResult<T>, ...>` instead of `Pick<T, ...>` for derived types:

```ts
import type { QueryResult } from 'bigal';

// Correct: store is `number`
type ProductSummary = Pick<QueryResult<Product>, 'id' | 'name' | 'store'>;

// Wrong: store is `number | Store`
type ProductSummaryWrong = Pick<Product, 'id' | 'name' | 'store'>;
```

## QueryResultPopulated

For type safety with populated relations:

```ts
import type { QueryResultPopulated } from 'bigal';

// store is QueryResult<Store>
type ProductWithStore = QueryResultPopulated<Product, 'store'>;
```

## Populate with junction table filtering

For many-to-many relationships, you can filter and sort by columns on the junction table:

```ts
const compilation = await compilationRepository
  .findOne()
  .where({ id: compilationId })
  .populate('tracks', {
    select: ['name', 'duration'],
    where: { isPublished: true },
    through: {
      where: { revisionDeleted: null },
      sort: 'ordering asc',
    },
  });
```

- `through.where` filters junction table records
- `through.sort` orders populated items by junction table columns
- When `through.sort` is specified, it takes precedence over the target entity sort

## Best practices

1. **Use `QueryResult<T>` for return types** — avoids union type ambiguity
2. **Use string references for model names** — prevents circular imports
3. **Mark collections as optional** — they are `undefined` unless populated
4. **Avoid type assertions** — `QueryResult` narrows types automatically
5. **Use `.toJSON()` for serializable results** — strips class prototypes
