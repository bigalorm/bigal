export interface Entity {
  [index: string]: any;

  beforeCreate?: (values: Partial<Entity>) => Partial<Entity> | Promise<Partial<Entity>>;
  beforeUpdate?: (values: Partial<Entity>) => Partial<Entity> | Promise<Partial<Entity>>;
  new(): Entity;
}
