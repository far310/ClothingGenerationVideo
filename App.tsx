import React, { useState, useEffect } from 'react';
import UploadZone from './components/UploadZone';
import ConfigPanel from './components/ConfigPanel';
import VideoResult from './components/VideoResult';
import { GenerationConfig, AppStatus, UploadedAssets, AssetType } from './types';
import { generateFashionVideo, checkApiKeySelection, promptSelectApiKey } from './services/geminiService';
import { IconSparkles } from './components/Icons';

const App: React.FC = () => {
  // State
  const [assets, setAssets] = useState<UploadedAssets>({});
  const [status, setStatus] = useState<AppStatus>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  // Configuration State
  const [config, setConfig] = useState<GenerationConfig>({
    prompt: '',
    gender: 'female',
    modelId: 'sofia', // Default model
    cameraAngle: 'Tracking shot',
    style: 'runway',
    aspectRatio: '9:16',
    materialDesc: '', // Default material description
  });

  // Check API Key on mount
  useEffect(() => {
    const initKey = async () => {
        try {
            const hasKey = await checkApiKeySelection();
            setHasApiKey(hasKey);
        } catch (e) {
            console.error("Failed to check API key status", e);
        }
    };
    initKey();
  }, []);

  // Handle API Key Selection
  const handleKeySelection = async () => {
      try {
          await promptSelectApiKey();
          setHasApiKey(true); 
      } catch (e) {
          console.error("Key selection failed", e);
      }
  };

  const handleAssetChange = (type: AssetType, file: File | null) => {
    setAssets(prev => {
      const newAssets = { ...prev };
      if (file === null) {
        delete newAssets[type];
      } else {
        newAssets[type] = file;
      }
      return newAssets;
    });
  };

  const handleGenerate = async () => {
    const assetCount = Object.keys(assets).length;
    if (assetCount === 0) return;
    
    if (!hasApiKey) {
        await handleKeySelection();
        return;
    }

    setStatus('uploading');
    setErrorMsg(null);
    setVideoUrl(null);

    try {
      setStatus('generating');
      
      const resultUri = await generateFashionVideo(assets, config);
      
      setVideoUrl(resultUri);
      setStatus('success');
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "生成视频时发生错误");
      setStatus('error');
      
      if (error.message?.includes("API Key")) {
          setHasApiKey(false);
      }
    }
  };

  const isProcessing = status === 'uploading' || status === 'generating';
  const hasAssets = Object.keys(assets).length > 0;
  const isMultiAsset = Object.keys(assets).length > 1;

  // Derive effective aspect ratio for preview (Multi-asset forces 16:9)
  const effectiveAspectRatio = isMultiAsset ? '16:9' : config.aspectRatio;

  return (
    <div className="min-h-screen w-full bg-[#0f0f11] text-gray-200 font-sans selection:bg-brand-500/30">
      
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0f0f11]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              FashionAI <span className="text-brand-400 font-light">Studio</span>
            </span>
          </div>
          
          {!hasApiKey && (
             <button 
                onClick={handleKeySelection}
                className="text-xs bg-[#1c1c1e] border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-full transition-colors"
             >
                配置 API Key
             </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          
          {/* Left Column: Configuration */}
          <div className="lg:col-span-5 space-y-8 flex flex-col h-full overflow-y-auto pr-2 pb-10">
            
            <section className="bg-[#18181b] border border-gray-800/50 rounded-2xl p-6 shadow-xl">
               <UploadZone 
                 assets={assets} 
                 onAssetChange={handleAssetChange} 
               />
            </section>

            <section className="bg-[#18181b] border border-gray-800/50 rounded-2xl p-6 shadow-xl flex-1">
              <ConfigPanel 
                config={config} 
                onChange={setConfig}
                disabled={isProcessing}
              />
              {isMultiAsset && (
                 <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-200">
                    ℹ️ 多件展示模式将强制使用 16:9 横屏比例，生成时间可能稍长。
                 </div>
              )}
            </section>

            {/* Action Bar (Sticky Mobile) */}
            <div className="sticky bottom-4 z-20">
                <button
                    onClick={handleGenerate}
                    disabled={!hasAssets || isProcessing}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all transform
                        ${!hasAssets || isProcessing 
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-brand-500/25 hover:scale-[1.02]'
                        }`}
                >
                    {isProcessing ? (
                        <>
                           <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                           生成中...
                        </>
                    ) : (
                        <>
                           <IconSparkles className="w-5 h-5" />
                           {!hasApiKey ? '选择 API Key 并生成' : '开始生成视频'}
                        </>
                    )}
                </button>
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-7 lg:sticky lg:top-24 h-fit">
             <VideoResult 
               status={status} 
               videoUrl={videoUrl} 
               aspectRatio={effectiveAspectRatio}
               errorMsg={errorMsg}
             />
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;