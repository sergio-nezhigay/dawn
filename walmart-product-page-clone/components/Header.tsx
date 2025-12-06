import React from 'react';
import { Search, ShoppingCart, ChevronDown, Phone, Cpu } from 'lucide-react';

export const Header: React.FC = () => {
  // Updated Tech Store Nav Items with specific sub-categories
  const navItems = [
    { title: "Комплектуючі", items: ["Процесори", "Материнські плати", "Оперативна пам'ять", "Відеокарти", "SSD/HDD", "Блоки живлення", "Корпуси", "Кулери"] },
    { title: "HDMI", items: ["Кабелі HDMI 2.1 (8K)", "Кабелі HDMI 2.0 (4K)", "Подовжувачі HDMI", "Кутові адаптери", "Сплітери та перемикачі"] },
    { title: "VGA", items: ["Кабелі VGA (Male-Male)", "Подовжувачі VGA", "Перехідники VGA-HDMI", "Конвертери VGA-RCA"] },
    { title: "DP", items: ["DisplayPort 1.4", "DisplayPort 2.1", "Mini DisplayPort", "Перехідники DP-HDMI", "Кабелі 144Hz"] },
    { title: "RCA", items: ["Аудіо кабелі 2xRCA", "Відео кабелі 3xRCA", "Компонентні кабелі", "Перехідники на 3.5mm"] },
    { title: "DVI", items: ["DVI-D Dual Link", "DVI-I Single Link", "Перехідники DVI-VGA", "Перехідники DVI-HDMI"] },
    { title: "USB", items: ["USB Type-C", "Micro USB", "Mini USB", "USB-B (Принтер)", "USB Подовжувачі 3.0"] },
    { title: "Різне", items: ["Термопаста", "Стяжки для кабелю", "Інструменти для ПК", "Батарейки та акумулятори", "Чистячі набори"] }
  ];

  const headerLinks = [
    { title: "Доставка і оплата", href: "#" },
    { title: "Гарантія і повернення", href: "#" },
    { title: "Контакти", href: "#" }
  ];

  return (
    <header className="sticky top-0 z-50 font-sans shadow-lg flex flex-col">
      
      {/* TIER 1: Utility Bar */}
      <div className="bg-[#0071dc] text-white/95 text-sm font-medium py-2 border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-6 flex justify-between items-center">
          
          {/* Left: Info Links */}
          <div className="flex items-center gap-6">
             {headerLinks.map(link => (
                 <a key={link.title} href={link.href} className="hover:text-white hover:underline opacity-90 hover:opacity-100 transition-all duration-200">
                    {link.title}
                 </a>
             ))}
          </div>

          {/* Right: Phone & Lang */}
          <div className="flex items-center gap-6">
            <a href="tel:0993815288" className="flex items-center gap-2 group hover:text-white transition-colors duration-200">
               <Phone size={16} className="text-[#ffc220] group-hover:scale-110 transition-transform duration-200" fill="currentColor" />
               <span className="tracking-wide font-bold text-sm">(099) 381-5288</span>
            </a>
            
            {/* Divider */}
            <div className="w-[1px] h-3 bg-white/30"></div>

            {/* Language Dropdown */}
            <div className="relative group cursor-pointer flex items-center gap-1 hover:text-white transition-colors duration-200">
               <span className="font-bold text-sm">UA</span>
               <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-300" />
               {/* Dropdown Content */}
               <div className="absolute top-full right-0 mt-1 bg-white text-gray-800 rounded-md shadow-xl py-1 w-24 text-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right scale-95 group-hover:scale-100">
                  <div className="px-3 py-2 hover:bg-gray-50 font-bold text-[#0071dc] cursor-pointer text-sm">UA</div>
                  <div className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">RU</div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* TIER 2: Main Header (Standard Blue) */}
      <div className="bg-[#0071dc] text-white py-4">
        <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between gap-6">
          
          {/* Left: Logo Container */}
          <div className="flex-shrink-0 w-auto lg:w-[240px] flex justify-start">
             <a href="#" className="hover:opacity-95 transition flex items-center gap-3 group">
               <div className="relative">
                  <Cpu className="w-10 h-10 md:w-12 md:h-12 text-[#ffc220] group-hover:scale-105 transition-transform duration-300 ease-out" strokeWidth={2} />
                  <div className="absolute inset-0 bg-white opacity-0 blur-md rounded-full group-hover:opacity-20 transition-opacity duration-300"></div>
               </div>
               <div className="flex flex-col leading-none">
                  <span className="font-bold text-2xl md:text-4xl tracking-wide font-display uppercase">INFORMATIKA</span>
               </div>
             </a>
          </div>

          {/* Center: Search Bar */}
          <div className="flex-1 flex justify-center px-4 max-w-4xl">
            <div className="relative w-full group shadow-lg rounded-full">
                <input 
                  type="text" 
                  placeholder="Пошук кабелів, адаптерів та комплектуючих..." 
                  className="w-full h-10 lg:h-12 rounded-full pl-6 pr-14 text-gray-900 outline-none ring-2 ring-transparent focus:ring-4 focus:ring-[#ffc220]/50 text-base shadow-inner transition-all duration-200 placeholder:text-gray-500"
                />
                <button className="absolute right-1 top-1 h-8 w-8 lg:h-10 lg:w-10 bg-[#ffc220] rounded-full flex items-center justify-center 
                  hover:bg-[#ffe066] hover:scale-105 
                  active:scale-90 active:bg-[#ffcf4d]
                  transition-all duration-200 ease-out text-[#001e3c] shadow-sm">
                  <Search size={22} />
                </button>
            </div>
          </div>

          {/* Right: Cart Container */}
          <div className="flex-shrink-0 w-auto lg:w-[240px] flex justify-end">
              <button className="flex items-center gap-3 group hover:opacity-100 transition relative p-2 rounded-full hover:bg-white/10 active:scale-95 duration-200">
                <div className="relative">
                    <ShoppingCart size={28} className="text-white group-hover:scale-105 transition-transform duration-200" />
                    <span className="absolute -top-1.5 -right-1.5 bg-[#ffc220] text-[#001e3c] text-xs font-extrabold px-1.5 py-0.5 rounded-full border-2 border-[#0071dc] min-w-[20px] text-center shadow-sm">
                        0
                    </span>
                </div>
              </button>
          </div>
        </div>
      </div>
      
      {/* TIER 3: Navigation */}
      <div className="bg-white border-b border-gray-200 text-[#2e2f32]">
         <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-center flex-wrap gap-x-1 gap-y-1 py-1">
             {navItems.map((category) => (
                  <div key={category.title} className="relative group">
                      {/* Nav Item Text Size: 16px (text-base) but tighter padding */}
                      <button 
                        className="flex items-center gap-2 whitespace-nowrap text-base px-5 py-3 rounded-full transition-all duration-200 text-gray-900 font-bold hover:bg-blue-50 hover:text-[#0071dc]"
                      >
                         {category.title}
                         <ChevronDown size={15} className="text-gray-500 group-hover:text-[#0071dc] transition-transform duration-200 group-hover:rotate-180" strokeWidth={3} />
                      </button>

                      {/* Dropdown Menu */}
                      <div className="absolute top-[calc(100%-5px)] left-1/2 -translate-x-1/2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 ease-out z-50 overflow-hidden ring-1 ring-black/5">
                        <div className="py-4">
                           <div className="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 mb-2">{category.title}</div>
                           {category.items.map((subItem) => (
                             <a 
                               key={subItem} 
                               href="#" 
                               className="block px-6 py-3 text-base text-gray-700 hover:bg-blue-50 hover:text-[#0071dc] hover:pl-7 transition-all duration-200 font-medium"
                             >
                               {subItem}
                             </a>
                           ))}
                        </div>
                      </div>
                  </div>
               ))}
         </div>
      </div>
    </header>
  );
};