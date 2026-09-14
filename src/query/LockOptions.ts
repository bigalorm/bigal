export type LockMode = 'noKeyUpdate' | 'update';

export type LockWait = 'nowait' | 'skipLocked';

export interface LockWaitOptions {
  wait?: LockWait;
}

export interface LockOptions extends LockWaitOptions {
  mode: LockMode;
}
