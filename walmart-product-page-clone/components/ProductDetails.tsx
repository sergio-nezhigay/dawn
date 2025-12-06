import React from 'react';
import { Product } from '../types';
import { Star, Truck, ShieldCheck, Share2, CreditCard } from 'lucide-react';

interface ProductDetailsProps {
  product: Product;
  onAskQuestion: () => void;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ product }) => {
  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* Brand and Title */}
      <div>
        <a href="#" className="text-base font-bold text-[#0071dc] hover:text-[#005bb5] hover:underline mb-3 inline-block tracking-wide uppercase transition-colors duration-200">
          {product.brand}
        </a>
        {/* Fixed Font: Chakra Petch for Title - Reduced sizes */}
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#2e2f32] leading-[1.2] font-display uppercase tracking-wide">
          {product.title}
        </h1>
      </div>

      {/* Ratings & Meta - Increased size and contrast */}
      <div className="flex items-center gap-4 text-base border-b border-gray-200 pb-6">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl font-display text-[#2e2f32]">{product.rating}</span>
          <div className="flex text-[#ffc220]">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={20} fill={i < Math.floor(product.rating) ? "currentColor" : "none"} className={i >= Math.floor(product.rating) ? "text-gray-300" : ""} />
            ))}
          </div>
        </div>
        <span className="text-gray-400 text-lg">|</span>
        <a href="#reviews" className="underline decoration-gray-400 hover:text-[#0071dc] hover:decoration-[#0071dc] transition-all duration-200 font-medium text-gray-700 text-base">
          {product.reviewCount} відгуків
        </a>
      </div>

      {/* Price Section */}
      <div className="bg-gray-50 p-6 -mx-4 md:mx-0 rounded-xl border border-gray-200">
        <div className="flex items-baseline gap-2">
          {/* Fixed Font: Chakra Petch for Price - Reduced size */}
          <span className="text-4xl lg:text-5xl font-bold text-[#001e3c] font-display">
            {product.price.toLocaleString('uk-UA')}
          </span>
          <span className="text-2xl font-semibold text-gray-700 font-display">
            {product.currency}
          </span>
        </div>
        
        {/* Credit/Installment Badge - High Contrast, Larger Text */}
        <div className="mt-4 flex items-center gap-3">
           <span className="bg-[#ffc220] text-[#001e3c] text-sm font-bold px-3 py-1.5 rounded-md uppercase tracking-wider">Супер ціна</span>
           <span className="text-base text-green-800 font-bold flex items-center gap-2">
             <span className="w-2.5 h-2.5 rounded-full bg-green-600"></span> Є в наявності
           </span>
        </div>
      </div>

      {/* Actions - Large Touch Targets (48px+) */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex gap-4 h-14">
            {/* Primary Button: Lift on Hover, Squish on Click */}
            <button className="flex-1 bg-[#ffc220] text-[#001e3c] font-bold rounded-full text-lg shadow-sm flex items-center justify-center gap-2 uppercase tracking-wide font-display 
              hover:bg-[#ffe066] hover:-translate-y-0.5 hover:shadow-lg 
              active:translate-y-0 active:scale-[0.98] active:shadow-sm 
              transition-all duration-200 ease-out">
               Купити
            </button>
            
            {/* Secondary Button: Border darken, Squish on Click */}
            <button className="w-14 h-14 border-2 border-gray-300 rounded-full text-gray-700 flex items-center justify-center
              hover:border-gray-500 hover:bg-gray-50 hover:text-gray-900
              active:scale-90 active:bg-gray-100
              transition-all duration-200 ease-out">
               <Share2 size={26} />
            </button>
        </div>
      </div>

      {/* Fulfillment / Shipping - Base size 16px, relaxed leading */}
      <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
         <div className="p-6 space-y-6">
            <div className="flex items-start gap-4">
                <Truck className="text-gray-600 mt-1 shrink-0" size={24} />
                <div>
                    <span className="block font-bold text-[#001e3c] text-base mb-1">Доставка</span>
                    <p className="text-gray-700 text-base leading-relaxed">
                      Нова Пошта (у відділення, поштомат або кур'єром на адресу)
                    </p>
                </div>
            </div>

            <div className="flex items-start gap-4">
                <CreditCard className="text-gray-600 mt-1 shrink-0" size={24} />
                <div>
                    <span className="block font-bold text-[#001e3c] text-base mb-1">Оплата</span>
                    <p className="text-gray-700 text-base leading-relaxed">
                      При отриманні (післяплата) або передоплата
                    </p>
                </div>
            </div>

            <div className="flex items-start gap-4">
                <ShieldCheck className="text-gray-600 mt-1 shrink-0" size={24} />
                <div>
                    <span className="block font-bold text-[#001e3c] text-base mb-1">Гарантія та повернення</span>
                    <p className="text-gray-700 text-base leading-relaxed">Гарантія 12 місяців. Повернення протягом 14 днів.</p>
                </div>
            </div>
         </div>
      </div>

      {/* Description Preview - Larger text, 175% line height */}
      <div className="mt-4">
        <h3 className="font-bold text-[#001e3c] mb-4 font-display uppercase text-base tracking-wider border-b border-gray-200 pb-2">Опис товару</h3>
        <p className="text-base md:text-lg text-gray-800 leading-loose">
            {product.description}
        </p>
        <a href="#details" className="text-base font-bold text-[#0071dc] underline hover:no-underline hover:text-[#005bb5] transition-colors duration-200 mt-4 inline-block">Читати повністю</a>
      </div>

      {/* Mini Specs - Increased vertical padding for table rows */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
         <h3 className="font-bold text-[#001e3c] mb-5 font-display uppercase text-sm tracking-wider">Характеристики</h3>
         <div className="space-y-0">
            {Object.entries(product.specifications).slice(0, 4).map(([key, value]) => (
                <div key={key} className="flex justify-between border-b border-gray-300 border-dashed last:border-0 py-3 last:pb-0 first:pt-0">
                    <span className="text-gray-700 text-base font-medium">{key}</span>
                    <span className="font-bold text-[#001e3c] text-right text-base">{value}</span>
                </div>
            ))}
         </div>
      </div>
    </div>
  );
};