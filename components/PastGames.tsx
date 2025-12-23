import React, { useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { FinishedRound, RoundHoleData } from '../types';
import { ChevronDown, ChevronUp, Calendar, User, BarChart, X, Trash2, Sparkles, Bot, Loader2, Trophy, Heart, ShieldAlert, Copy, Check, Download, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { toPng } from 'html-to-image';

type AnalysisMode = 'gentle' | 'strict';

export const PastGames: React.FC = () => {
  const { state, dispatch, t } = useGame();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [expandedHoleIndex, setExpandedHoleIndex] = useState<string | null>(null); 
  
  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('gentle');
  const [currentAnalyzingRound, setCurrentAnalyzingRound] = useState<FinishedRound | null>(null);
  const [copying, setCopying] = useState(false);

  // Refs for image export
  const exportRef = useRef<HTMLDivElement>(null);
  const [exportingRound, setExportingRound] = useState<FinishedRound | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
    setExpandedHoleIndex(null); 
  };

  const toggleHoleExpand = (roundIdx: number, holeIdx: number) => {
    const key = `${roundIdx}-${holeIdx}`;
    setExpandedHoleIndex(expandedHoleIndex === key ? null : key);
  };

  const handleDelete = (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); 
    if (window.confirm(t('confirmDelete'))) {
        if (expandedIndex === index) setExpandedIndex(null);
        dispatch({ type: 'DELETE_ROUND', payload: index });
    }
  };

  const handleClearAll = () => {
      if (window.confirm(t('confirmClear'))) {
          dispatch({ type: 'CLEAR_HISTORY' });
      }
  };

  const getClubStats = (round: FinishedRound) => {
      const stats: Record<string, number> = {};
      let totalShots = 0;
      round.holes.forEach(hole => {
          hole.shots.forEach(shot => {
              stats[shot.club] = (stats[shot.club] || 0) + 1;
              totalShots++;
          });
      });
      return {
          stats: Object.entries(stats).sort(([,a], [,b]) => b - a),
          totalShots
      };
  };

  // Helper to render traditional symbols based on the legend: Circles for under par, Squares for over par
  const renderTraditionalScore = (score: number, par: number, forceColor?: string) => {
    const diff = score - par;
    const baseClass = `inline-flex items-center justify-center w-7 h-7 font-black text-xs relative ${forceColor || 'text-gray-900'}`;
    const borderStyle = { borderColor: forceColor || '#d1d5db' };
    
    if (diff === 0) {
        return <span className={baseClass}>{score}</span>;
    } else if (diff === -1) {
        return <span className={`${baseClass} border rounded-full`} style={borderStyle}>{score}</span>;
    } else if (diff <= -2) {
        return (
            <span className={`${baseClass} border rounded-full`} style={borderStyle}>
                <span className={`absolute inset-[1px] border rounded-full`} style={borderStyle}></span>
                {score}
            </span>
        );
    } else if (diff === 1) {
        return <span className={`${baseClass} border`} style={borderStyle}>{score}</span>;
    } else if (diff === 2) {
        return (
            <span className={`${baseClass} border`} style={borderStyle}>
                <span className={`absolute inset-[1px] border`} style={borderStyle}></span>
                {score}
            </span>
        );
    } else if (diff >= 3) {
        return (
            <span className={`${baseClass} text-white z-10 font-black`}>
                <svg className="absolute inset-0 w-full h-full -z-10 text-red-500 scale-110" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L14.4 5.6H18.4L18.4 9.6L22 12L18.4 14.4V18.4H14.4L12 22L9.6 18.4H5.6V14.4L2 12L5.6 9.6V5.6H9.6L12 2Z" />
                </svg>
                {score}
            </span>
        );
    }
    
    return <span className={baseClass}>{score}</span>;
  };

  const handleExportImage = async (round: FinishedRound) => {
    setExportingRound(round);
    setTimeout(async () => {
        if (exportRef.current) {
            try {
                const dataUrl = await toPng(exportRef.current, { 
                    quality: 1,
                    pixelRatio: 4, 
                    backgroundColor: '#ffffff'
                });
                const link = document.createElement('a');
                link.download = `Scorecard-${round.courseName}-${round.date}.png`;
                link.href = dataUrl;
                link.click();
            } catch (err) {
                console.error('Export failed', err);
            } finally {
                setExportingRound(null);
            }
        }
    }, 150);
  };

  const startAnalysis = (round: FinishedRound) => {
    setCurrentAnalyzingRound(round);
    setShowAnalysisModal(true);
    setAnalysisResult(null);
  };

  const handleRunAnalysis = async () => {
    if (!currentAnalyzingRound) return;
    setIsAnalyzing(true);
    try {
      const apiKey = process.env.API_KEY;
      const round = currentAnalyzingRound;
      const prompt = `Act as a PGA coach. Analyze round: ${round.courseName}, Score: ${round.totalScore}. Lang: ${state.language}. Max 200 words.`;
      const ai = new GoogleGenAI({ apiKey: apiKey || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAnalysisResult(response.text || "Could not generate analysis.");
    } catch (error: any) {
      setAnalysisResult(`Error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const closeAnalysisModal = () => {
    setShowAnalysisModal(false);
    setAnalysisResult(null);
    setCurrentAnalyzingRound(null);
    setIsAnalyzing(false);
  };

  if (state.pastRounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Trophy size={32} className="text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{t('noHistory')}</h2>
        <p className="text-gray-500">{t('finishRoundMsg')}</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-24 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('gameHistory')}</h2>
        <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-full">{state.pastRounds.length} {t('roundsArchived')}</span>
      </div>
      
      <div className="space-y-4">
        {state.pastRounds.map((round, index) => {
          const key = round.id || index;
          return (
            <div key={key} className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all group">
                <button onClick={(e) => handleDelete(e, index)} className="absolute top-0 right-0 p-3 z-20 text-gray-400 hover:text-white hover:bg-red-500 rounded-bl-2xl transition-all">
                    <X size={20} />
                </button>

                <div onClick={() => toggleExpand(index)} className="p-5 cursor-pointer hover:bg-gray-50 transition-colors pr-12">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 pr-2">{round.courseName || t('unknownCourse')}</h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <Calendar size={12} /> {round.date}
                                <span className="text-gray-300">|</span>
                                <User size={12} /> {round.playerName}
                            </div>
                        </div>
                        <div className="text-right mt-1 mr-2">
                             <div className={`text-2xl font-black leading-none ${round.totalScore - round.totalPar > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                {round.totalScore}
                            </div>
                             <div className="text-xs text-gray-400 font-bold mt-1">
                                {round.totalScore - round.totalPar > 0 ? `+${round.totalScore - round.totalPar}` : round.totalScore - round.totalPar === 0 ? 'E' : round.totalScore - round.totalPar}
                            </div>
                        </div>
                    </div>
                </div>

                {expandedIndex === index && (
                    <div className="border-t border-gray-100 bg-gray-50 animate-fade-in pb-4">
                        <div className="p-4 flex gap-2">
                            <button onClick={() => handleExportImage(round)} className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 py-3 rounded-xl text-sm font-bold shadow-sm border border-gray-100 active:scale-95 transition-all">
                                <ImageIcon size={18} className="text-blue-500" /> {t('exportImage')}
                            </button>
                            <button onClick={() => startAnalysis(round)} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all">
                                <Sparkles size={18} /> {t('analyzeRound')}
                            </button>
                        </div>

                        <div className="p-2">
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-100 text-gray-500 font-bold">
                                        <tr>
                                            <th className="py-3 text-center">{t('hole')}</th>
                                            <th className="py-3 text-center">{t('par')}</th>
                                            <th className="py-3 text-center">{t('score')}</th>
                                            <th className="py-3 text-center">{t('putts')}</th>
                                            <th className="py-3 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {round.holes.map((h, hIdx) => (
                                            <tr key={hIdx} onClick={() => toggleHoleExpand(index, hIdx)} className="cursor-pointer active:bg-gray-50">
                                                <td className="py-3 text-center font-bold text-gray-500">{h.holeNumber}</td>
                                                <td className="py-3 text-center text-gray-400">{h.par}</td>
                                                <td className="py-3 text-center">{renderTraditionalScore(h.score, h.par)}</td>
                                                <td className="py-3 text-center text-gray-500">{h.putts}</td>
                                                <td className="py-3 text-center text-gray-300">
                                                    {expandedHoleIndex === `${index}-${hIdx}` ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center pb-8">
          <button onClick={handleClearAll} className="inline-flex items-center gap-2 text-xs text-red-400 hover:text-red-600 font-bold border border-red-100 px-4 py-2 rounded-lg">
              <Trash2 size={14} /> {t('clearHistory')}
          </button>
      </div>

      {/* --- EXPORT TEMPLATE (Horizontal 18-Hole Layout) --- */}
      {exportingRound && (
        <div className="fixed top-[-9999px] left-[-9999px]">
            <div 
                ref={exportRef} 
                className="w-[1000px] bg-[#f8fafc] p-10 flex flex-col font-sans text-[#1e3a8a]"
            >
                {/* Header Info */}
                <div className="flex justify-between items-end mb-6 border-b-2 border-[#1e3a8a] pb-4">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase">{exportingRound.courseName}</h1>
                        <p className="text-xl font-bold opacity-60 mt-1">{exportingRound.date}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-black uppercase tracking-widest opacity-40">Scorecard Player</div>
                        <div className="text-3xl font-black">{exportingRound.playerName.toUpperCase()}</div>
                    </div>
                </div>

                <div className="flex gap-10">
                    {/* Front 9 (1-9) */}
                    <div className="flex-1 border-4 border-[#1e3a8a]">
                        <div className="grid grid-cols-[100px_repeat(9,1fr)] items-center text-center border-b-2 border-[#1e3a8a] bg-[#eff6ff]">
                            <div className="py-4 font-black border-r-2 border-[#1e3a8a]">HOLE</div>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <div key={num} className="py-4 font-black border-r border-[#1e3a8a] last:border-r-0">{num}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-[100px_repeat(9,1fr)] items-center text-center border-b-2 border-[#1e3a8a]">
                            <div className="py-4 font-bold border-r-2 border-[#1e3a8a] bg-white">PAR</div>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                                const hole = exportingRound.holes.find(h => h.holeNumber === num);
                                return <div key={num} className="py-4 font-bold border-r border-[#1e3a8a] last:border-r-0 opacity-60 italic">{hole?.par || '-'}</div>;
                            })}
                        </div>
                        <div className="grid grid-cols-[100px_repeat(9,1fr)] items-center text-center bg-white relative">
                            <div className="absolute left-0 h-full w-[100px] flex items-center justify-center font-black text-[10px] uppercase tracking-widest text-[#1e3a8a] [writing-mode:vertical-lr] border-r-2 border-[#1e3a8a] bg-[#eff6ff] leading-none py-1">
                                {exportingRound.playerName.slice(0, 10)}
                            </div>
                            <div className="invisible py-6">H</div> {/* Spacer for height */}
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                                const hole = exportingRound.holes.find(h => h.holeNumber === num);
                                return (
                                    <div key={num} className="flex justify-center items-center py-4 border-r border-[#1e3a8a] last:border-r-0 h-full">
                                        {hole ? renderTraditionalScore(hole.score, hole.par, '#1e3a8a') : '-'}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Back 9 (10-18) + Total */}
                    <div className="flex-1 border-4 border-[#1e3a8a]">
                        <div className="grid grid-cols-[100px_repeat(9,1fr)_100px] items-center text-center border-b-2 border-[#1e3a8a] bg-[#eff6ff]">
                            <div className="py-4 font-black border-r-2 border-[#1e3a8a]">HOLE</div>
                            {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(num => (
                                <div key={num} className="py-4 font-black border-r border-[#1e3a8a]">{num}</div>
                            ))}
                            <div className="py-4 font-black bg-[#1e3a8a] text-white">TOTAL</div>
                        </div>
                        <div className="grid grid-cols-[100px_repeat(9,1fr)_100px] items-center text-center border-b-2 border-[#1e3a8a]">
                            <div className="py-4 font-bold border-r-2 border-[#1e3a8a] bg-white">PAR</div>
                            {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(num => {
                                const hole = exportingRound.holes.find(h => h.holeNumber === num);
                                return <div key={num} className="py-4 font-bold border-r border-[#1e3a8a] opacity-60 italic">{hole?.par || '-'}</div>;
                            })}
                            <div className="py-4 font-black bg-[#eff6ff]">{exportingRound.totalPar}</div>
                        </div>
                        <div className="grid grid-cols-[100px_repeat(9,1fr)_100px] items-center text-center bg-white relative">
                             <div className="absolute left-0 h-full w-[100px] flex items-center justify-center font-black text-[10px] uppercase tracking-widest text-[#1e3a8a] [writing-mode:vertical-lr] border-r-2 border-[#1e3a8a] bg-[#eff6ff] leading-none py-1">
                                {exportingRound.playerName.slice(0, 10)}
                            </div>
                            <div className="invisible py-6">H</div>
                            {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(num => {
                                const hole = exportingRound.holes.find(h => h.holeNumber === num);
                                return (
                                    <div key={num} className="flex justify-center items-center py-4 border-r border-[#1e3a8a] h-full">
                                        {hole ? renderTraditionalScore(hole.score, hole.par, '#1e3a8a') : '-'}
                                    </div>
                                );
                            })}
                            <div className="py-4 font-black text-2xl bg-[#eff6ff] h-full flex items-center justify-center">{exportingRound.totalScore}</div>
                        </div>
                    </div>
                </div>

                {/* Footer Credits */}
                <div className="mt-8 text-sm flex justify-between items-center opacity-30 font-bold italic">
                    <span>Generated by GOLF MASTER PRO PWA</span>
                    <span>★ ★ ★ ★ ★</span>
                    <span>Verified Professional Scorecard</span>
                </div>
            </div>
        </div>
      )}

      {/* --- AI Analysis Modal --- */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className={`p-4 text-white flex justify-between items-center transition-colors ${analysisMode === 'gentle' ? 'bg-indigo-600' : 'bg-gray-900'}`}>
                    <div className="flex items-center gap-2 font-bold text-lg">
                        {analysisMode === 'gentle' ? <Heart size={20} className="text-pink-300" /> : <ShieldAlert size={20} className="text-orange-400" />}
                        {t('aiCoach')}
                    </div>
                    <button onClick={closeAnalysisModal} className="p-1 hover:bg-white/20 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto bg-white">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <Loader2 size={48} className="text-indigo-600 animate-spin" />
                            <h3 className="text-lg font-bold text-gray-800">{t('analyzing')}</h3>
                        </div>
                    ) : analysisResult ? (
                        <div className="prose prose-sm max-w-none">
                            <div className="whitespace-pre-wrap leading-relaxed font-medium text-gray-700">{analysisResult}</div>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                                <button onClick={() => setAnalysisMode('gentle')} className={`flex-1 py-3 rounded-lg text-sm font-bold ${analysisMode === 'gentle' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Gentle</button>
                                <button onClick={() => setAnalysisMode('strict')} className={`flex-1 py-3 rounded-lg text-sm font-bold ${analysisMode === 'strict' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>Strict</button>
                            </div>
                            <button onClick={handleRunAnalysis} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg active:scale-95 ${analysisMode === 'gentle' ? 'bg-indigo-600' : 'bg-gray-900'}`}>
                                <Sparkles size={20} className="inline mr-2" /> {t('analyzeRound')}
                            </button>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
                    <button onClick={closeAnalysisModal} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold">
                        {t('close')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};