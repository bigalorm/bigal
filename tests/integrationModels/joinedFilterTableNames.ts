export function getJoinedFilterStoreTable(): string {
  return `bigal_joined_filter_store_${process.pid}`;
}

export function getJoinedFilterProductTable(): string {
  return `bigal_joined_filter_product_${process.pid}`;
}
