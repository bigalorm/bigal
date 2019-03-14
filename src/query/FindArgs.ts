import { FindOneArgs } from './FindOneArgs';

export interface FindArgs extends FindOneArgs {
  skip?: number;
  limit?: number;
}
