import React, { useState, useMemo, useEffect } from 'react';
import CadViewer from './components/CadViewer';
import Sidebar from './components/Sidebar';
import { parseDXF } from './services/dxfParser';
import { generateDimensions } from './services/geometryUtils';
import { generateDXF } from './services/dxfWriter';
import { analyzeDrawing, generateTheme } from './services/geminiService';

// Predefined Themes
const PRESET_THEMES = {
  'Cyber Dark': {
    background: '#0a0a0a',
    lines: '#e2e8f0',
    dimensions: '#06b6d4',
    text: '#ffffff',
    grid: '#262626',
    accent: '#d946ef'
  },
  'Deep Ocean': {
    background: '#020617', // Slate 950
    lines: '#94a3b8',
    dimensions: '#fbbf24', // Amber
    text: '#f8fafc',
    grid: '#1e293b',
    accent: '#38bdf8'
  },
  'Neon Nights': {
    background: '#2e0225', // Dark Magenta
    lines: '#f5d0fe',
    dimensions: '#22d3ee', // Cyan
    text: '#fae8ff',
    grid: '#4a044e',
    accent: '#f0abfc'
  },
  'Matrix Code': {
    background: '#000000',
    lines: '#22c55e',
    dimensions: '#15803d',
    text: '#4ade80',
    grid: '#052e16',
    accent: '#86efac'
  },
  'Obsidian Red': {
    background: '#000000',
    lines: '#d1d5db',
    dimensions: '#ef4444', // Red
    text: '#ffffff',
    grid: '#374151',
    accent: '#dc2626'
  }
};

const App = () => {
  const [dxfContent, setDxfContent] = useState(null);
  const [entities, setEntities] = useState([]);
  const [config, setConfig] = useState({
    linear: true,
    angular: true,
    radius: true,
    bounding: true
  });
  
  // Theme State
  const [currentThemeName, setCurrentThemeName] = useState('Cyber Dark');
  const [theme, setTheme] = useState(PRESET_THEMES['Cyber Dark']);

  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);

  // Parse DXF when content changes
  useEffect(() => {
    if (dxfContent) {
      try {
        const parsed = parseDXF(dxfContent);
        setEntities(parsed);
        // Reset analysis when file changes
        setAnalysisResult(null);
      } catch (e) {
        console.error("Failed to parse DXF", e);
        alert("Error parsing DXF file. Ensure it is a valid text-based DXF.");
      }
    }
  }, [dxfContent]);

  // Calculate dimensions when entities or config change
  const dimensions = useMemo(() => {
    return generateDimensions(entities, config);
  }, [entities, config]);

  // Download Handler
  const handleDownload = () => {
    if (entities.length === 0) {
      alert("No drawing to download.");
      return;
    }
    const outputDXF = generateDXF(entities, dimensions);
    const blob = new Blob([outputDXF], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'autodimensioned.dxf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Theme Handlers
  const handleThemeSelect = (name) => {
    if (PRESET_THEMES[name]) {
        setCurrentThemeName(name);
        setTheme(PRESET_THEMES[name]);
    }
  };

  // AI Handlers
  const handleAnalyze = async () => {
    if (entities.length === 0) {
      setAnalysisResult("Please upload a drawing first.");
      return;
    }
    
    setIsAnalyzing(true);
    // Create a lightweight summary for AI
    const lineCount = entities.filter(e => e.type === 'LINE').length;
    const polyCount = entities.filter(e => e.type === 'LWPOLYLINE').length;
    const circleCount = entities.filter(e => e.type === 'CIRCLE').length;
    const summary = `Drawing contains ${lineCount} lines, ${polyCount} polylines and ${circleCount} circles. It has a mix of linear, angular, and radial geometry.`;
    
    const result = await analyzeDrawing(summary);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const handleThemePrompt = async (prompt) => {
    setIsGeneratingTheme(true);
    const newTheme = await generateTheme(prompt);
    if (newTheme) {
      setTheme(newTheme);
      setCurrentThemeName('Custom (AI)');
    }
    setIsGeneratingTheme(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-white font-sans selection:bg-cyan-500/30">
      <Sidebar 
        onFileUpload={setDxfContent}
        config={config}
        onConfigChange={setConfig}
        onAnalyze={handleAnalyze}
        aiAnalysis={analysisResult}
        isAnalyzing={isAnalyzing}
        onThemePrompt={handleThemePrompt}
        isGeneratingTheme={isGeneratingTheme}
        theme={theme}
        onDownload={handleDownload}
        presetThemes={PRESET_THEMES}
        currentThemeName={currentThemeName}
        onThemeSelect={handleThemeSelect}
      />
      
      <main className="flex-1 relative bg-gradient-to-br from-gray-900 via-black to-black transition-colors duration-500">
        {entities.length > 0 ? (
          <div className="absolute inset-0">
            <CadViewer 
              entities={entities} 
              dimensions={dimensions}
              theme={theme}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/30 flex-col gap-6">
            <div className="w-24 h-24 border border-white/10 border-dashed rounded-2xl flex items-center justify-center bg-white/5 animate-pulse">
               <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
               </svg>
            </div>
            <div className="text-center">
               <p className="text-sm font-medium text-white/50 tracking-wide">NO DRAWING LOADED</p>
               <p className="text-xs text-white/30 mt-1">Upload a DXF to initialize the engine</p>
            </div>
          </div>
        )}
        
        {/* Overlay Info - Minimalist */}
        <div className="absolute bottom-8 right-8 pointer-events-none">
             <div className="bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl flex gap-6">
                {entities.length > 0 ? (
                    <>
                        <div>
                           <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Entities</p>
                           <p className="text-lg font-light text-white font-mono">{entities.length}</p>
                        </div>
                        <div className="w-px bg-white/10"></div>
                        <div>
                           <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Dimensions</p>
                           <p className="text-lg font-light text-cyan-400 font-mono">{dimensions.length}</p>
                        </div>
                    </>
                ) : (
                    <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Status</p>
                        <p className="text-sm font-medium text-white">IDLE</p>
                    </div>
                )}
             </div>
        </div>
      </main>
    </div>
  );
};

export default App;