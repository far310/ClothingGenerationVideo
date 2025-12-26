import React from 'react';
import { AppStatus, VideoAspectRatio } from '../types';
import { IconSparkles, IconImage, IconVideo } from './Icons';

interface VideoResultProps {
  status: AppStatus;
  videoUrl: string | null;
  aspectRatio: VideoAspectRatio;
  errorMsg: string | null;
  mode?: 'video' | 'image'; // Add mode to know what to render
}

const VideoResult: React.FC<VideoResultProps> = ({ status, videoUrl, aspectRatio, errorMsg, mode = 'video' }) => {
  
  const isPortrait = aspectRatio === '9:16';
  
  // Dynamic container classes
  const containerClasses = isPortrait 
    ? 'aspect-[9/16] max-w-sm' 
    : 'aspect-[16/9] max-w-full';

  return (
    <div className="w-full h-full min-h-[500px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
         <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <IconSparkles className="w-5 h-5 text-brand-400" />
            生成结果
         </h2>
         <div className="text-xs px-2 py-1 rounded bg-[#27272a] text-gray-400 border border-gray-800">
            {status === 'idle' && '等待开始'}
            {status === 'uploading' && '处理资源...'}
            {status === 'generating' && 'AI 生成中...'}
            {status === 'success' && '生成完成'}
            {status === 'error' && '发生错误'}
         </div>
      </div>

      <div className="flex-1 bg-[#0f0f11] rounded-2xl border border-gray-800 relative overflow-hidden flex items-center justify-center p-4">
        
        {/* IDLE STATE */}
        {status === 'idle' && (
          <div className="text-center text-gray-500">
            <div className="w-20 h-20 rounded-full bg-[#1c1c1e] flex items-center justify-center mx-auto mb-4 border border-gray-800">
              <span className="text-3xl grayscale">🎨</span>
            </div>
            <p>请在左侧上传服装并配置参数</p>
            <p className="text-sm opacity-60 mt-1">支持生成视频或高清图片</p>
          </div>
        )}

        {/* LOADING STATE */}
        {(status === 'uploading' || status === 'generating') && (
          <div className="text-center w-full max-w-md">
            <div className="relative w-24 h-24 mx-auto mb-6">
               <div className="absolute inset-0 rounded-full border-4 border-[#27272a]"></div>
               <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">✨</div>
            </div>
            <h3 className="text-white text-lg font-medium mb-2">
              {status === 'uploading' ? '正在上传资源...' : (mode === 'video' ? 'AI 导演正在拍摄中...' : 'AI 摄影师正在拍摄中...')}
            </h3>
            <p className="text-gray-400 text-sm px-4">
              {mode === 'video' 
                ? '生成 720p 视频通常需要 1-2 分钟，请耐心等待。' 
                : '生成高清图片通常需要 10-20 秒。'}
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
           <div className="text-center max-w-md p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
             <div className="text-red-500 text-4xl mb-4">⚠️</div>
             <h3 className="text-white font-bold mb-2">生成失败</h3>
             <p className="text-red-200 text-sm mb-4">{errorMsg || "未知错误，请重试。"}</p>
             <button 
               onClick={() => window.location.reload()}
               className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
             >
               重新加载
             </button>
           </div>
        )}

        {/* SUCCESS STATE */}
        {status === 'success' && videoUrl && (
          <div className={`relative w-full ${containerClasses} bg-black rounded-lg overflow-hidden shadow-2xl shadow-brand-900/20 border border-gray-800 flex items-center justify-center group`}>
            {mode === 'video' ? (
                <video 
                  src={videoUrl}
                  controls 
                  autoPlay 
                  loop
                  className="w-full h-full object-cover"
                />
            ) : (
                <>
                    <img 
                        src={videoUrl}
                        alt="Generated Fashion"
                        className="w-full h-full object-cover"
                    />
                    <a 
                        href={videoUrl} 
                        download="fashion_ai_generated.png"
                        className="absolute bottom-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
                        title="下载图片"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    </a>
                </>
            )}
          </div>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="mt-4 flex justify-between items-center text-xs text-gray-500 border-t border-gray-800 pt-4">
         <span>Model: {mode === 'video' ? 'Veo (gemini-3.1)' : 'Imagen (gemini-3-pro)'}</span>
         <span>Type: {mode === 'video' ? 'Video 720p' : 'Image 2K'}</span>
      </div>
    </div>
  );
};

export default VideoResult;