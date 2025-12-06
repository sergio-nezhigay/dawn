import React from 'react';
import { Star, Plus } from 'lucide-react';

export interface ProductSummary {
  id: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  rating: number;
  reviewCount: number;
}

interface ProductListSectionProps {
  title: string;
  products: ProductSummary[];
}

export const ProductListSection: React.FC<ProductListSectionProps> = ({ title, products }) => {
  return (
    <div className="mt-16 font-sans border-t border-gray-200 pt-8">
      <h3 className="text-2xl font-bold text-[#2e2f32] mb-6 font-display uppercase tracking-wide px-1">{title}</h3>
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-8 px-1 scrollbar-hide snap-x touch-pan-x">
            {products.map(product => (
            /* Card Container: Lift on hover with easing */
            <div key={product.id} className="min-w-[180px] w-[180px] md:min-w-[220px] md:w-[220px] flex-shrink-0 bg-white border border-gray-200 rounded-xl p-4 snap-start 
              hover:shadow-xl hover:-translate-y-1 hover:border-blue-200
              transition-all duration-300 ease-out cursor-pointer flex flex-col group">
                
                <div className="aspect-square relative mb-4 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden p-2">
                    <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300 ease-out" />
                </div>
                <div className="flex-1 flex flex-col">
                    <div className="flex items-baseline gap-1 mb-2">
                        <span className="font-bold text-xl text-[#2e2f32] font-display">{product.price.toLocaleString('uk-UA')}</span>
                        <span className="text-xs font-bold text-gray-500">{product.currency}</span>
                    </div>
                    <h4 className="text-sm text-gray-700 leading-snug mb-2 line-clamp-2 group-hover:text-[#0071dc] transition-colors duration-200 h-[2.5em]">{product.title}</h4>
                    <div className="flex items-center gap-1 mt-auto mb-3">
                        <div className="flex text-[#ffc220]">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={12} fill={i < Math.floor(product.rating) ? "currentColor" : "none"} className={i >= Math.floor(product.rating) ? "text-gray-300" : ""} />
                            ))}
                        </div>
                        <span className="text-xs text-gray-400 font-medium">({product.reviewCount})</span>
                    </div>
                    {/* Add Button: Outline to Solid transition, plus tactile click */}
                    <button className="w-full border-2 border-[#0071dc] rounded-full py-1.5 text-sm font-bold text-[#0071dc] 
                      hover:bg-[#0071dc] hover:text-white 
                      active:scale-95 active:bg-[#005bb5] active:border-[#005bb5]
                      transition-all duration-200 ease-out flex items-center justify-center gap-1">
                        <Plus size={14} strokeWidth={3} />
                        <span>Додати</span>
                    </button>
                </div>
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};