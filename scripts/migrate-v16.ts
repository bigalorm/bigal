#!/usr/bin/env npx tsx
/* eslint-disable no-console -- CLI tool requires console output */
/**
 * BigAl v15 → v16 Migration Codemod
 *
 * Converts decorator-based model classes to function-based table() definitions.
 *
 * Usage:
 *   npx tsx scripts/migrate-v16.ts 'src/models/**\/*.ts'
 *   npx tsx scripts/migrate-v16.ts 'src/models/**\/*.ts' --write
 *   npx tsx scripts/migrate-v16.ts --help
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { Project, SyntaxKind } from 'ts-morph';
import type { CallExpression, ClassDeclaration, Decorator, ObjectLiteralExpression, PropertyAssignment, SourceFile } from 'ts-morph';

const COLUMN_TYPE_MAP: Record<string, string> = {
  string: 'text',
  integer: 'integer',
  float: 'float',
  boolean: 'boolean',
  date: 'date',
  datetime: 'timestamptz',
  json: 'jsonb',
  uuid: 'uuid',
  binary: 'bytea',
  'string[]': 'textArray',
  'integer[]': 'integerArray',
  'boolean[]': 'booleanArray',
};

interface ColumnInfo {
  propertyName: string;
  dbColumnName: string | undefined;
  decoratorName: string;
  type: string | undefined;
  required: boolean;
  defaultsTo: string | undefined;
  model: string | undefined;
  collection: string | undefined;
  through: string | undefined;
  via: string | undefined;
}

interface TableInfo {
  className: string;
  tableName: string;
  schema: string | undefined;
  readonly: boolean;
  connection: string | undefined;
  columns: ColumnInfo[];
  baseClass: string | undefined;
  hasBeforeCreate: boolean;
  hasBeforeUpdate: boolean;
  hasInstanceMethods: string[];
}

function getDecoratorArg(decorator: Decorator): ObjectLiteralExpression | undefined {
  const args = decorator.getArguments();
  if (args.length && args[0]?.getKind() === SyntaxKind.ObjectLiteralExpression) {
    return args[0] as ObjectLiteralExpression;
  }
  return undefined;
}

function getStringProperty(obj: ObjectLiteralExpression, name: string): string | undefined {
  const prop = obj.getProperty(name);
  if (prop && prop.getKind() === SyntaxKind.PropertyAssignment) {
    const init = (prop as PropertyAssignment).getInitializer();
    if (init) {
      const propText = init.getText();
      if ((propText.startsWith("'") && propText.endsWith("'")) || (propText.startsWith('"') && propText.endsWith('"'))) {
        return propText.slice(1, -1);
      }
      return propText;
    }
  }
  return undefined;
}

function getBooleanProperty(obj: ObjectLiteralExpression, name: string): boolean {
  const prop = obj.getProperty(name);
  if (prop && prop.getKind() === SyntaxKind.PropertyAssignment) {
    const init = (prop as PropertyAssignment).getInitializer();
    return init?.getText() === 'true';
  }
  return false;
}

function extractTableInfo(classDecl: ClassDeclaration): TableInfo | undefined {
  const tableDecorator = classDecl.getDecorator('table');
  if (!tableDecorator) {
    return undefined;
  }

  const decoratorArg = getDecoratorArg(tableDecorator);
  const tableName = decoratorArg ? (getStringProperty(decoratorArg, 'name') ?? '') : '';
  const schema = decoratorArg ? getStringProperty(decoratorArg, 'schema') : undefined;
  const isReadonly = decoratorArg ? getBooleanProperty(decoratorArg, 'readonly') : false;
  const connection = decoratorArg ? getStringProperty(decoratorArg, 'connection') : undefined;

  const baseClass = classDecl.getExtends()?.getText();
  const columns: ColumnInfo[] = [];
  const instanceMethods: string[] = [];

  for (const prop of classDecl.getProperties()) {
    const columnDec = prop.getDecorator('column');
    const primaryDec = prop.getDecorator('primaryColumn');
    const createDateDec = prop.getDecorator('createDateColumn');
    const updateDateDec = prop.getDecorator('updateDateColumn');
    const versionDec = prop.getDecorator('versionColumn');

    const decorator = columnDec ?? primaryDec ?? createDateDec ?? updateDateDec ?? versionDec;
    if (!decorator) {
      continue;
    }

    const propName = prop.getName();
    const arg = getDecoratorArg(decorator);

    const info: ColumnInfo = {
      propertyName: propName,
      dbColumnName: arg ? getStringProperty(arg, 'name') : undefined,
      decoratorName: decorator.getName(),
      type: arg ? getStringProperty(arg, 'type') : undefined,
      required: arg ? getBooleanProperty(arg, 'required') : false,
      defaultsTo: arg ? getStringProperty(arg, 'defaultsTo') : undefined,
      model: arg ? getStringProperty(arg, 'model') : undefined,
      collection: undefined,
      through: undefined,
      via: arg ? getStringProperty(arg, 'via') : undefined,
    };

    if (arg) {
      const collectionProp = arg.getProperty('collection');
      if (collectionProp && collectionProp.getKind() === SyntaxKind.PropertyAssignment) {
        const init = (collectionProp as PropertyAssignment).getInitializer();
        if (init) {
          info.collection = init.getText();
        }
      }

      const throughProp = arg.getProperty('through');
      if (throughProp && throughProp.getKind() === SyntaxKind.PropertyAssignment) {
        const init = (throughProp as PropertyAssignment).getInitializer();
        if (init) {
          info.through = init.getText();
        }
      }
    }

    columns.push(info);
  }

  for (const method of classDecl.getMethods()) {
    if (!method.isStatic()) {
      instanceMethods.push(method.getName());
    }
  }

  const hasBeforeCreate = classDecl.getStaticMethod('beforeCreate') !== undefined;
  const hasBeforeUpdate = classDecl.getStaticMethod('beforeUpdate') !== undefined;

  return {
    className: classDecl.getName() ?? 'Unknown',
    tableName,
    schema,
    readonly: isReadonly,
    connection,
    columns,
    baseClass,
    hasBeforeCreate,
    hasBeforeUpdate,
    hasInstanceMethods: instanceMethods,
  };
}

function toSnakeCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function extractModelName(expr: string): string {
  // Match arrow functions: () => Foo.name, () => Foo, () => 'Foo'
  const arrowNameMatch = /=>\s*(\w+)\.name\b/.exec(expr);
  if (arrowNameMatch) {
    return arrowNameMatch[1]!;
  }

  const arrowIdentMatch = /=>\s*(\w+)\s*[,)]?$/.exec(expr);
  if (arrowIdentMatch) {
    return arrowIdentMatch[1]!;
  }

  const arrowStringMatch = /=>\s*['"](\w+)['"]/.exec(expr);
  if (arrowStringMatch) {
    return arrowStringMatch[1]!;
  }

  // Plain string: strip quotes
  const stripped = expr.replace(/['"]/g, '');
  return capitalize(stripped);
}

function generateColumnBuilder(col: ColumnInfo): string {
  const derivedDbName = toSnakeCase(col.propertyName);
  const explicitDbName = col.dbColumnName && col.dbColumnName !== derivedDbName ? col.dbColumnName : undefined;

  if (col.decoratorName === 'createDateColumn') {
    return explicitDbName ? `createdAt({ name: '${explicitDbName}' })` : 'createdAt()';
  }
  if (col.decoratorName === 'updateDateColumn') {
    return explicitDbName ? `updatedAt({ name: '${explicitDbName}' })` : 'updatedAt()';
  }
  if (col.decoratorName === 'versionColumn') {
    return 'integer().version()';
  }
  if (col.model) {
    const modelName = extractModelName(col.model);
    const derivedFk = `${toSnakeCase(col.propertyName)}_id`;
    const explicitFk = col.dbColumnName && col.dbColumnName !== derivedFk ? col.dbColumnName : undefined;
    return explicitFk ? `belongsTo('${modelName}', '${explicitFk}')` : `belongsTo('${modelName}')`;
  }
  if (col.collection) {
    let result = `hasMany('${extractModelName(col.collection)}')`;
    if (col.through) {
      result += `.through('${extractModelName(col.through)}')`;
    }
    if (col.via) {
      result += `.via('${col.via}')`;
    }
    return result;
  }
  if (col.decoratorName === 'primaryColumn') {
    const builderFn = col.type ? (COLUMN_TYPE_MAP[col.type] ?? 'text') : 'serial';
    if (builderFn === 'serial') {
      return 'serial().primaryKey()';
    }
    return explicitDbName ? `${builderFn}({ name: '${explicitDbName}' }).primaryKey()` : `${builderFn}().primaryKey()`;
  }

  const builderFn = col.type ? (COLUMN_TYPE_MAP[col.type] ?? 'text') : 'text';
  let result = explicitDbName ? `${builderFn}({ name: '${explicitDbName}' })` : `${builderFn}()`;
  if (col.required) {
    result += '.notNull()';
  }
  if (col.defaultsTo !== undefined) {
    result += `.default(${col.defaultsTo})`;
  }
  return result;
}

function generateTableDefinition(info: TableInfo): string {
  const lines: string[] = [];
  const varName = info.className;
  const fn = info.readonly ? 'view' : 'table';

  const options: string[] = [];
  if (info.schema) {
    options.push(`schema: '${info.schema}'`);
  }
  if (info.connection) {
    options.push(`connection: '${info.connection}'`);
  }
  if (info.hasBeforeCreate || info.hasBeforeUpdate) {
    options.push('hooks: { /* TODO: migrate beforeCreate/beforeUpdate hooks */ }');
  }

  const optionsStr = options.length ? `, { ${options.join(', ')} }` : '';

  lines.push(`export const ${varName} = ${fn}('${info.tableName}', {`);

  if (info.baseClass && info.baseClass !== 'Entity') {
    lines.push('  ...modelBase,');
  }

  for (const col of info.columns) {
    lines.push(`  ${col.propertyName}: ${generateColumnBuilder(col)},`);
  }

  lines.push(`}${optionsStr});`);

  if (info.hasInstanceMethods.length) {
    lines.push('');
    for (const method of info.hasInstanceMethods) {
      lines.push(`// TODO: manual migration needed — instance method '${method}' removed (use afterFind hook or .map())`);
    }
  }

  return lines.join('\n');
}

