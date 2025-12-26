import { GoogleGenAI, VideoGenerationReferenceType, GenerateContentResponse } from "@google/genai";
import { GenerationConfig, UploadedAssets } from "../types";

// Helper to check API Key selection for Veo
export const checkApiKeySelection = async (): Promise<boolean> => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    return await window.aistudio.hasSelectedApiKey();
  }
  return true; // Fallback for dev environments without the specific wrapper
};

export const promptSelectApiKey = async (): Promise<void> => {
  if (window.aistudio && window.aistudio.openSelectKey) {
    await window.aistudio.openSelectKey();
  }
};

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/png;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper: Sleep function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Retry operation with exponential backoff
const retryOperation = async <T>(
  fn: () => Promise<T>, 
  retries = 5, 
  baseDelay = 2000
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const msg = error.message || '';
      // Check for overload, rate limit, or internal server errors
      const isRetryable = 
        msg.includes('overloaded') || 
        msg.includes('internal server issue') ||
        msg.includes('429') || 
        msg.includes('503') ||
        msg.includes('500') ||
        error.status === 429 ||
        error.status === 503 ||
        error.status === 500;
      
      // If not a retryable error, or if we've run out of retries, throw
      if (!isRetryable || i === retries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      console.warn(`Gemini API error (${msg}). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
      await sleep(delay);
    }
  }
  throw new Error("Failed after max retries");
};

// Model definitions mapping (Same as in UI, but simplified for prompt)
const MODEL_DESCRIPTIONS: Record<string, string> = {
  'sofia': 'a Caucasian female model with blonde hair',
  'li': 'an East Asian female model with black straight hair',
  'zara': 'a Black female model with curly hair',
  'david': 'a Caucasian male model with short brown hair',
  'ken': 'an Asian male model with stylish short hair',
  'marcus': 'a Black male model with athletic build',
};

// Body Type mapping to prompt adjectives
const BODY_TYPE_PROMPTS: Record<string, string> = {
  'slim': 'slender and thin',
  'athletic': 'muscular and athletic',
  'curvy': 'curvy and voluptuous',
  'plus': 'plus-size and full-figured',
  'tall': 'very tall and statuesque',
  'petite': 'petite and short',
};

const buildCommonPrompt = (config: GenerationConfig, assetCount: number): string => {
  const baseModelDesc = MODEL_DESCRIPTIONS[config.modelId] || `a ${config.gender} model`;
  const bodyAdjective = BODY_TYPE_PROMPTS[config.bodyType] || 'slender';
  const fullModelDesc = `${baseModelDesc} with a ${bodyAdjective} body type`;
  
  // Base prompt
  let fullPrompt = `Fashion content. ${fullModelDesc} in a ${config.style} setting. `;
  
  // Material enhancement logic
  const materialInstruction = config.materialDesc 
    ? `The clothing is made of ${config.materialDesc}. Accurately render the physical properties, weight, and texture of this material. `
    : `Preserve the exact fabric texture, material weight, and reflectivity of the original clothing. `;

  if (assetCount > 1) {
    fullPrompt += `The model is wearing the complete outfit composed of the provided clothing items (Top, Bottom, Shoes, and/or Accessories). ${materialInstruction}`;
  } else {
    fullPrompt += `The model is wearing the exact outfit shown in the input image. ${materialInstruction}`;
  }

  fullPrompt += `Camera Angle: ${config.cameraAngle}. 
  CRITICAL: Maintain high fidelity to the original clothing's texture and patterns. 
  Lighting should highlight the fabric details. High resolution, photorealistic, highly detailed texture.`;
  
  return fullPrompt;
}

export const generateFashionVideo = async (
  assets: UploadedAssets,
  config: GenerationConfig
): Promise<string> => {
  // 1. Initialize Client
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found.");
  const ai = new GoogleGenAI({ apiKey });

  // 2. Identify uploaded files (Order matters for prioritization in Veo limit)
  // Veo allows max 3 reference images. Prioritize Top, Bottom, Shoes.
  const orderedFiles = [assets.top, assets.bottom, assets.shoes, assets.accessories].filter((f): f is File => f !== undefined);

  if (orderedFiles.length === 0) throw new Error("Please upload at least one image.");

  const fullPrompt = buildCommonPrompt(config, orderedFiles.length) + " Generate a cinematic video.";

  console.log("Generating video with prompt:", fullPrompt);
  
  let operation;

  try {
    if (orderedFiles.length === 1) {
      // --- SINGLE IMAGE VIDEO MODE ---
      const imageBase64 = await blobToBase64(orderedFiles[0]);
      
      operation = await retryOperation(() => ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: fullPrompt,
        image: {
          imageBytes: imageBase64,
          mimeType: orderedFiles[0].type,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: config.aspectRatio,
        }
      }));

    } else {
      // --- MULTIPLE IMAGES VIDEO MODE ---
      // Veo Limit: Up to 3 reference images.
      const referenceFiles = orderedFiles.slice(0, 3);
      
      const referenceImagesPayload = [];
      for (const file of referenceFiles) {
        const b64 = await blobToBase64(file);
        referenceImagesPayload.push({
          image: {
            imageBytes: b64,
            mimeType: file.type,
          },
          referenceType: VideoGenerationReferenceType.ASSET,
        });
      }

      operation = await retryOperation(() => ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: fullPrompt,
        config: {
          numberOfVideos: 1,
          referenceImages: referenceImagesPayload,
          resolution: '720p',
          aspectRatio: '16:9' // Force 16:9 for multi-ref Veo
        }
      }));
    }

    console.log("Operation started, polling for result...");

    // Poll for completion
    while (!operation.done) {
      await sleep(5000);
      try {
        operation = await ai.operations.getVideosOperation({ operation: operation });
      } catch (error: any) {
         // Retry loop for temporary polling errors
         const msg = error.message || '';
         if (msg.includes('overloaded') || msg.includes('internal server issue') || msg.includes('500') || msg.includes('503')) {
           continue;
         }
         throw error;
      }
      console.log("Polling status:", operation.metadata);
    }

    if (operation.error) throw new Error(`Video generation failed: ${operation.error.message}`);
    
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI returned.");

    // Download video
    const fetchVideo = async () => {
      const videoResponse = await fetch(`${videoUri}&key=${apiKey}`);
      if (!videoResponse.ok) throw new Error(`Download failed: ${videoResponse.status}`);
      return await videoResponse.blob();
    };
    const videoBlob = await retryOperation(fetchVideo, 3, 1000);
    return URL.createObjectURL(videoBlob);

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("Requested entity was not found") || error.message?.includes("404")) {
        throw new Error("API Key session expired or invalid. Please re-select your key.");
    }
    throw error;
  }
};


export const generateFashionImage = async (
    assets: UploadedAssets,
    config: GenerationConfig
): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found.");
    const ai = new GoogleGenAI({ apiKey });

    // Collect all files
    const files = [assets.top, assets.bottom, assets.shoes, assets.accessories].filter((f): f is File => f !== undefined);
    if (files.length === 0) throw new Error("Please upload at least one image.");

    const fullPrompt = buildCommonPrompt(config, files.length) + " Generate a high-quality fashion photograph.";

    console.log("Generating image with prompt:", fullPrompt);

    // Prepare Parts: Images + Prompt
    const parts: any[] = [];
    for (const file of files) {
        const b64 = await blobToBase64(file);
        parts.push({
            inlineData: {
                data: b64,
                mimeType: file.type
            }
        });
    }
    parts.push({ text: fullPrompt });

    try {
        const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview', // High quality image model
            contents: { parts: parts },
            config: {
                imageConfig: {
                    aspectRatio: config.aspectRatio === '16:9' ? '16:9' : '9:16', // Obey selected aspect ratio
                    imageSize: '2K', // High quality
                }
            }
        }));

        // Extract image from response
        // Iterate through parts to find the image
        if (response.candidates) {
            for (const candidate of response.candidates) {
                if (candidate.content && candidate.content.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.inlineData) {
                            const base64Data = part.inlineData.data;
                            const mimeType = part.inlineData.mimeType || 'image/png';
                            const binary = atob(base64Data);
                            const array = [];
                            for(let i = 0; i < binary.length; i++) {
                                array.push(binary.charCodeAt(i));
                            }
                            const blob = new Blob([new Uint8Array(array)], {type: mimeType});
                            return URL.createObjectURL(blob);
                        }
                    }
                }
            }
        }
        
        throw new Error("No image data found in response.");

    } catch (error: any) {
        console.error("Gemini Image API Error:", error);
        throw error;
    }
};