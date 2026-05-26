export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
};

export type CartItem = {
  key: string;
  product: CartProduct;
  quantity: number;
  colors: string[];
};

export function cartItemKey(productId: string, colors: string[]) {
  return `${productId}:${[...colors].sort().join("|") || "blank"}`;
}
