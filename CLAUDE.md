# CLAUDE.md

This file provides guidance for Claude Code when working on the BigAl project.

## Project Overview

BigAl is a type-safe PostgreSQL ORM for Node.js/TypeScript. It uses a fluent builder pattern for queries and provides strongly-typed results.

## Build and Test Commands

```bash
npm run build    # Build the project using unbuild
npm test         # Run all tests with Mocha
npm run lint     # Run ESLint and markdownlint
npx tsc --noEmit # Type-check without emitting files
```

## Code Style Guidelines

## Required Skills

Always invoke the following skills when editing files:

- `/enforcing-typescript-standards` - When creating or modifying `.ts` files

### Naming Conventions

- Use self-descriptive names for variables, functions, parameters, and types
- Avoid single-letter variables or abbreviations (use `maxRows` instead of `n`, `parentSubquery` instead of `subquery` when shadowing)
- Class names should be PascalCase
- Functions, methods, and variables should be camelCase
- Constants should be SCREAMING_SNAKE_CASE

### Comments

- Only add comments when they provide meaningful insight that cannot be inferred from self-describing code
- Remove or refine unnecessary comments
- JSDoc is acceptable for public API documentation

### TypeScript Practices

- Avoid using the `as` keyword for type assertions unless absolutely necessary
- Prefer type inference where possible
- Use generic type parameters to narrow types rather than casting (e.g., `max<K extends keyof T>(column: K): T[K]`)
- Never disable linter rules unless there is no other option - it should be a last resort

### Linting and JSDoc

- All linting errors and warnings must be resolved, including JSDoc issues
- Use restraint with examples in JSDoc comments. Only provide an example if usage is unclear.
- Ensure JSDoc tags are properly escaped if referencing decorators (use backticks or escape with backslash)

### Code Organization

- Don't create interfaces unnecessarily - if a class can serve as both implementation and type, the interface is redundant
- Split classes into separate files only when needed to comply with linter rules

## Architecture Patterns

### Repository Pattern

Repositories provide CRUD operations with type-safe query building:

- `IReadonlyRepository<T>` - read operations (find, findOne, count)
- `IRepository<T>` - full CRUD operations

### Query Building

Queries use a fluent builder pattern with immutable state:

- Each method returns a new instance (clone pattern)
- Methods chain naturally: `.where({...}).sort('name').limit(10)`
- Queries are `PromiseLike` for automatic execution

### SQL Generation

- `SqlHelper.ts` handles all SQL string generation
- Use parameterized queries (`$1`, `$2`, etc.) to prevent SQL injection
- The `buildWhere()` function recursively processes WHERE clause objects

## Testing Conventions

- Tests are in `tests/` directory with `.tests.ts` suffix
- Use Mocha with Chai assertions
- Test file structure mirrors source structure
- Repository tests use a shared setup with `repositoriesByModelNameLowered`
- When test infrastructure types are too generic, type assertions are acceptable
