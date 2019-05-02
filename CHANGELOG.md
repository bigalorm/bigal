### 2.0.2
  * Add boolean types as acceptable values for a where clause

### 2.0.1
  * Fix case of import module for initialization function

### 2.0.0
  * Typescript ftw! The API is the same as BigAl v1.x. BigAl v2 is a rewrite in typescript, to provide strong type support. It should be a drop in update to go to v2.

### 1.2.1
  * Use husky to enforce precommit hook for development

### 1.2.0
  * Add `connections` property to initialize method
  * Use `connection` on model schema to optionally set specific connection pools for each model
  * Update dependencies

### 1.1.6
  * Update dependencies

### 1.1.5
  * Throw exception when find, update, findOne, and destroy queries receive a string parameter instead of object.

### 1.1.4

  * Fix: Results for model queries should share the same inherited base

### 1.1.3

  * Fix: Querying array types
  * Fix: Explicitly cast array values

### 1.1.2

  * Fix: Try to convert float and integer column data to numbers when fetching records

### 1.1.1

  * Fix: Checking if array column equals an empty array

### 1.1.0

  * Allow array values for: like, contains, startsWith, and endsWith

### 1.0.8

  * Fix: Prevent trying to save when create() is called with an empty array

### 1.0.7

  * Fix: Add additional stack trace data when an exception occurs

### 1.0.6

  * Fix: "invalid input syntax for type json" error when setting jsonb column value to an array. See https://github.com/brianc/node-postgres/issues/442
  * Update npms to latest versions

### 1.0.5

  * Fix: AND constraint after an OR constraint caused exception

### 1.0.4

  * Fix: Querying date values was not working
  * Fix: Querying a property with columnName that is the same as the property name would result in unnecessary sql syntax

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
