import React, { useCallback } from 'react';
import { AssetType, UploadedAssets } from '../types';
import { IconShirt, IconPants, IconFootwear, IconAccessories, IconUpload } from './Icons';

interface UploadZoneProps {
  assets: UploadedAssets;
  onAssetChange: (type: AssetType, file: File | null) => void;
}

const UploadSlot: React.FC<{
  type: AssetType;
  label: string;
  icon: React.ReactNode;
  file?: File;
  onChange: (file: File | null) => void;
}> = ({ type, label, icon, file, onChange }) => {
  
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      onChange(selectedFile);
    }
  }, [onChange]);

  const previewUrl = file ? URL.createObjectURL(file) : null;

  return (
    <div className="relative group flex flex-col items-center">
      <div 
        className={`w-full aspect-[4/5] rounded-xl border-2 border-dashed transition-all duration-300 overflow-hidden relative
        ${file ? 'border-brand-500 bg-[#1c1c1e]' : 'border-gray-700 bg-[#1c1c1e] hover:border-gray-500 hover:bg-[#27272a]'}`}
      >
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />

        {previewUrl ? (
          <>
            <img 
              src={previewUrl} 
              alt={label} 
              className="w-full h-full object-cover"
            />
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-20 pointer-events-none">
              <span className="text-white text-xs font-medium">点击更换</span>
            </div>
             <button 
                onClick={(e) => {
                    e.preventDefault(); // Prevent opening file dialog
                    e.stopPropagation(); // Stop event bubbling
                    onChange(null);
                }}
                className="absolute top-2 right-2 p-1 bg-red-500/80 rounded-full hover:bg-red-600 transition-colors z-30 opacity-0 group-hover:opacity-100"
                title="删除"
             >
                 <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
             </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <div className={`w-10 h-10 rounded-full mb-3 flex items-center justify-center transition-transform group-hover:scale-110 ${file ? 'bg-brand-500/20 text-brand-500' : 'bg-gray-800 text-gray-400'}`}>
              {icon}
            </div>
            <span className="text-sm font-medium text-gray-300">{label}</span>
            <span className="text-[10px] text-gray-500 mt-1">点击上传</span>
          </div>
        )}
      </div>
    </div>
  );
};

const UploadZone: React.FC<UploadZoneProps> = ({ assets, onAssetChange }) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-400 mb-3">
        <div className="flex items-center gap-2">
           <IconUpload className="w-4 h-4" />
           <span>1. 上传服装单品 (至少上传一件)</span>
        </div>
      </label>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <UploadSlot 
          type="top" 
          label="上装" 
          icon={<IconShirt className="w-5 h-5" />}
          file={assets.top}
          onChange={(f) => onAssetChange('top', f)}
        />
        <UploadSlot 
          type="bottom" 
          label="下装" 
          icon={<IconPants className="w-5 h-5" />}
          file={assets.bottom}
          onChange={(f) => onAssetChange('bottom', f)}
        />
        <UploadSlot 
          type="shoes" 
          label="鞋履" 
          icon={<IconFootwear className="w-5 h-5" />}
          file={assets.shoes}
          onChange={(f) => onAssetChange('shoes', f)}
        />
        <UploadSlot 
          type="accessories" 
          label="配饰/包袋" 
          icon={<IconAccessories className="w-5 h-5" />}
          file={assets.accessories}
          onChange={(f) => onAssetChange('accessories', f)}
        />
      </div>
      <p className="text-xs text-gray-500 mt-3 ml-1">
        提示：AI 将自动识别并组合所有上传的单品。
      </p>
    </div>
  );
};

export default UploadZone;