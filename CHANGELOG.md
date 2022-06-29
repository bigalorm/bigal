# Change Log

## 10.3.2 - 2022-06-29

- Update npms

## 10.3.1 - 2022-05-23

- Update npms

## 10.3.0 - 2022-04-25

- Add where clause for conflict resolution. Thanks @shortstuffsushi!
- Update npms

## 10.2.0 - 2022-04-13

- Add `onConflict` options to `create()` to support `ON CONFLICT DO NOTHING` and `ON CONFLICT DO UPDATE`
- Update npms

## 10.1.1 - 2022-03-22

- Update npms

## 10.1.0 - 2022-03-15

- Add ability to override db pool for `count()`

## 10.0.3 - 2022-03-15

- Update npms
- Fix string comparison operators with arrays. Wildcard characters in array values passed to `startsWith`, `contains`,
  and `endsWith` were ignored. This fix changes the generated SQL to explicitly evaluate each array value individually
  using `ilike`
- Remove unnecessary `await` operators from `then()` functions

## 10.0.2 - 2022-03-02

- Update npms

## 10.0.1 - 2022-02-22

- Update npms
- Update husky to support Apple silicon homebrew package links

## 10.0.0 - 2022-01-07

- Fix populated entities to be QueryResult
- Improve return types when doing partial selects
- Be less restrictive with dependency versions
- Drop node 12 support

## 9.2.4 - 2021-12-28

- Fix PromiseLike signatures. Remove ChainablePromiseLike

## 9.2.3 - 2021-12-27

- Update npms

## 9.2.2 - 2021-12-27

- Fix to always include populate column names in select query
- Use readonly arrays where possible when building sql
- Update npms

## 9.2.1 - 2021-11-16

- Update npms

## 9.2.0 - 2021-11-16

- Update npms
- Add ability to override db pool for `find()` and `findOne()`

## 9.1.6 - 2021-10-29

- Update npms
- Format markdown files

## 9.1.5 - 2021-09-14

- Update npms
- Lint markdown files

## 9.1.4

- Update npms
- Set sourceRoot when transpiling Typescript, to help with sourcemap paths

## 9.1.3

- Fix deprecated faker.js usage

## 9.1.2

- Update npms

## 9.1.1

- Update npms

## 9.1.0

