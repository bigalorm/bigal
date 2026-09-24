import { EventEmitter } from 'node:events';

import { describe, expect, it, vi } from 'vitest';

import { initialize, transaction, type TransactionConnection, type TransactionPool } from '../src/index.js';

import { Category, Product, ProductCategory, Store } from './models/index.js';
import { getQueryResult, type PoolQuery } from './utils/pool.js';

function createConnectionHarness() {
  const events = new EventEmitter();
  const connection = {
    query: vi.fn<PoolQuery>().mockResolvedValue(getQueryResult()),
    release: vi.fn<(removeConnection?: boolean) => Promise<void>>().mockResolvedValue(undefined),
    on: events.on.bind(events),
    removeListener: events.removeListener.bind(events),
  };
  const pool = {
    query: vi.fn<PoolQuery>(),
    connect: vi.fn<() => Promise<TransactionConnection>>().mockResolvedValue(connection as TransactionConnection),
  };

  return { events, connection, pool: pool as TransactionPool & typeof pool };
}

describe('managed connection errors', () => {
  it('captures a fatal client event, closes the scope, and discards the connection', async () => {
    const { events, connection, pool } = createConnectionHarness();
    const connectionError = new Error('terminating connection due to idle-in-transaction timeout');

    const operation = transaction({ pool, repositories: {} }, async (scope) => {
      expect(() => events.emit('error', connectionError)).not.toThrow();
      await expect(scope.query('SELECT 1')).rejects.toBe(connectionError);
      events.emit('error', new Error('subsequent connection error'));
      return 'must not commit';
    });

    await expect(operation).rejects.toBe(connectionError);
    expect(connection.query.mock.calls.map(([query]) => query)).toStrictEqual(['BEGIN', 'ROLLBACK']);
    expect(connection.release).toHaveBeenCalledExactlyOnceWith(true);
    expect(events.listenerCount('error')).toBe(0);
  });

  it.each(['raw', 'repository'])('preserves the fatal error when a subsequent %s query rejects the callback', async (queryType) => {
    const { events, connection, pool } = createConnectionHarness();
    const repositories = initialize({ models: [Category, Product, ProductCategory, Store], pool });
    const connectionError = Object.assign(new Error('terminating connection due to idle-in-transaction timeout'), { code: '25P03' });

    const operation = transaction({ pool, repositories }, async (scope) => {
      events.emit('error', connectionError);
      return queryType === 'raw' ? scope.query('SELECT 1') : scope.repositories.Store!.findOne({ id: 1 });
    });

    await expect(operation).rejects.toBe(connectionError);
    expect(connection.query.mock.calls.map(([query]) => query)).toStrictEqual(['BEGIN', 'ROLLBACK']);
    expect(connection.release).toHaveBeenCalledExactlyOnceWith(true);
    expect(events.listenerCount('error')).toBe(0);
  });

  it('listens during transaction setup and never calls the callback after a fatal event', async () => {
    const { events, connection, pool } = createConnectionHarness();
    const connectionError = new Error('connection lost during setup');
    const callback = vi.fn<() => void>();
    connection.query.mockImplementationOnce(() => {
      events.emit('error', connectionError);
      return Promise.resolve(getQueryResult());
    });

    await expect(transaction({ pool, repositories: {} }, callback)).rejects.toBe(connectionError);
    expect(callback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledExactlyOnceWith(true);
    expect(events.listenerCount('error')).toBe(0);
  });

  it('keeps the listener through rollback and release while preserving the callback error', async () => {
    const { events, connection, pool } = createConnectionHarness();
    const callbackError = new Error('callback failed');
    connection.query.mockResolvedValueOnce(getQueryResult()).mockImplementationOnce(() => {
      events.emit('error', new Error('connection lost during rollback'));
      return Promise.resolve(getQueryResult());
    });
    connection.release.mockImplementationOnce(() => {
      expect(events.listenerCount('error')).toBe(1);
      events.emit('error', new Error('connection lost during release'));
      return Promise.resolve();
    });

    await expect(
      transaction({ pool, repositories: {} }, () => {
        throw callbackError;
      }),
    ).rejects.toBe(callbackError);
    expect(connection.release).toHaveBeenCalledExactlyOnceWith(true);
    expect(events.listenerCount('error')).toBe(0);
  });

  it('removes only its own listener after each successful use of a connection', async () => {
    const { events, connection, pool } = createConnectionHarness();
    const applicationListener = vi.fn<(error: Error) => void>();
    events.on('error', applicationListener);
    connection.release.mockImplementation(() => {
      expect(events.listenerCount('error')).toBe(2);
      return Promise.resolve();
    });

    await transaction({ pool, repositories: {} }, () => 1);
    await transaction({ pool, repositories: {} }, () => 2);

    expect(events.listeners('error')).toStrictEqual([applicationListener]);
    expect(connection.release).toHaveBeenNthCalledWith(1, false);
    expect(connection.release).toHaveBeenNthCalledWith(2, false);
  });

  it('removes the listener even when connection release fails', async () => {
    const { events, connection, pool } = createConnectionHarness();
    connection.release.mockRejectedValueOnce(new Error('release failed'));

    await expect(transaction({ pool, repositories: {} }, () => undefined)).rejects.toThrow('committed, but releasing');
    expect(events.listenerCount('error')).toBe(0);
  });
});
