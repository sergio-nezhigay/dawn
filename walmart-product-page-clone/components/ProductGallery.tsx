import React, { useState } from 'react';

interface ProductGalleryProps {
  images: string[];
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4">
      {/* Thumbnails */}
      <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[500px] hide-scrollbar py-1 lg:py-0 px-1 lg:px-0">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedImage(idx)}
            className={`flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20 bg-white rounded-md overflow-hidden transition-all duration-200 ease-out ${
              selectedImage === idx 
              ? 'ring-2 ring-[#0071dc] shadow-md opacity-100 scale-100' 
              : 'border border-gray-200 hover:border-[#0071dc]/50 opacity-70 hover:opacity-100 hover:scale-105'
            }`}
          >
            <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Main Image */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden relative group shadow-sm hover:shadow-lg transition-shadow duration-300">
        <div className="aspect-[4/5] w-full flex items-center justify-center p-8">
            <img 
              src={images[selectedImage]} 
              alt="Main product" 
              className="max-h-full max-w-full object-contain mix-blend-multiply cursor-zoom-in group-hover:scale-110 transition-transform duration-500 ease-in-out" 
            />
        </div>
        
        {/* Updated Badges - Increased Size for Accessibility */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
           <span className="bg-[#ffc220] text-[#001e3c] text-xs font-bold px-3 py-1.5 rounded-sm uppercase tracking-wider shadow-sm font-display">
             Хіт продажів
           </span>
           <span className="bg-[#0071dc] text-white text-xs font-bold px-3 py-1.5 rounded-sm uppercase tracking-wider shadow-sm font-display">
             Топ відгуків
           </span>
        </div>
      </div>
    </div>
  );
};