- Add beforeCreate and beforeUpdate static method definitions to Entity.
- Enable typescript lint check: [`noImplicitOverride`](https://www.typescriptlang.org/tsconfig#noImplicitOverride)
- Update npms

## 9.0.2

- Update npms

## 9.0.1

- Update npms
- Add Node.js v16 to CI tests

## 9.0.0

- Drop Node.js 10 support
- Enable consistent indexed object style lint rule

## 8.1.1

- Throw error when trying to populate a one-to-many relationship from `find()` with specific select columns and not including the
  relation column.

## 8.1.0

- Allow chaining `populate()` with `find()` calls :tada:
- Add `UNSAFE_withOriginalFieldType()` helper method to `find()` and `findOne()` to retain the original type for a field.
  This is useful if you have a model field with type `string | Foo` and want to retain the `| Foo` part, instead of
  being forced to strictly `string`.
- Add `UNSAFE_withFieldValue()` helper method to `findOne()` to manually set a field value.

## 8.0.0

- Constrain types for create(), update(), and selects
  - Exclude instance functions and entity collections
  - Only expect `primitive | Pick<T, ‘id’>` when creating, updating, or in where queries, rather than `primitive | T`
- Shape query result types
  - Remove Entity and Entity[] types from property values for find(), findOne(), update(), and destroy() responses
  - Add Entity and Entity[] types when populate is called
- Update npms

**Breaking Change:** The change to create and update values expects a property called `id` on subclasses of `Entity`.

## 7.1.2

- Make sort argument optional for chained calls

## 7.1.1

- Allow sort() argument to be undefined
- Fix object notation for sort() to have properties be optional
- Make `__bigAlEntity` be optional on Entity to avoid undefined errors when using objects as model data

## 7.1.0

- Fix `select` typings for populate() calls
- Changed `Entity` to be an abstract class rather than an interface

NOTE: This is a pretty big breaking change, but v7.0.0 was less than 24h old and was broken, so leaving this as a
minor version change.

## 7.0.0

- Add generic types to select and where. #72 Thanks @krislefeber!
- Add debug environment variable to print sql to console. #73 Thanks @krislefeber!
- Add generic types to returnSelect and sort arguments
- Update npms

## 6.0.2

- Update npms
- Sort union/intersection members

## 6.0.1

- Fix jsdocs for create and update

## 6.0.0

- Update npms
- Change `.destroy()` to not return records by default. Use `.destroy({}, { returnRecords: true })` for previous behavior
- Return `void` instead of `boolean` when not returning records

## 5.0.3

- Update npms

## 5.0.2

- Update npms

## 5.0.1

- Update npms

## 5.0.0

- Update npms
- Use prettier to format files
- Create interfaces for Repository and ReadonlyRepository
- Remove interfaces for RepositoriesByModelName and RepositoriesByModelNameLowered

## 4.1.1

- Update npms
- Use prettier to format files

## 4.1.0

- Fix issues with `like` and array containing null or empty string.
  Specifically support negated array type value with null and empty string.
- Fix `like` constraint with null value

## 4.0.2

- Update npms

## 4.0.1

- Update npms

## 4.0.0

- Tightened up type definitions for "object" to Record<string, unknown> or more strict definition
- Do not return a string from .count() if the number is greater than safe int
- Update npms & fix lint issues

## 3.4.1

- Update npms

## 3.4.0

- Update npms
- Fix jsdoc comments for .populate()

## 3.3.4

- Update npms

## 3.3.3

- Update npms

## 3.3.2

- Update npms

## 3.3.1

- Update npms

## 3.3.0

- Make typescript lint rules more strict
- Update npms

## 3.2.0

- Fix CreateUpdateDelete type to be strict about either returnRecords=false or defined returnSelect
- Update npms

## 3.1.1

- Throw error when invalid propertyName in query projection
- Update npms

## 3.1.0

- Update postgres-pool to v2.0.0
- Update npms

## 3.0.1

- Remove returnSelect requirement when returnRecords=false

## 3.0.0

- Use classes and decorators to define database models
- Allow repositories to be strongly typed to their database model
- Split readonly repository functionality into a separate class from writeable repository functionality

## 2.2.1

- Update npms

## 2.2.0

- Add readonly property to schemas to limit access to create(), update(), destroy() methods
- Update npms

## 2.1.3

- Fix querying array columns with `like` operator
- Add additional array types: string[], integer[], float[], boolean[]

## 2.1.2

- Fix casing issues with generated Repository and SqlHelper
- Revert explicit export of interfaces/classes: Entity, Model, ModelClassesByGlobalId, and Repository

## 2.1.1

- Explicit export of interfaces/classes: Entity, Model, ModelClassesByGlobalId, and Repository

## 2.1.0

- Fix publish path to remove "dist"
- Add type definitions to "dependencies"

## 2.0.8

- Add binary data type

## 2.0.7

- Add additional array types as type for defaultsTo

## 2.0.6

- Add array as type for defaultsTo
- Fix generic type issues due to Typescript 3.5
- Update npms

## 2.0.5

- Allow .findOne(), .find(), .count(), .update(), and .destroy() to be used in an iterable promise (eg. Promise.all())

## 2.0.4

- Fix return type for .findOne(), .find(), .count(), .destroy() to not include `undefined`

## 2.0.3

- Update npm dependencies

## 2.0.2

- Add boolean types as acceptable values for a where clause

## 2.0.1

- Fix case of import module for initialization function

## 2.0.0

- Typescript ftw! The API is the same as BigAl v1.x. BigAl v2 is a rewrite in typescript, to provide strong type support. It should be a drop in update to go to v2.

## 1.2.1

- Use husky to enforce precommit hook for development

## 1.2.0

- Add `connections` property to initialize method
- Use `connection` on model schema to optionally set specific connection pools for each model
- Update dependencies

## 1.1.6

- Update dependencies

## 1.1.5

- Throw exception when find, update, findOne, and destroy queries receive a string parameter instead of object.

## 1.1.4

- Fix: Results for model queries should share the same inherited base

## 1.1.3

- Fix: Querying array types
- Fix: Explicitly cast array values

## 1.1.2

- Fix: Try to convert float and integer column data to numbers when fetching records

## 1.1.1

- Fix: Checking if array column equals an empty array

## 1.1.0

- Allow array values for: like, contains, startsWith, and endsWith

## 1.0.8

- Fix: Prevent trying to save when create() is called with an empty array

## 1.0.7

- Fix: Add additional stack trace data when an exception occurs

## 1.0.6

- Fix: "invalid input syntax for type json" error when setting jsonb column value to an array. See <https://github.com/brianc/node-postgres/issues/442>
- Update npms to latest versions

## 1.0.5

- Fix: AND constraint after an OR constraint caused exception

## 1.0.4

- Fix: Querying date values was not working
- Fix: Querying a property with columnName that is the same as the property name would result in unnecessary sql syntax

## 1.0.3

- Fix: A query with an empty array should return 0 records. Negated queries with empty arrays will return all records.

## 1.0.2

- Organize schemas by case-insensitive global id
- Expose schema attributes collection on model instance
- Expose schema attribute functions as methods for results
- Ensure .count() returns number instead of a string (default data type for bigint)
- Fix queries for empty arrays

## 1.0.1

- Add .count() method

## 1.0.0

- Initial release
