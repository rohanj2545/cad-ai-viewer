import { GoogleGenAI, Type } from "@google/generative-ai";

const getAIClient = () => {
  // Configured in vite.config.js to be replaced during build
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeDrawing = async (summary) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `I have a simplified CAD drawing summary: ${summary}. 
      Can you analyze what this object might be based on the number of lines and bounding box size? 
      Keep it brief, professional, and insightful. Assume units are generic.`,
    });
    return response.text || "Could not analyze drawing.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "AI Analysis unavailable.";
  }
};

export const generateTheme = async (prompt) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Create a JSON color theme for a CAD viewer based on this mood/description: "${prompt}".
      Return ONLY valid JSON with these keys: background, lines, dimensions, text, grid, accent.
      All colors should be hex codes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            background: { type: Type.STRING },
            lines: { type: Type.STRING },
            dimensions: { type: Type.STRING },
            text: { type: Type.STRING },
            grid: { type: Type.STRING },
            accent: { type: Type.STRING },
          },
          required: ["background", "lines", "dimensions", "text", "grid", "accent"]
        }
      }
    });
    
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Gemini Theme Error:", error);
    return null;
  }
};
