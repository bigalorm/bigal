import { table } from '../../src/index.js';

import { Store } from './Store.js';

@table({ name: 'remote_stores', connection: 'secondary' })
export class RemoteStore extends Store {}
