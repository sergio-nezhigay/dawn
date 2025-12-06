import { GoogleGenAI } from "@google/genai";
import { Review, Product } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const summarizeReviews = async (reviews: Review[], productName: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Функції ШІ недоступні (відсутній API-ключ).";

  const reviewsText = reviews.map(r => `"${r.title}": ${r.text}`).join("\n");
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Summarize the customer sentiment for the product "${productName}" based on these reviews. Highlight pros and cons. Keep it concise (under 100 words). ANSWER IN UKRAINIAN.\n\nReviews:\n${reviewsText}`,
    });
    return response.text || "Не вдалося створити резюме.";
  } catch (error) {
    console.error("Error summarizing reviews:", error);
    return "Помилка при створенні резюме. Спробуйте пізніше.";
  }
};

export const askProductQuestion = async (question: string, product: Product): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Функції ШІ недоступні (відсутній API-ключ).";

  const context = `
    Product: ${product.title}
    Brand: ${product.brand}
    Price: $${product.price}
    Description: ${product.description}
    Specs: ${JSON.stringify(product.specifications)}
    
    You are a helpful Walmart shopping assistant. Answer the user's question about this specific product based on the details provided above. Be polite, concise, and helpful. ANSWER IN UKRAINIAN.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${context}\n\nUser Question: ${question}`,
    });
    return response.text || "Я не знайшов відповіді на це питання.";
  } catch (error) {
    console.error("Error answering question:", error);
    return "Вибачте, зараз я не можу з'єднатися.";
  }
};