export type LockMode = 'noKeyUpdate' | 'update';

export type LockWait = 'nowait' | 'skipLocked';

export interface LockOptions {
  mode: LockMode;
  wait?: LockWait;
}

export type LockWaitOptions = Omit<LockOptions, 'mode'>;
