import React from 'react';
import { GenerationConfig, Gender, VideoAspectRatio } from '../types';
import { IconUser, IconSettings, IconVideo, IconShirt } from './Icons';

interface ConfigPanelProps {
  config: GenerationConfig;
  onChange: (newConfig: GenerationConfig) => void;
  disabled: boolean;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange, disabled }) => {
  
  const updateConfig = (key: keyof GenerationConfig, value: any) => {
    // If changing gender, reset modelId to a valid one for that gender if needed
    // For simplicity, we just update the gender and let the user pick a model
    if (key === 'gender' && value !== config.gender) {
        // Find first model of new gender
        const firstModel = MODEL_CHARACTERS.find(m => m.gender === value);
        if (firstModel) {
            onChange({ ...config, gender: value, modelId: firstModel.id });
            return;
        }
    }
    onChange({ ...config, [key]: value });
  };

  const modelStyles = [
    { id: 'casual', label: '日常休闲 (Casual)', desc: '自然放松的展示' },
    { id: 'runway', label: 'T台走秀 (Runway)', desc: '专业模特步态' },
    { id: 'studio', label: '影棚拍摄 (Studio)', desc: '极简背景，聚焦服装' },
    { id: 'street', label: '街头抓拍 (Street)', desc: '动态感强的街拍风格' },
    { id: 'cinematic', label: '电影质感 (Cinematic)', desc: '戏剧性光影与色调' },
    { id: 'nature', label: '自然外景 (Nature)', desc: '阳光明媚的户外场景' },
    { id: 'vintage', label: '复古胶片 (Vintage)', desc: '怀旧颗粒感风格' },
    { id: 'cyberpunk', label: '赛博朋克 (Cyberpunk)', desc: '霓虹夜景未来感' },
  ];

  const cameraAngles = [
    { id: 'Eye level shot', label: '平视视角 (Eye Level)' },
    { id: 'Low angle shot', label: '仰视视角 (Low Angle)' },
    { id: 'High angle shot', label: '俯视视角 (High Angle)' },
    { id: 'Tracking shot', label: '跟随镜头 (Tracking)' },
    { id: '360 degree pan', label: '环绕镜头 (360°)' },
    { id: 'Close-up pan', label: '特写推拉 (Close-up)' },
    { id: 'Handheld', label: '手持动感 (Handheld)' },
    { id: 'Slow zoom in', label: '缓慢推进 (Zoom In)' },
  ];

  const MODEL_CHARACTERS = [
    { id: 'sofia', name: 'Sofia', gender: 'female', desc: 'Caucasian female model, blonde hair', emoji: '👱‍♀️', bg: 'bg-rose-100 text-rose-600' },
    { id: 'li', name: 'Li', gender: 'female', desc: 'East Asian female model, black straight hair', emoji: '👩🏻', bg: 'bg-amber-100 text-amber-600' },
    { id: 'zara', name: 'Zara', gender: 'female', desc: 'Black female model, curly hair', emoji: '👩🏾', bg: 'bg-stone-200 text-stone-700' },
    { id: 'david', name: 'David', gender: 'male', desc: 'Caucasian male model, short brown hair', emoji: '👨🏼', bg: 'bg-blue-100 text-blue-600' },
    { id: 'ken', name: 'Ken', gender: 'male', desc: 'Asian male model, stylish short hair', emoji: '👨🏻', bg: 'bg-indigo-100 text-indigo-600' },
    { id: 'marcus', name: 'Marcus', gender: 'male', desc: 'Black male model, athletic build', emoji: '👨🏿', bg: 'bg-slate-200 text-slate-700' },
  ];

  // Filter models by selected gender
  const availableModels = MODEL_CHARACTERS.filter(m => m.gender === config.gender);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Material Description Input - NEW */}
      <div className="bg-[#27272a] p-4 rounded-xl border border-gray-700/50">
        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
          <IconShirt className="w-4 h-4 text-brand-400" />
          <span>材质描述 (重要)</span>
        </label>
        <input 
          type="text"
          value={config.materialDesc || ''}
          onChange={(e) => updateConfig('materialDesc', e.target.value)}
          placeholder="例如：蓝色水洗牛仔、白色真丝、黑色哑光皮革..."
          disabled={disabled}
          className="w-full bg-[#1c1c1e] border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
        />
        <p className="text-xs text-gray-500 mt-2">
          * 准确描述面料（如棉麻、天鹅绒、牛仔）能显著提升生成视频的材质还原度。
        </p>
      </div>

      {/* Gender Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
          <IconUser className="w-4 h-4" />
          <span>2. 选择模特性别</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => updateConfig('gender', 'female')}
            disabled={disabled}
            className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2
              ${config.gender === 'female' 
                ? 'border-brand-500 bg-brand-500/10 text-white' 
                : 'border-gray-800 bg-[#1c1c1e] text-gray-400 hover:border-gray-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="text-xl">👩</span>
            <span className="font-medium">女性</span>
          </button>
          <button
            onClick={() => updateConfig('gender', 'male')}
            disabled={disabled}
            className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2
              ${config.gender === 'male' 
                ? 'border-brand-500 bg-brand-500/10 text-white' 
                : 'border-gray-800 bg-[#1c1c1e] text-gray-400 hover:border-gray-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
             <span className="text-xl">👨</span>
             <span className="font-medium">男性</span>
          </button>
        </div>
      </div>

      {/* Specific Model Selection */}
      <div>
         <label className="block text-sm font-medium text-gray-400 mb-3">
            选择具体模特
         </label>
         <div className="grid grid-cols-3 gap-3">
            {availableModels.map((model) => (
               <button
                  key={model.id}
                  disabled={disabled}
                  onClick={() => updateConfig('modelId', model.id)}
                  className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 group
                     ${config.modelId === model.id
                        ? 'border-brand-500 bg-[#27272a]'
                        : 'border-gray-800 bg-[#1c1c1e] hover:border-gray-600'
                     } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
               >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${model.bg} mb-1`}>
                     {model.emoji}
                  </div>
                  <span className={`text-xs font-medium ${config.modelId === model.id ? 'text-white' : 'text-gray-400'}`}>
                     {model.name}
                  </span>
                  {config.modelId === model.id && (
                     <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]"></div>
                  )}
               </button>
            ))}
         </div>
      </div>

      {/* Style Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
          <IconVideo className="w-4 h-4" />
          <span>3. 演示风格</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
          {modelStyles.map((style) => (
            <button
              key={style.id}
              disabled={disabled}
              onClick={() => updateConfig('style', style.id)}
              className={`p-3 rounded-lg border text-left transition-all
                ${config.style === style.id 
                  ? 'border-brand-500 bg-brand-500/10 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]' 
                  : 'border-gray-800 bg-[#1c1c1e] text-gray-400 hover:bg-[#27272a]'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="font-medium text-sm">{style.label}</div>
              <div className="text-xs text-gray-500 mt-1">{style.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Camera & Ratio */}
      <div>
         <label className="block text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
          <IconSettings className="w-4 h-4" />
          <span>4. 拍摄视角与画幅</span>
        </label>
        
        <div className="space-y-4">
          <div>
            <span className="text-xs text-gray-500 mb-2 block uppercase tracking-wider">运镜方式</span>
            <select
              value={config.cameraAngle}
              onChange={(e) => updateConfig('cameraAngle', e.target.value)}
              disabled={disabled}
              className="w-full bg-[#1c1c1e] border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            >
              {cameraAngles.map((angle) => (
                <option key={angle.id} value={angle.id}>{angle.label}</option>
              ))}
            </select>
          </div>

          <div>
             <span className="text-xs text-gray-500 mb-2 block uppercase tracking-wider">视频比例</span>
             <div className="flex gap-3">
               {(['9:16', '16:9'] as VideoAspectRatio[]).map((ratio) => (
                 <button
                    key={ratio}
                    onClick={() => updateConfig('aspectRatio', ratio)}
                    disabled={disabled}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                      config.aspectRatio === ratio
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-gray-800 bg-[#1c1c1e] text-gray-400'
                    }`}
                 >
                   {ratio === '9:16' ? '手机竖屏 (9:16)' : '宽屏影院 (16:9)'}
                 </button>
               ))}
             </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ConfigPanel;