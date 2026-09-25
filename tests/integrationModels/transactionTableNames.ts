export function getAccountTable(): string {
  return `bigal_transaction_account_${process.pid}`;
}

export function getItemTable(): string {
  return `bigal_transaction_item_${process.pid}`;
}
