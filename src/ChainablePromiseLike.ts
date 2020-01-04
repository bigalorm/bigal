export interface ChainablePromiseLike<TResult> {
  then<TRejectResult = never>(resolve: (value: TResult) => TResult | PromiseLike<TResult>, reject: (error: Error) => TRejectResult | PromiseLike<TRejectResult>): Promise<TResult | TRejectResult>;
  then(resolve: (value: TResult) => TResult | PromiseLike<TResult>, reject: (error: Error) => void | PromiseLike<void>): Promise<TResult>;
}