function generateImports(tableInfos: TableInfo[]): string {
  const builders = new Set<string>();
  builders.add('table');

  for (const tableInfo of tableInfos) {
    for (const col of tableInfo.columns) {
      if (col.decoratorName === 'createDateColumn') {
        builders.add('createdAt');
        continue;
      }
      if (col.decoratorName === 'updateDateColumn') {
        builders.add('updatedAt');
        continue;
      }
      if (col.model) {
        builders.add('belongsTo');
        continue;
      }
      if (col.collection) {
        builders.add('hasMany');
        continue;
      }
      if (col.decoratorName === 'primaryColumn') {
        const fn = col.type ? (COLUMN_TYPE_MAP[col.type] ?? 'text') : 'integer';
        builders.add(fn);
        continue;
      }
      const fn = col.type ? (COLUMN_TYPE_MAP[col.type] ?? 'text') : 'text';
      builders.add(fn);
    }
  }

  // Use 'serial' for integer primary keys by default
  if (tableInfos.some((tableInfo) => tableInfo.columns.some((col) => col.decoratorName === 'primaryColumn' && (!col.type || col.type === 'integer')))) {
    builders.add('serial');
  }

  // Add view() if any readonly models
  if (tableInfos.some((tableInfo) => tableInfo.readonly)) {
    builders.add('view');
  }

  const sorted = [...builders].sort();
  return `import { ${sorted.join(', ')} } from 'bigal';`;
}

