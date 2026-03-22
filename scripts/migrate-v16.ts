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
import type { ClassDeclaration, Decorator, ObjectLiteralExpression, PropertyAssignment, SourceFile } from 'ts-morph';

const COLUMN_TYPE_MAP: Record<string, string> = {
  string: 'text',
  integer: 'integer',
  float: 'real',
  boolean: 'booleanColumn',
  date: 'dateColumn',
  datetime: 'timestamptz',
  json: 'jsonb',
  uuid: 'uuid',
  binary: 'bytea',
  'string[]': 'textArray',
  'integer[]': 'integerArray',
  'boolean[]': 'booleanArray',
  'float[]': 'realArray',
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
  const arrowMatch = /=>\s*(\w+)\.name/.exec(expr);
  if (arrowMatch) {
    return arrowMatch[1]!;
  }
  const stripped = expr.replace(/['"]/g, '');
  return capitalize(stripped);
}

function generateColumnBuilder(col: ColumnInfo): string {
  const dbName = col.dbColumnName ?? toSnakeCase(col.propertyName);

  if (col.decoratorName === 'createDateColumn') {
    return `createdAt('${dbName}')`;
  }
  if (col.decoratorName === 'updateDateColumn') {
    return `updatedAt('${dbName}')`;
  }
  if (col.decoratorName === 'versionColumn') {
    return `integer('${dbName}').notNull() // TODO: version column`;
  }
  if (col.model) {
    return `belongsTo(() => tables.${capitalize(col.model)}!, '${dbName}')`;
  }
  if (col.collection) {
    let result = `hasMany(() => tables.${extractModelName(col.collection)}!)`;
    if (col.through) {
      result += `.through(() => tables.${extractModelName(col.through)}!)`;
    }
    if (col.via) {
      result += `.via('${col.via}')`;
    }
    return result;
  }
  if (col.decoratorName === 'primaryColumn') {
    const builderFn = col.type ? (COLUMN_TYPE_MAP[col.type] ?? 'text') : 'integer';
    return `${builderFn}('${dbName}').primaryKey()`;
  }

  const builderFn = col.type ? (COLUMN_TYPE_MAP[col.type] ?? 'text') : 'text';
  let result = `${builderFn}('${dbName}')`;
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
  const schemaVar = `${info.className.charAt(0).toLowerCase() + info.className.slice(1)}Schema`;

  lines.push(`const ${schemaVar} = {`);

  if (info.baseClass && info.baseClass !== 'Entity') {
    lines.push('  ...modelBase,');
  }

  for (const col of info.columns) {
    lines.push(`  ${col.propertyName}: ${generateColumnBuilder(col)},`);
  }

  lines.push('};');
  lines.push('');

  const options: string[] = [];
  if (info.schema) {
    options.push(`schema: '${info.schema}'`);
  }
  if (info.readonly) {
    options.push('readonly: true');
  }
  if (info.connection) {
    options.push(`connection: '${info.connection}'`);
  }
  if (info.hasBeforeCreate || info.hasBeforeUpdate) {
    options.push('hooks: { /* TODO: migrate beforeCreate/beforeUpdate hooks */ }');
  }

  const optionsStr = options.length ? `, { ${options.join(', ')} }` : '';
  const varName = info.className;

  lines.push(`const ${varName} = table('${info.tableName}', ${schemaVar}${optionsStr});`);
  lines.push(`tables.${varName} = ${varName};`);
  lines.push('');
  lines.push(`type ${varName}Select = InferSelect<typeof ${schemaVar}>;`);
  lines.push(`type ${varName}Insert = InferInsert<typeof ${schemaVar}>;`);

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

  const sorted = [...builders].sort();
  return `import { ${sorted.join(', ')} } from 'bigal';\nimport type { InferInsert, InferSelect, TableDefinition } from 'bigal';`;
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
  lines.push('// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry for circular references');
  lines.push('const tables: Record<string, TableDefinition<any, any>> = {};');
  lines.push('');

  const hasBase = fileTableInfos.some((tableInfo) => tableInfo.baseClass && tableInfo.baseClass !== 'Entity');
  if (hasBase) {
    lines.push('// TODO: define shared base columns (extracted from base class)');
    lines.push("// const modelBase = { id: serial('id').primaryKey() };");
    lines.push('');
  }

  for (const tableInfo of fileTableInfos) {
    lines.push(generateTableDefinition(tableInfo));
    lines.push('');
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

  for (const sourceFile of sourceFiles) {
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

  console.log(`\nSummary: ${convertedCount} converted, ${skippedCount} skipped`);
  if (!writeMode && convertedCount) {
    console.log('Run with --write to apply changes.');
  }
}

main();
