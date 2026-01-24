# Relationships and Type Safety in BigAl

This guide covers how to define relationships between entities and how BigAl's type system ensures type safety when working with query results.

## Table of Contents

- [Relationship Types](#relationship-types)
  - [Many-to-One (model)](#many-to-one-model)
  - [One-to-Many (collection)](#one-to-many-collection)
  - [Many-to-Many (through)](#many-to-many-through)
  - [Self-Referencing Relationships](#self-referencing-relationships)
- [Understanding QueryResult](#understanding-queryresult)
  - [How Type Narrowing Works](#how-type-narrowing-works)
  - [Using QueryResult in Type Definitions](#using-queryresult-in-type-definitions)
  - [Working with Populated Relations](#working-with-populated-relations)
  - [Filtering and Sorting by Junction Table Columns](#filtering-and-sorting-by-junction-table-columns)
- [Best Practices](#best-practices)

## Relationship Types

BigAl supports three relationship patterns via the `@column` decorator.

### Many-to-One (model)

Use `model` when an entity belongs to another entity. This creates a foreign key relationship where the current entity holds the reference.

```ts
import { column, Entity, primaryColumn, table } from 'bigal';
import type { Store } from './Store';

@table({ name: 'products' })
export class Product extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({
    model: () => 'Store',
    name: 'store_id',
  })
  public store!: number | Store;
}
```

**Key points:**

- The property type is `number | Store` — it holds the foreign key ID when not populated, or the full entity when populated via `.populate()`
- Use `name: 'store_id'` to specify the actual database column name when it differs from the property name
- Reference the model by string name (`'Store'`) to avoid circular import issues. You can also use `() => Store.name` if the import is available
- The model name is case-insensitive (`'store'` and `'Store'` both work)

### One-to-Many (collection)

Use `collection` when an entity has many related entities. This is the inverse side of a many-to-one relationship.

```ts
import { column, Entity, primaryColumn, table } from 'bigal';
import type { Product } from './Product';

@table({ name: 'stores' })
export class Store extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string' })
  public name?: string;

  @column({
    collection: () => 'Product',
    via: 'store',
  })
  public products?: Product[];
}
```

**Key points:**

- `via` references the property name on the related model that holds the foreign key (not the database column name)
- Collections should be optional (`?`) since they're only populated when explicitly requested via `.populate()`
- Without `.populate()`, this property will be `undefined`

### Many-to-Many (through)

Use `through` for many-to-many relationships that require a join table.

```ts
// Product.ts
import { column, Entity, primaryColumn, table } from 'bigal';
import type { Category } from './Category';
import type { ProductCategory } from './ProductCategory';

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
import { column, Entity, primaryColumn, table } from 'bigal';
import type { Product } from './Product';
import type { ProductCategory } from './ProductCategory';

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
import { column, Entity, primaryColumn, table } from 'bigal';
import type { Category } from './Category';
import type { Product } from './Product';

@table({ name: 'product__category' })
export class ProductCategory extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({
    model: () => 'Product',
    name: 'product_id',
  })
  public product!: number | Product;

  @column({
    model: () => 'Category',
    name: 'category_id',
  })
  public category!: number | Category;
}
```

**Key points:**

- `through` specifies the join table model
- `via` references the property on the join table that points back to this entity
- The join table must have `model` relationships to both sides of the many-to-many relationship

### Self-Referencing Relationships

Entities can reference themselves for hierarchical data structures.

```ts
import { column, Entity, primaryColumn, table } from 'bigal';

@table({ name: 'categories' })
export class Category extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  // Parent category (many-to-one to self)
  @column({
    model: () => 'Category',
    name: 'parent_id',
  })
  public parent?: number | Category | null;

  // Child categories (one-to-many from self)
  @column({
    collection: () => 'Category',
    via: 'parent',
  })
  public children?: Category[];
}
```

## Understanding QueryResult

When you query entities with `find()` or `findOne()`, BigAl returns a `QueryResult<T>` type that automatically narrows relationship fields from their union types.

### How Type Narrowing Works

Consider a `Product` entity where `store` is typed as `number | Store`:

```ts
// The Product entity definition
class Product extends Entity {
  public id!: number;
  public name!: string;
  public store!: number | Store; // Union type
}
```

When you query without populating:

```ts
const product = await productRepository.findOne().where({ id: 1 });

// product.store is `number`, not `number | Store`
// BigAl's QueryResult type automatically narrows the union
console.log(product.store); // number (the foreign key ID)
```

This works because `QueryResult<T>` transforms relationship properties:

- `number | Store` becomes `number` (the foreign key type)
- `number | Store | null` becomes `number | null`
- `Product[]` (collections) are excluded from the base result since they require explicit population

### Using QueryResult in Type Definitions

When defining types for cached data or API responses, use `Pick<QueryResult<T>, ...>` instead of `Pick<T, ...>`:

```ts
import type { QueryResult } from 'bigal';
import type { Product } from './Product';

// Correct: Uses QueryResult to narrow the store property
type ProductSummary = Pick<QueryResult<Product>, 'id' | 'name' | 'store'>;
// ProductSummary.store is `number`

// Incorrect: Preserves the union type
type ProductSummaryWrong = Pick<Product, 'id' | 'name' | 'store'>;
// ProductSummaryWrong.store is `number | Store`
```

**Why this matters:**

```ts
// Without QueryResult, you get type errors:
type ProductCache = Pick<Product, 'id' | 'name' | 'store'>;

const productsById: Record<number, ProductCache> = {};
const product: ProductCache = { id: 1, name: 'Widget', store: 42 };

// Error: Type 'number | Store' cannot be used as an index type
productsById[product.store] = product;

// With QueryResult, it works:
type ProductCacheCorrect = Pick<QueryResult<Product>, 'id' | 'name' | 'store'>;

const productsByIdCorrect: Record<number, ProductCacheCorrect> = {};
const productCorrect: ProductCacheCorrect = { id: 1, name: 'Widget', store: 42 };

// Works: product.store is `number`
productsByIdCorrect[productCorrect.store] = productCorrect;
```

### Working with Populated Relations

When you use `.populate()`, the relationship is fully loaded:

```ts
const product = await productRepository.findOne().where({ id: 1 }).populate('store');

// After populate, product.store is the full Store entity
console.log(product.store.name); // Access Store properties directly
```

For type safety with populated relations, BigAl provides `QueryResultPopulated`:

```ts
import type { QueryResultPopulated } from 'bigal';
import type { Product } from './Product';

// Type for a Product with store populated
type ProductWithStore = QueryResultPopulated<Product, 'store'>;
// ProductWithStore.store is QueryResult<Store>
```

### Filtering and Sorting by Junction Table Columns

When using many-to-many relationships with `through`, you can filter and sort by columns on the junction table using the `through` option in `.populate()`:

```ts
// Example: A Compilation has many Tracks through CompilationTrackMap
// The junction table has ordering and revisionDeleted columns

// Filter by junction table columns
const compilation = await compilationRepository
  .findOne()
  .where({ id: compilationId })
  .populate('tracks', {
    through: {
      where: { revisionDeleted: null }, // Only non-deleted mappings
    },
  });

// Sort by junction table columns
const compilation = await compilationRepository
  .findOne()
  .where({ id: compilationId })
  .populate('tracks', {
    through: {
      sort: 'ordering asc', // Order by position in compilation
    },
  });

// Combine junction and target options
const compilation = await compilationRepository
  .findOne()
  .where({ id: compilationId })
  .populate('tracks', {
    select: ['name', 'duration'],
    where: { isPublished: true }, // Filter on Track
    through: {
      where: { revisionDeleted: null }, // Filter on junction table
      sort: 'ordering asc', // Sort by junction table column
    },
  });
```

**Key points:**

- `through.where` filters which junction table records are included
- `through.sort` determines the order of populated items based on junction table columns
- When `through.sort` is specified, it takes precedence over the target entity `sort` option
- These options only apply to many-to-many relationships that use `through`
- If `through.where` filters out all junction records, the target query is skipped (optimization)

## Best Practices

### 1. Always use `QueryResult<T>` for query result types

```ts
// Correct
async function getProduct(id: number): Promise<QueryResult<Product> | null> {
  return productRepository.findOne().where({ id });
}

// Avoid: Returns the entity type with union relationships
async function getProductWrong(id: number): Promise<Product | null> {
  return productRepository.findOne().where({ id });
}
```

### 2. Use string references for model names to avoid circular imports

```ts
// Preferred: String reference
@column({ model: () => 'Store', name: 'store_id' })
public store!: number | Store;

// Also works: Using .name property
@column({ model: () => Store.name, name: 'store_id' })
public store!: number | Store;
```

### 3. Mark collections as optional

Collections are only populated when explicitly requested, so they should be optional:

```ts
// Correct
@column({ collection: () => 'Product', via: 'store' })
public products?: Product[];

// Incorrect: Will always be undefined unless populated
@column({ collection: () => 'Product', via: 'store' })
public products!: Product[];
```

### 4. Avoid type assertions with relationship fields

BigAl's type system is designed to work without `as` assertions:

```ts
// Avoid
const storeId = product.store as number;

// Preferred: QueryResult already narrows the type
const product = await productRepository.findOne().where({ id: 1 });
const storeId = product.store; // Already `number`
```

### 5. Use `.toJSON()` for serializable results

When you need plain objects (e.g., for API responses):

```ts
// Returns plain objects without class prototype
const product = await productRepository.findOne().where({ id: 1 }).toJSON();

// Also works with populate
const productWithStore = await productRepository.findOne().where({ id: 1 }).populate('store').toJSON();
```
