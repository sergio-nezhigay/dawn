import React from 'react';
import { Product } from '../types';
import { Star } from 'lucide-react';

interface ReviewsProps {
  product: Product;
}

export const Reviews: React.FC<ReviewsProps> = ({ product }) => {
  return (
    <div id="reviews" className="mt-12 bg-white rounded-xl border border-gray-200 p-8 shadow-sm font-sans">
      <h2 className="text-3xl font-bold mb-8 font-display uppercase tracking-wide text-[#001e3c] flex items-center gap-3">
        <Star className="text-[#ffc220]" fill="currentColor" size={32} /> Відгуки та Рейтинг
      </h2>
      
      <div>
        {/* Review List */}
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-gray-200 pb-6 gap-4">
            <h3 className="font-bold text-[#001e3c] font-display uppercase text-base tracking-wider">Останні відгуки</h3>
            <select className="text-base border-gray-300 border rounded-lg p-3 bg-white text-gray-900 outline-none focus:border-[#0071dc] focus:ring-1 focus:ring-[#0071dc] hover:border-gray-400 transition-colors duration-200">
               <option>Найкорисніші</option>
               <option>Спочатку нові</option>
               <option>Спочатку старі</option>
               <option>З високою оцінкою</option>
            </select>
          </div>
          
          <div className="space-y-10">
            {product.reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-200 pb-8 last:border-0 last:pb-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                  <h4 className="font-bold text-lg text-[#001e3c] uppercase tracking-wide">{review.title}</h4>
                  <span className="text-base text-gray-600 font-medium">{review.date}</span>
                </div>
                
                <div className="flex text-[#ffc220] mb-4">
                   {[...Array(5)].map((_, i) => (
                    <Star key={i} size={20} fill={i < review.rating ? "currentColor" : "none"} className={i >= review.rating ? "text-gray-300" : ""} />
                  ))}
                </div>
                
                {/* Body text: 16px, Leading Loose (2.0) for max readability */}
                <p className="text-base text-gray-800 mb-5 leading-relaxed">{review.text}</p>
                
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-700 border border-gray-300">
                      {review.author.charAt(0)}
                   </div>
                   <span className="text-base text-[#001e3c] font-bold">{review.author}</span>
                   {review.verified && (
                     <span className="text-sm text-green-800 bg-green-50 border border-green-200 px-3 py-1 rounded-md font-bold flex items-center gap-2">
                        <Check size={14} strokeWidth={3} /> Verified Purchase
                     </span>
                   )}
                </div>
              </div>
            ))}
          </div>
          
           <button className="mt-10 text-lg font-bold text-[#0071dc] hover:text-[#005bb5] flex items-center gap-2 group font-display uppercase tracking-wide transition-colors duration-200">
             Дивитись всі {product.reviewCount} відгуків <span className="group-hover:translate-x-1 transition-transform duration-200 ease-out">→</span>
           </button>
        </div>
      </div>
    </div>
  );
};

function Check({ size = 16, className = "", strokeWidth = 2 }: { size?: number, className?: string, strokeWidth?: number }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"></polyline></svg>;
}