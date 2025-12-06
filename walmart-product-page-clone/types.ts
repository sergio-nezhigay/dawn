export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  text: string;
  verified: boolean;
}

export interface Product {
  id: string;
  title: string;
  brand: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  sizes: string[];
  images: string[];
  description: string;
  specifications: Record<string, string>;
  reviews: Review[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
