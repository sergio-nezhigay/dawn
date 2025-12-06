import React, { useState } from 'react';
import { Header } from './components/Header';
import { ProductGallery } from './components/ProductGallery';
import { ProductDetails } from './components/ProductDetails';
import { Reviews } from './components/Reviews';
import { ChatAssistant } from './components/ChatAssistant';
import { ProductListSection, ProductSummary } from './components/ProductListSection';
import { Product } from './types';

// Mock Data representing the requested SK hynix RAM module
const MOCK_PRODUCT: Product = {
  id: 'sk-hynix-ddr4-8gb-2400',
  title: "Оперативна пам'ять SODIMM DDR4 8GB 2400MHz SK hynix (HMA81GS6AFR8N-UH)",
  brand: 'SK hynix',
  price: 799.00,
  currency: 'UAH',
  rating: 4.9,
  reviewCount: 156,
  sizes: ['4GB', '8GB', '16GB', '32GB'],
  images: [
    'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=800', // Generic RAM stick
    'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&q=80&w=800', // Chips macro
    'https://images.unsplash.com/photo-1588508065123-601e61de94bf?auto=format&fit=crop&q=80&w=800', // Laptop internals
    'https://images.unsplash.com/photo-1555618568-9b1686641aee?auto=format&fit=crop&q=80&w=800', // Circuit board
  ],
  description: "Оригінальний модуль пам'яті SK hynix стандарту DDR4 для ноутбуків. Ідеальне рішення для модернізації (апгрейду) вашого лептопа. Забезпечує стабільну роботу, низьке енергоспоживання (1.2В) та високу сумісність з ноутбуками брендів Dell, HP, Lenovo, ASUS та Acer. Частота 2400 МГц (PC4-19200) гарантує швидкий відгук системи та комфортну роботу в багатозадачному режимі.",
  specifications: {
    "Тип пам'яті": "SODIMM DDR4",
    "Об'єм": "8 ГБ",
    "Ефективна частота": "2400 МГц (PC4-19200)",
    "Таймінги (CAS Latency)": "CL17",
    "Напруга живлення": "1.2 В",
    "Призначення": "Для ноутбуків",
    "Маркування (Part Number)": "HMA81GS6AFR8N-UH",
    "Кількість планок": "1 шт",
    "Виробник чіпів": "SK hynix"
  },
  reviews: [
    {
      id: 'r1',
      author: 'Андрій К.',
      rating: 5,
      date: '12 лют 2024',
      title: 'Працює ідеально в Lenovo',
      text: 'Купив цю планку для Lenovo Ideapad 330. Вставив у вільний слот, ноутбук відразу побачив пам\'ять. Тепер 12 ГБ замість 4, Chrome більше не висне.',
      verified: true
    },
    {
      id: 'r2',
      author: 'ServiceMaster',
      rating: 5,
      date: '05 січ 2024',
      title: 'Надійний OEM виробник',
      text: 'Hynix - це стандарт якості. Ставимо такі модулі клієнтам вже роками, відсоток браку нульовий. HMA81GS6AFR8N-UH - класична модель на 2400МГц, підходить до 90% ноутбуків 2017-2020 років.',
      verified: true
    },
    {
      id: 'r3',
      author: 'Олена В.',
      rating: 5,
      date: '20 груд 2023',
      title: 'Все супер',
      text: 'Ноутбук HP став працювати набагато швидше. Доставка була дуже швидкою. Дяку!',
      verified: true
    },
    {
      id: 'r4',
      author: 'Максим',
      rating: 4,
      date: '15 лист 2023',
      title: 'Хороша пам\'ять',
      text: 'Пам\'ять оригінальна, чіпи Hynix. Таймінги відповідають заявленим CL17. Упаковка була проста (блістер), але доїхало цілим.',
      verified: true
    }
  ]
};

