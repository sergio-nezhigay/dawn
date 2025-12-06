import React, { useState, useEffect, useRef } from 'react';
import { Product, ChatMessage } from '../types';
import { askProductQuestion } from '../services/geminiService';
import { X, Send, Bot } from 'lucide-react';

interface ChatAssistantProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ product, isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `Привіт! Я ваш цифровий помічник "Інформатика". Запитайте мене про ${product.title}!` }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const response = await askProductQuestion(input, product);
    
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 md:w-96 bg-white rounded-t-lg rounded-bl-lg shadow-2xl z-50 flex flex-col border border-gray-200 h-[500px]">
      {/* Header */}
      <div className="bg-[#0071dc] text-white p-4 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className="bg-white/20 p-1.5 rounded-md">
             <Bot size={20} />
           </div>
           <span className="font-bold text-sm">Помічник по товару</span>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2 rounded-lg text-sm ${
              msg.role === 'user' 
                ? 'bg-[#0071dc] text-white rounded-br-none' 
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-500 px-4 py-2 rounded-lg rounded-bl-none border border-gray-200 text-xs italic">
              Думаю...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-gray-200">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Задайте питання..."
            className="flex-1 bg-gray-100 rounded-md px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            type="submit" 
            disabled={loading || !input.trim()}
            className="bg-[#0071dc] text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};