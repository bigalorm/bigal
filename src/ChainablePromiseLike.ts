export interface ChainablePromiseLike<TResult> {
  then<TRejectResult = never>(resolve: (value: TResult) => PromiseLike<TResult> | TResult, reject: (error: Error) => PromiseLike<TRejectResult> | TRejectResult): Promise<TRejectResult | TResult>;
  then(resolve: (value: TResult) => PromiseLike<TResult> | TResult, reject: (error: Error) => PromiseLike<void> | void): Promise<TResult>;
}
