export interface CartLine {
  productId: number;
  name: string;
  sku: string;
  basePrice: number; // price in the store's base currency
  quantity: number;
  discount: number; // discount in base currency, per line
  maxQuantity: number;
}