/**
 * Strips `.toJSON()` calls from query chains.
 * Results are always plain objects in v16, so `.toJSON()` is unnecessary.
 * Returns the number of calls removed.
 * @param {object} sourceFile
 */
function stripToJSON(sourceFile: SourceFile): number {
  let removedCount = 0;

  // Find all .toJSON() call expressions and remove them from chains
  // We iterate in reverse to avoid position shifts from earlier edits
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  const toJsonCalls: CallExpression[] = [];

  for (const call of callExpressions) {
    const expression = call.getExpression();
    if (expression.getKind() === SyntaxKind.PropertyAccessExpression) {
      const propAccess = expression.asKind(SyntaxKind.PropertyAccessExpression);
      if (propAccess?.getName() === 'toJSON' && call.getArguments().length === 0) {
        toJsonCalls.push(call);
      }
    }
  }

  // Process in reverse order to preserve positions
  for (const call of toJsonCalls.reverse()) {
    const propAccess = call.getExpression().asKind(SyntaxKind.PropertyAccessExpression)!;
    const receiver = propAccess.getExpression();
    call.replaceWithText(receiver.getText());
    removedCount++;
  }

  return removedCount;
}

function collectNonModelStatements(sourceFile: SourceFile): string[] {
  const modelClassNames = new Set<string>();
  for (const cls of sourceFile.getClasses()) {
    if (cls.getDecorator('table')) {
      modelClassNames.add(cls.getName() ?? '');
    }
  }

  const preserved: string[] = [];
  for (const statement of sourceFile.getStatements()) {
    // Skip import declarations (we generate new ones)
    if (statement.getKind() === SyntaxKind.ImportDeclaration) {
      continue;
    }

    // Skip model classes (converted to table() calls)
    if (statement.getKind() === SyntaxKind.ClassDeclaration) {
      const cls = statement as ClassDeclaration;
      if (modelClassNames.has(cls.getName() ?? '')) {
        continue;
      }
    }

    preserved.push(statement.getText());
  }

  return preserved;
}

