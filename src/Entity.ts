export abstract class Entity {
  public beforeCreate(values: Partial<Entity>): Partial<Entity> | Promise<Partial<Entity>> {
    return values;
  }
  public beforeUpdate(values: Partial<Entity>): Partial<Entity> | Promise<Partial<Entity>> {
    return values;
  }
}
