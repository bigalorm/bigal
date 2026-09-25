export type LockMode = 'keyShare' | 'noKeyUpdate' | 'share' | 'update';

export type LockWait = 'nowait' | 'skipLocked';

export interface LockWaitOptions {
  wait?: LockWait;
}

export interface LockOptions extends LockWaitOptions {
  mode: LockMode;
}
