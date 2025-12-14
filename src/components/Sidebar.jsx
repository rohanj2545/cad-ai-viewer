import React, { useState } from 'react';
import { Upload, ChevronRight, ChevronLeft, Layers, PenTool, Sparkles, AlertCircle, Download, Command, Palette } from 'lucide-react';

const Sidebar = ({ 
  onFileUpload, 
  config, 
  onConfigChange, 
  onAnalyze, 
  aiAnalysis, 
  isAnalyzing,
  onThemePrompt,
  isGeneratingTheme,
  theme,
  onDownload,
  presetThemes,
  currentThemeName,
  onThemeSelect
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('view');
  const [themePrompt, setThemePrompt] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onFileUpload(event.target.result);
        }
      };
      reader.readAsText(file);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute left-4 top-4 bg-black/50 backdrop-blur-md border border-white/10 p-2 rounded-full text-white shadow-xl hover:bg-white/10 transition-all z-10"
      >
        <ChevronRight size={20} />
      </button>
    );
  }

  return (
    <div className="w-80 h-full bg-black/95 backdrop-blur-2xl border-r border-white/10 flex flex-col shadow-2xl z-10 transition-all duration-300">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Command size={16} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-wide">
            CAD<span className="text-cyan-400 font-light">.AI</span>
          </h1>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-2 gap-1 bg-black/20">
        <button 
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-all duration-300 ${
            activeTab === 'view' 
              ? 'bg-white/10 text-white shadow-inner border border-white/5' 
              : 'text-white/40 hover:text-white/70 hover:bg-white/5'
          }`}
          onClick={() => setActiveTab('view')}
        >
          <Layers size={14} /> Editor
        </button>
        <button 
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-all duration-300 ${
            activeTab === 'ai' 
              ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-200 border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.1)]' 
              : 'text-white/40 hover:text-white/70 hover:bg-white/5'
          }`}
          onClick={() => setActiveTab('ai')}
        >
          <Sparkles size={14} /> AI Engine
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-8 no-scrollbar">
        
        {activeTab === 'view' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Upload Section */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest pl-1">Input</h2>
              <label className="block w-full cursor-pointer group">
                <div className="border border-dashed border-white/20 rounded-xl p-6 text-center bg-white/5 hover:bg-white/10 hover:border-cyan-500/50 transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                  <Upload size={24} className="mx-auto mb-2 text-white/30 group-hover:text-cyan-400 transition-colors" />
                  <div className="text-white/60 group-hover:text-white text-xs font-medium">
                    Drop DXF File Here
                  </div>
                  <input type="file" accept=".dxf" onChange={handleFileChange} className="hidden" />
                </div>
              </label>
            </div>

            {/* Dimension Controls */}
            <div className="space-y-3">
               <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest pl-1">Configuration</h2>
               <div className="bg-white/5 rounded-xl p-1 border border-white/5">
                  {[
                    { label: 'Linear Dimensions', key: 'linear' },
                    { label: 'Angular Dimensions', key: 'angular' },
                    { label: 'Radial Geometry', key: 'radius' },
                    { label: 'Bounding Box', key: 'bounding' }
                  ].map((item) => (
                    <label key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group">
                      <span className="text-white/70 text-sm font-light group-hover:text-white transition-colors">{item.label}</span>
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          checked={config[item.key]} 
                          onChange={(e) => onConfigChange({...config, [item.key]: e.target.checked})}
                          className="peer sr-only"
                        />
                        <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white/50 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-white"></div>
                      </div>
                    </label>
                  ))}
               </div>
            </div>

            {/* Theme Selector */}
            <div className="space-y-3 pt-2 border-t border-white/10">
               <div className="flex justify-between items-center">
                 <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest pl-1">Interface Theme</h2>
                 <Palette size={14} className="text-white/20" />
               </div>
               
               <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                 <select 
                    value={currentThemeName}
                    onChange={(e) => onThemeSelect(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg text-sm text-white p-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all appearance-none cursor-pointer hover:bg-black/70"
                 >
                    {Object.keys(presetThemes).map(name => (
                        <option key={name} value={name} className="bg-gray-900 text-white py-2">{name}</option>
                    ))}
                    {currentThemeName === 'Custom (AI)' && (
                        <option value="Custom (AI)" className="bg-gray-900 text-purple-400 font-bold">Custom (AI)</option>
                    )}
                 </select>
                 
                 <div className="mt-4 flex gap-2 justify-between px-1">
                    <div className="flex flex-col items-center gap-1.5">
                        <div className="h-6 w-6 rounded-full border border-white/20 shadow-lg" style={{background: theme.background}} />
                        <span className="text-[9px] text-white/30 uppercase">Bg</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                        <div className="h-6 w-6 rounded-full border border-white/20 shadow-lg" style={{background: theme.lines}} />
                        <span className="text-[9px] text-white/30 uppercase">Line</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                        <div className="h-6 w-6 rounded-full border border-white/20 shadow-lg" style={{background: theme.dimensions}} />
                        <span className="text-[9px] text-white/30 uppercase">Dim</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                        <div className="h-6 w-6 rounded-full border border-white/20 shadow-lg" style={{background: theme.accent}} />
                        <span className="text-[9px] text-white/30 uppercase">Acc</span>
                    </div>
                 </div>
               </div>
            </div>

            {/* Download */}
            <div className="pt-2">
              <button 
                onClick={onDownload}
                className="w-full bg-white text-black font-semibold text-sm py-3 px-4 rounded-xl hover:bg-cyan-400 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-cyan-400/50"
              >
                <Download size={16} /> Export DXF
              </button>
            </div>

          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Analysis */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                 <Sparkles size={16} className="text-cyan-400" />
                 <h2 className="text-sm font-semibold text-white">Analysis Engine</h2>
              </div>
              
              <button 
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/50"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center justify-center gap-2">
                   {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Analyze Geometry'}
                </span>
              </button>
              
              {aiAnalysis && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 text-sm text-white/80 leading-relaxed border border-white/10 shadow-inner">
                  {aiAnalysis}
                </div>
              )}
            </div>

            {/* Styling */}
             <div className="space-y-3">
               <div className="flex items-center gap-2 mb-2">
                 <PenTool size={16} className="text-pink-400" />
                 <h2 className="text-sm font-semibold text-white">Generative Styler</h2>
              </div>
              <p className="text-xs text-white/40 mb-3">Natural language styling (e.g. "Neon Cyberpunk", "Architectural Blueprint")</p>
              
              <div className="relative">
                <input 
                  type="text" 
                  value={themePrompt}
                  onChange={(e) => setThemePrompt(e.target.value)}
                  placeholder="Describe a style..."
                  className="w-full bg-black/50 border border-white/20 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all placeholder:text-white/20"
                />
                <button 
                  onClick={() => onThemePrompt(themePrompt)}
                  disabled={isGeneratingTheme || !themePrompt}
                  className="absolute right-2 top-2 p-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg disabled:opacity-50 transition-all shadow-lg hover:shadow-pink-500/50"
                >
                  {isGeneratingTheme ? <Sparkles size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/5 rounded-xl flex gap-3 items-start">
              <AlertCircle size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-200/80 leading-relaxed">
                Connects to Google Gemini for geometric interpretation and style generation.
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;