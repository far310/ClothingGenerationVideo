export type Gender = 'female' | 'male';

export type AssetType = 'top' | 'bottom' | 'shoes';

export interface UploadedAssets {
  top?: File;
  bottom?: File;
  shoes?: File;
}

export interface ModelOption {
  id: string;
  name: string;
  gender: Gender;
  thumbnail: string;
}

export type VideoAspectRatio = '9:16' | '16:9';
export type VideoResolution = '720p' | '1080p';

export interface GenerationConfig {
  prompt: string;
  gender: Gender;
  modelId: string;
  cameraAngle: string;
  style: string;
  aspectRatio: VideoAspectRatio;
  materialDesc: string; // New field for fabric description
}

export interface GeneratedVideo {
  uri: string;
  mimeType: string;
}

export type AppStatus = 'idle' | 'uploading' | 'generating' | 'success' | 'error';

// Custom interface for window with AI Studio property
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}