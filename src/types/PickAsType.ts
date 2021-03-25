export type PickAsType<T, K extends keyof T, TValue> = {
  [P in K]: Extract<T[P], TValue>;
};