// Mock data for recommendation sections
const MOCK_YOU_MAY_LIKE: ProductSummary[] = [
  { id: '1', title: 'Kingston FURY Impact DDR4 16GB 3200MHz', price: 1699, currency: 'UAH', image: 'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=400&q=80', rating: 4.8, reviewCount: 420 },
  { id: '2', title: 'Crucial SODIMM DDR4 8GB 2666MHz', price: 899, currency: 'UAH', image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=400&q=80', rating: 4.7, reviewCount: 85 },
  { id: '3', title: 'Samsung 870 EVO SSD 500GB 2.5"', price: 2299, currency: 'UAH', image: 'https://images.unsplash.com/photo-1597872250969-966967f6734c?auto=format&fit=crop&w=400&q=80', rating: 4.9, reviewCount: 1250 },
  { id: '4', title: 'WD Blue SN570 NVMe SSD 1TB', price: 2799, currency: 'UAH', image: 'https://images.unsplash.com/photo-1628557672962-d961185806cb?auto=format&fit=crop&w=400&q=80', rating: 4.8, reviewCount: 310 },
  { id: '5', title: 'Apacer AS350 Panther 256GB', price: 699, currency: 'UAH', image: 'https://images.unsplash.com/photo-1531297461136-82bf97d8365d?auto=format&fit=crop&w=400&q=80', rating: 4.5, reviewCount: 89 },
];

const MOCK_RECENTLY_VIEWED: ProductSummary[] = [
  { id: '6', title: 'Термопаста Arctic MX-4 (4g)', price: 399, currency: 'UAH', image: 'https://images.unsplash.com/photo-1624705022837-97d8120b0806?auto=format&fit=crop&w=400&q=80', rating: 5.0, reviewCount: 2100 },
  { id: '7', title: 'Logitech G102 Lightsync Black', price: 999, currency: 'UAH', image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80', rating: 4.8, reviewCount: 850 },
  { id: '8', title: 'Кабель HDMI 2.1 Baseus 8K 2m', price: 450, currency: 'UAH', image: 'https://images.unsplash.com/photo-1558239082-957262c5b3c5?auto=format&fit=crop&w=400&q=80', rating: 4.6, reviewCount: 120 },
  { id: '9', title: 'USB Hub Baseus Metal Gleam 6-in-1', price: 1499, currency: 'UAH', image: 'https://images.unsplash.com/photo-1616441865955-442436f56860?auto=format&fit=crop&w=400&q=80', rating: 4.7, reviewCount: 340 },
];

const MOCK_INTERESTED: ProductSummary[] = [
  { id: '10', title: 'Набір викруток Xiaomi Wiha (24 в 1)', price: 899, currency: 'UAH', image: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?auto=format&fit=crop&w=400&q=80', rating: 4.9, reviewCount: 560 },
  { id: '11', title: 'Підставка для ноутбука Aluminum Stand', price: 650, currency: 'UAH', image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=400&q=80', rating: 4.6, reviewCount: 180 },
  { id: '12', title: 'Стиснене повітря ColorWay 500ml', price: 250, currency: 'UAH', image: 'https://images.unsplash.com/photo-1624701920672-1863032d56a3?auto=format&fit=crop&w=400&q=80', rating: 4.8, reviewCount: 900 },
  { id: '13', title: 'Килимок для миші SteelSeries QcK+', price: 599, currency: 'UAH', image: 'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?auto=format&fit=crop&w=400&q=80', rating: 4.9, reviewCount: 450 },
];

const App: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-screen font-sans selection:bg-[#ffc220] selection:text-black relative overflow-x-hidden">
      
      {/* MODERN BACKGROUND IMPLEMENTATION */}
      {/* 1. Base Color */}
      <div className="fixed inset-0 z-[-1] bg-[#f8f9fa] h-full w-full"></div>
      
      {/* 2. Technical Dot Grid Pattern */}
      <div className="fixed inset-0 z-[-1] h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-100"></div>
      
      {/* 3. Ambient Glows (Brand Colors) for Depth */}
      {/* Top Right - Blue Glow */}
      <div className="fixed top-0 right-0 z-[-1] w-[600px] h-[600px] bg-[#0071dc] rounded-full mix-blend-multiply filter blur-[128px] opacity-[0.05] translate-x-1/3 -translate-y-1/3"></div>
      {/* Bottom Left - Yellow/Gold Glow */}
      <div className="fixed bottom-0 left-0 z-[-1] w-[600px] h-[600px] bg-[#ffc220] rounded-full mix-blend-multiply filter blur-[128px] opacity-[0.08] -translate-x-1/3 translate-y-1/3"></div>

      <Header />
      
      <main className="max-w-[1344px] mx-auto px-6 py-8 relative">
        {/* Breadcrumb - Text Size 14px (text-sm) with high contrast */}
        <nav className="text-sm font-medium text-gray-600 mb-8 flex gap-3 items-center tracking-wide">
          <span className="hover:text-[#0071dc] hover:underline cursor-pointer transition-colors">Електроніка</span> 
          <span className="text-gray-400">/</span>
          <span className="hover:text-[#0071dc] hover:underline cursor-pointer transition-colors">Комп'ютери та комплектуючі</span> 
          <span className="text-gray-400">/</span>
          <span className="hover:text-[#0071dc] hover:underline cursor-pointer transition-colors">Комплектуючі</span> 
          <span className="text-gray-400">/</span>
          <span className="font-bold text-[#2e2f32] font-display uppercase tracking-wider">Оперативна пам'ять</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.2fr] gap-10 lg:gap-16 mb-20">
          {/* Left Column: Gallery & Content */}
          <div className="space-y-16">
            <ProductGallery images={MOCK_PRODUCT.images} />
            
            {/* Reviews Section */}
            <Reviews product={MOCK_PRODUCT} />
          </div>

          {/* Right Column: Product Details (Sticky) */}
          <div className="lg:sticky lg:top-28 h-fit">
            <ProductDetails 
              product={MOCK_PRODUCT} 
              onAskQuestion={() => setIsChatOpen(true)} 
            />
          </div>
        </div>

        {/* New Product Recommendations Sections */}
        <div className="space-y-4">
           <ProductListSection title="Вам також може сподобатися" products={MOCK_YOU_MAY_LIKE} />
           <ProductListSection title="Нещодавно переглянуті" products={MOCK_RECENTLY_VIEWED} />
           <ProductListSection title="Також вас можуть зацікавити" products={MOCK_INTERESTED} />
        </div>
      </main>

      {/* Footer - Text Base (16px) for legibility */}
      <footer className="bg-[#001e3c] text-white py-16 mt-20 text-base relative overflow-hidden">
        {/* Decorative top border */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#0071dc] via-[#ffc220] to-[#0071dc]"></div>
        
        <div className="max-w-6xl mx-auto px-6 text-center">
           <div className="flex justify-center gap-10 mb-10 flex-wrap font-bold text-base">
              <a href="#" className="hover:text-[#ffc220] transition-colors">Про нас</a>
              <a href="#" className="hover:text-[#ffc220] transition-colors">Блог</a>
              <a href="#" className="hover:text-[#ffc220] transition-colors">Гарантія та повернення</a>
              <a href="#" className="hover:text-[#ffc220] transition-colors">Корпоративним клієнтам</a>
              <a href="#" className="hover:text-[#ffc220] transition-colors">Доставка та оплата</a>
              <a href="#" className="hover:text-[#ffc220] transition-colors">Контакти</a>
           </div>
           <div className="opacity-50 text-base font-display tracking-widest uppercase mb-4 font-bold">Informatika Systems</div>
           <p className="opacity-70 text-base">&copy; 2024 INFORMATIKA. Найкращі рішення для вашого ПК.</p>
        </div>
      </footer>

      {/* Chat Assistant */}
      <ChatAssistant 
        product={MOCK_PRODUCT} 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </div>
  );
};

export default App;