function processFile(sourceFile: SourceFile): string | undefined {
  const classes = sourceFile.getClasses();
  const fileTableInfos: TableInfo[] = [];

  for (const cls of classes) {
    const info = extractTableInfo(cls);
    if (info) {
      fileTableInfos.push(info);
    }
  }

  if (!fileTableInfos.length) {
    return undefined;
  }

  const lines: string[] = [];

  lines.push(generateImports(fileTableInfos));
  lines.push('');

  const hasBase = fileTableInfos.some((tableInfo) => tableInfo.baseClass && tableInfo.baseClass !== 'Entity');
  if (hasBase) {
    lines.push('// TODO: define shared base columns (extracted from base class)');
    lines.push('// const modelBase = { id: serial().primaryKey() };');
    lines.push('');
  }

  for (const tableInfo of fileTableInfos) {
    lines.push(generateTableDefinition(tableInfo));
    lines.push('');
  }

  // Preserve non-model exports (types, interfaces, enums, standalone functions)
  const preserved = collectNonModelStatements(sourceFile);
  if (preserved.length) {
    lines.push('// Preserved non-model exports');
    for (const stmt of preserved) {
      lines.push(stmt);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function printHelp(): void {
  console.log(`BigAl v15 → v16 Migration Codemod

Usage:
  npx tsx scripts/migrate-v16.ts [glob] [options]

Arguments:
  glob        File pattern to process (default: 'src/models/**/*.ts')

Options:
  --write     Modify files in place (default: dry-run to stdout)
  --help      Show this help message

Examples:
  npx tsx scripts/migrate-v16.ts 'src/models/**/*.ts'
  npx tsx scripts/migrate-v16.ts 'src/models/Product.ts' --write
`);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    printHelp();
    return;
  }

  const writeMode = args.includes('--write');
  const glob = args.find((arg) => !arg.startsWith('--')) ?? 'src/models/**/*.ts';

  const tsconfigPath = resolve(process.cwd(), 'tsconfig.json');
  const project = new Project({
    tsConfigFilePath: existsSync(tsconfigPath) ? tsconfigPath : undefined,
    skipAddingFilesFromTsConfig: true,
  });

  project.addSourceFilesAtPaths(glob);
  const sourceFiles = project.getSourceFiles();

  if (!sourceFiles.length) {
    console.log(`No files found matching: ${glob}`);
    return;
  }

  let convertedCount = 0;
  let skippedCount = 0;
  let toJsonRemovedCount = 0;

  for (const sourceFile of sourceFiles) {
    const toJsonRemoved = stripToJSON(sourceFile);
    if (toJsonRemoved > 0) {
      toJsonRemovedCount += toJsonRemoved;
      if (writeMode) {
        sourceFile.saveSync();
        console.log(`  stripped ${toJsonRemoved} .toJSON() call(s): ${sourceFile.getFilePath()}`);
      } else {
        console.log(`=== ${sourceFile.getFilePath()} — ${toJsonRemoved} .toJSON() call(s) to remove ===`);
      }
    }

    const result = processFile(sourceFile);
    if (result) {
      convertedCount++;
      if (writeMode) {
        sourceFile.replaceWithText(result);
        sourceFile.saveSync();
        console.log(`  converted: ${sourceFile.getFilePath()}`);
      } else {
        console.log(`=== ${sourceFile.getFilePath()} ===`);
        console.log(result);
        console.log('');
      }
    } else {
      skippedCount++;
    }
  }

  console.log(`\nSummary: ${convertedCount} model(s) converted, ${skippedCount} skipped, ${toJsonRemovedCount} .toJSON() call(s) stripped`);
  if (!writeMode && (convertedCount || toJsonRemovedCount)) {
    console.log('Run with --write to apply changes.');
  }
}

main();
