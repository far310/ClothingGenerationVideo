import { GoogleGenAI, VideoGenerationReferenceType } from "@google/genai";
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

export const generateFashionVideo = async (
  assets: UploadedAssets,
  config: GenerationConfig
): Promise<string> => {
  // 1. Initialize Client
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please select a project.");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  // 2. Identify uploaded files
  const files = Object.values(assets).filter((f): f is File => f !== undefined);
  if (files.length === 0) {
    throw new Error("Please upload at least one image.");
  }

  // 3. Construct Prompt with Emphasis on Material Fidelity
  const modelDesc = MODEL_DESCRIPTIONS[config.modelId] || `a ${config.gender} model`;
  
  // Base prompt
  let fullPrompt = `Cinematic fashion video. ${modelDesc} walking on a ${config.style} runway/set. `;
  
  // Material enhancement logic
  const materialInstruction = config.materialDesc 
    ? `The clothing is made of ${config.materialDesc}. Accurately render the physical properties, weight, and texture of this material. `
    : `Preserve the exact fabric texture, material weight, and reflectivity of the original clothing. `;

  if (files.length > 1) {
    fullPrompt += `The model is wearing the complete outfit composed of the provided clothing items. ${materialInstruction}`;
  } else {
    fullPrompt += `The model is wearing the exact outfit shown in the input image. ${materialInstruction}`;
  }

  // Technical boosters for fidelity
  fullPrompt += `Camera Angle: ${config.cameraAngle}. 
  CRITICAL: Maintain high fidelity to the original clothing's texture and patterns. 
  Lighting should highlight the fabric details. 4k resolution, photorealistic, highly detailed texture.`;

  console.log("Generating video with prompt:", fullPrompt);
  
  let operation;

  try {
    if (files.length === 1) {
      // --- SINGLE IMAGE MODE (FAST) ---
      const imageBase64 = await blobToBase64(files[0]);
      
      // Wrapped in retry logic
      operation = await retryOperation(() => ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: fullPrompt,
        image: {
          imageBytes: imageBase64,
          mimeType: files[0].type,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: config.aspectRatio, // Fast model supports both ratios
        }
      }));

    } else {
      // --- MULTIPLE IMAGES MODE (STANDARD) ---
      // Requires 'veo-3.1-generate-preview', 720p, and 16:9
      
      const referenceImagesPayload = [];
      for (const file of files) {
        const b64 = await blobToBase64(file);
        referenceImagesPayload.push({
          image: {
            imageBytes: b64,
            mimeType: file.type,
          },
          referenceType: VideoGenerationReferenceType.ASSET,
        });
      }

      // Wrapped in retry logic
      operation = await retryOperation(() => ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: fullPrompt,
        config: {
          numberOfVideos: 1,
          referenceImages: referenceImagesPayload,
          resolution: '720p',
          aspectRatio: '16:9' // Strict requirement for multi-reference
        }
      }));
    }

    console.log("Operation started, polling for result...");

    // 5. Poll for completion
    while (!operation.done) {
      // Wait 5 seconds before next poll
      await sleep(5000);
      try {
        operation = await ai.operations.getVideosOperation({ operation: operation });
      } catch (error: any) {
        // If polling fails due to overload or internal error, just log and continue (retry in next loop)
        const msg = error.message || '';
        const isRetryable = 
            msg.includes('overloaded') || 
            msg.includes('internal server issue') ||
            msg.includes('429') || 
            msg.includes('503') || 
            msg.includes('500');

        if (isRetryable) {
          console.warn("Polling encountered temporary error, skipping this tick...", msg);
          continue;
        }
        throw error;
      }
      console.log("Polling status:", operation.metadata);
    }

    if (operation.error) {
      throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    // 6. Retrieve Video URI
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUri) {
      throw new Error("No video URI returned from the API.");
    }

    // 7. Fetch and Create Blob URL
    // We must fetch the video content using the API key to bypass potential playback auth issues
    // and to ensure we have a valid playable source.
    console.log("Downloading video content...");
    
    const fetchVideo = async () => {
      const videoResponse = await fetch(`${videoUri}&key=${apiKey}`);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video content: ${videoResponse.status} ${videoResponse.statusText}`);
      }
      return await videoResponse.blob();
    };

    // Retry download if it fails temporarily
    const videoBlob = await retryOperation(fetchVideo, 3, 1000);
    const localVideoUrl = URL.createObjectURL(videoBlob);
    
    return localVideoUrl;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("Requested entity was not found") || error.message?.includes("404")) {
        throw new Error("API Key session expired or invalid. Please re-select your key.");
    }
    throw error;
  }
};