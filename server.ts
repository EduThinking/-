import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const PORT = 3000;

// Lazily initialize to avoid crashing if GEMINI_API_KEY is not set immediately
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please add it via Settings > Secrets in the top right.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// A dictionary of style directions to guide the prompt expander
const STYLE_DESCRIPTIONS: Record<string, string> = {
  anime: "Vibrant anime illustration, clean lineart, cell-shaded digital painting, colorful aesthetic, high-quality Japanese animation scene.",
  "3d-render": "Highly detailed 3D digital render, octane render, intricate textures, 3D model, depth of field, vivid cinematic lighting, Pixar-Blender style.",
  watercolor: "Beautiful loose watercolor painting, flowing color washes, delicate paper texture, organic splatters, elegant manual brushstrokes.",
  cyberpunk: "Futuristic cyberpunk aesthetic, neon neon-glowing lights, rainy night street reflecting magenta and cyan hues, dark atmosphere, techno-industrial details.",
  "oil-painting": "Classic textured oil painting, visible canvas texture, rich impasto brushstrokes, masterpiece fine art quality, realistic classical lighting.",
  "pixel-art": "Nostalgic 16-bit retro pixel art, clean pixel grid detail, limited color palette, video game sprite character landscape.",
  "pencil-sketch": "Fine hand-drawn pencil/graphite sketch, refined monochrome lines, cross-hatching shade detail, clean white artist paper texture.",
  cinematic: "Stunning cinematic movie still, dramatic dark/light contrasts (chiaroscuro), anamorphic lens flare, professional film color grading, widescreen depth.",
  origami: "Intricate origami artwork, folded paper texture, clean geometric creasing, soft shadows, studio lighting, craft concept.",
  "pop-art": "Retro pop art screenprint, bold ink contours, halftone paper dots, vibrant saturated primary colors, comic-book classic styling."
};

async function startServer() {
  const app = express();

  // Increase payload limit since we might handle images
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // API endpoint for image generation
  app.post("/api/generate-image", async (req, res): Promise<any> => {
    try {
      const { prompt, style, aspectRatio = "1:1" } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "주제를 입력해주세요. (Prompt is required)" });
      }

      // 1. Initialize Gemini Client
      let ai: GoogleGenAI;
      try {
        ai = getGeminiClient();
      } catch (err: any) {
        return res.status(401).json({ 
          error: "API_KEY_MISSING",
          message: err.message || "GEMINI_API_KEY가 구동 환경에 존재하지 않습니다."
        });
      }

      // 2. Expand prompt using Gemini 3.5 Flash (Translates Korean -> English and details the art style)
      const selectedStylePrompt = STYLE_DESCRIPTIONS[style] || "";
      const promptOptimizerInstruction = `
        You are a highly skilled prompt engineer for AI image generators like Imagen.
        Your job is to translate the user's prompt (usually in Korean, but could be in English) to English, and expand it with rich artistic descriptions to generate a high-quality masterpiece.
        
        Requirements:
        1. Keep the core subject, action, and mood of the user's prompt intact.
        2. Combine it beautifully with the requested artistic style: "${style}" (${selectedStylePrompt}).
        3. Do NOT add unnecessary unrelated elements.
        4. Output ONLY the finalized expanded English prompt. Do NOT write any introduction, quotes, markdown formatting (no backticks), or explanations. Return just the raw optimized prompt string.
        
        Requested style parameters: ${selectedStylePrompt}
        User's prompt: ${prompt}
      `.trim();

      let optimizedPrompt = prompt;
      try {
        const optimizationRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptOptimizerInstruction,
          config: {
            temperature: 0.7,
            maxOutputTokens: 200,
          }
        });
        optimizedPrompt = optimizationRes.text?.trim() || prompt;
      } catch (optError) {
        console.warn("Prompt optimization failed, calling image generation with raw prompt:", optError);
        // Fallback to naive translation/format if model call fails
        optimizedPrompt = `${prompt}, ${selectedStylePrompt}`;
      }

      console.log(`[AI Image Generator] Prompt: "${prompt}" -> Optimized: "${optimizedPrompt}" (Style: ${style}, Aspect: ${aspectRatio})`);

      // 3. Generate image using Imagen
      // We will try 'imagen-4.0-generate-001' first.
      try {
        const imageRes = await ai.models.generateImages({
          model: "imagen-4.0-generate-001",
          prompt: optimizedPrompt,
          config: {
            numberOfImages: 1,
            outputMimeType: "image/jpeg",
            aspectRatio: aspectRatio as any,
          }
        });

        if (imageRes.generatedImages && imageRes.generatedImages.length > 0) {
          const base64Bytes = imageRes.generatedImages[0].image.imageBytes;
          const mime = "image/jpeg";
          const dataUrl = `data:${mime};base64,${base64Bytes}`;

          return res.json({
            success: true,
            imageUrl: dataUrl,
            optimizedPrompt: optimizedPrompt,
            usedModel: "imagen-4.0-generate-001"
          });
        } else {
          throw new Error("Imagen model returned empty images list.");
        }
      } catch (imagenError: any) {
        console.error("Imagen image generation failed. Trying fallback model:", imagenError.message);

        // Fallback option: imagen-4.0-fast-generate-001
        try {
          const fallbackRes = await ai.models.generateImages({
            model: "imagen-4.0-fast-generate-001",
            prompt: optimizedPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: "image/jpeg",
              aspectRatio: aspectRatio as any,
            }
          });

          if (fallbackRes.generatedImages && fallbackRes.generatedImages.length > 0) {
            const base64Bytes = fallbackRes.generatedImages[0].image.imageBytes;
            const mime = "image/jpeg";
            const dataUrl = `data:${mime};base64,${base64Bytes}`;

            return res.json({
              success: true,
              imageUrl: dataUrl,
              optimizedPrompt: optimizedPrompt,
              usedModel: "imagen-4.0-fast-generate-001"
            });
          } else {
            throw new Error("Fallback Imagen model returned empty images list.");
          }
        } catch (fallbackError: any) {
          console.error("All image generation models failed:", fallbackError.message);
          return res.status(500).json({
            error: "GENERATION_FAILED",
            message: fallbackError.message || imagenError.message || "이미지 생성 도중 오류가 발생했습니다. API 키 상태와 한도를 확인해주십시오.",
            details: fallbackError.message || imagenError.message
          });
        }
      }

    } catch (err: any) {
      console.error("Unhandled API error during image generation:", err);
      return res.status(500).json({
        error: "SERVER_ERROR",
        message: "네트워크 통신 중 오류가 발생했습니다.",
        details: err?.message || String(err)
      });
    }
  });

  // Client-side routing configuration backends
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ImagineStudio Backend] Server successfully booted and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Fatal error starting full-stack server:", error);
});
