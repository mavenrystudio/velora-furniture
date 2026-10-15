export type Product = {
  id: string;
  checkoutProductId?: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  imageAlt: string;
  color: string;
  badge?: string;
  featured?: boolean;
};

export type CartLine = { product: Product; quantity: number };
