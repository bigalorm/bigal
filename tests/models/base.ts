import { createdAt, serial, text, updatedAt } from '../../src/schema/index.js';

export const modelBase = {
  id: serial().primaryKey(),
};

export const stringIdBase = {
  id: text().primaryKey(),
};

export const timestamps = {
  createdAt: createdAt(),
  updatedAt: updatedAt(),
};
