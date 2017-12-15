### 1.0.3

  * Fix: A query with an empty array should return 0 records. Negated queries with empty arrays will return all records.

### 1.0.2

  * Organize schemas by case-insensitive global id
  * Expose schema attributes collection on model instance
  * Expose schema attribute functions as methods for results
  * Ensure .count() returns number instead of a string (default data type for bigint)
  * Fix queries for empty arrays

### 1.0.1

  * Add .count() method

### 1.0.0

  * Initial release
