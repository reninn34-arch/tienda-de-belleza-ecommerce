export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  badge?: string; // Optional badge like "Top Rated" or "Pro Kit"
  features?: string[];
}

export interface CartItem extends Product {
  quantity: number;
}
