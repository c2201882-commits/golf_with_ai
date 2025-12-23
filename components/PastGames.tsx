import React, { useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { FinishedRound } from '../types';
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
  const roundCardRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // Helper to render traditional symbols
  const renderTraditionalScore = (score: number, par: number) => {
    const diff = score - par;
    const baseClass = "inline-flex items-center justify-center w-8 h-8 font-black text-xs relative";
    
    if (diff === 1) { // Bogey -> Single Circle
      return <span className={`${baseClass} border-2 border-red-400 rounded-full text-red-500`}>{score}</span>;
    } else if (diff >= 2) { // Double Bogey+ -> Double Circle
      return (
        <span className={`${baseClass} border-2 border-red-500 rounded-full text-red-600`}>
           <span className="absolute inset-0.5 border border-red-500 rounded-full"></span>
           {score}
        </span>
      );
    } else if (diff === -1) { // Birdie -> Single Square
      return <span className={`${baseClass} border-2 border-blue-400 text-blue-500`}>{score}</span>;
    } else if (diff <= -2) { // Eagle+ -> Double Square
      return (
        <span className={`${baseClass} border-2 border-blue-600 text-blue-700`}>
           <span className="absolute inset-0.5 border border-blue-600"></span>
           {score}
        </span>
      );
    }
    
    return <span className={`${baseClass} text-gray-900`}>{score}</span>; // Par
  };

  const startAnalysis = (round: FinishedRound) => {
    setCurrentAnalyzingRound(round);
    setShowAnalysisModal(true);
    setAnalysisResult(null);
  };

  const handleRunAnalysis = async () => {
    if (!currentAnalyzingRound) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const apiKey = process.env.API_KEY;
      const round = currentAnalyzingRound;

      const scoreDiff = round.totalScore - round.totalPar;
      const scoreString = scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff === 0 ? 'Even' : `${scoreDiff}`;
      const { stats: clubStats } = getClubStats(round);
      
      const holesSummary = round.holes.map(h => 
        `Hole ${h.holeNumber} (Par ${h.par}): Score ${h.score}, Putts ${h.putts}, GIR: ${h.gir ? 'Yes' : 'No'}`
      ).join('\n');

      const clubSummary = clubStats.map(([club, count]) => `${club}: ${count}`).join(', ');

      const languageInstruction = state.language === 'zh-TW' 
          ? "Please reply in Traditional Chinese (Taiwanese Mandarin)." 
          : "Please reply in English.";

      const toneInstruction = analysisMode === 'gentle'
        ? "Tone: Be very encouraging, soft, and positive. Act like a supportive friend. Focus on the bright side and frame improvements as exciting new opportunities."
        : "Tone: Be strict, direct, and highly critical. Act like a tough professional PGA drill sergeant coach. Do not sugarcoat failures. Focus on technical flaws and high expectations for perfection.";

      const prompt = `
        Act as a professional PGA golf coach. Analyze the following round for a player named ${round.playerName}.
        ${languageInstruction}
        ${toneInstruction}

        **Round Summary:**
        - Course: ${round.courseName}
        - Total Score: ${round.totalScore} (${scoreString})
        - Total Par: ${round.totalPar}
        - Total Putts: ${round.totalPutts}
        
        **Club Usage:**
        ${clubSummary}

        **Hole-by-Hole Detail:**
        ${holesSummary}

        **Instructions:**
        1. Give a summary of the round according to your assigned tone.
        2. Identify 2-3 key areas for improvement.
        3. Suggest 1 specific drill to practice.
        4. Keep the response concise (under 250 words).
      `;

      const ai = new GoogleGenAI({ apiKey: apiKey || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAnalysisResult(response.text || "Could not generate analysis.");

    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      setAnalysisResult(`Error: ${error.message}. Please check your connection and API Key.`);
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

  const handleCopyAnalysis = () => {
    if (analysisResult) {
      navigator.clipboard.writeText(analysisResult);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    }
  };

  const handleExportImage = async (index: number) => {
    const cardElement = roundCardRefs.current[index];
    if (cardElement) {
        try {
            const dataUrl = await toPng(cardElement, { 
                backgroundColor: '#f3f4f6',
                style: {
                    borderRadius: '0'
                }
            });
            const link = document.createElement('a');
            link.download = `golf-scorecard-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to export image', err);
            alert('Export failed. Please try again.');
        }
    }
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
          const { stats: clubStats, totalShots } = getClubStats(round);
          const maxUsage = clubStats.length > 0 ? clubStats[0][1] : 0;
          const key = round.id || index;

          return (
            <div 
                key={key} 
                ref={el => roundCardRefs.current[index] = el}
                className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all group"
            >
                <button
                    onClick={(e) => handleDelete(e, index)}
                    className="absolute top-0 right-0 p-3 z-20 text-gray-400 hover:text-white hover:bg-red-500 rounded-bl-2xl transition-all cursor-pointer"
                >
                    <X size={20} />
                </button>

                <div 
                    onClick={() => toggleExpand(index)}
                    className="p-5 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors pr-12"
                >
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
                    <div className="flex justify-center -mb-2">
                        {expandedIndex === index ? <ChevronUp size={16} className="text-gray-300" /> : <ChevronDown size={16} className="text-gray-300" />}
                    </div>
                </div>

                {expandedIndex === index && (
                    <div className="border-t border-gray-100 bg-gray-50 animate-fade-in pb-4">
                        {/* Action Buttons: AI & Export */}
                        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 flex flex-col gap-2">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <Bot size={20} className="text-indigo-600" />
                                    <span className="text-xs font-bold text-indigo-800">{t('getProInsights')}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleExportImage(index)}
                                        className="flex items-center gap-2 bg-white text-gray-700 px-3 py-2 rounded-xl text-[10px] font-bold shadow-sm border border-gray-100 active:scale-95 transition-all"
                                    >
                                        <ImageIcon size={14} className="text-gray-400" /> {t('exportImage')}
                                    </button>
                                    <button 
                                        onClick={() => startAnalysis(round)}
                                        className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-xl text-[10px] font-bold shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
                                    >
                                        <Sparkles size={14} /> {t('analyzeRound')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 p-4 text-center border-b border-gray-200">
                            <div>
                                <div className="text-[10px] uppercase text-gray-400 font-bold">{t('holes')}</div>
                                <div className="font-bold">{round.holes.length}</div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-gray-400 font-bold">{t('putts')}</div>
                                <div className="font-bold">{round.totalPutts}</div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-gray-400 font-bold">{t('par')}</div>
                                <div className="font-bold">{round.totalPar}</div>
                            </div>
                        </div>

                        <div className="p-5 border-b border-gray-200 bg-white">
                             <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
                                    <BarChart size={16} className="text-primary"/>
                                    {t('clubUsage')}
                                </div>
                                <div className="text-xs text-gray-400">{t('totalShots')}: {totalShots}</div>
                             </div>
                             {clubStats.length > 0 ? (
                                 <div className="space-y-3">
                                     {clubStats.map(([club, count]) => {
                                         const barWidth = maxUsage > 0 ? (count / maxUsage) * 100 : 0;
                                         return (
                                             <div key={club} className="flex items-center gap-3 text-xs">
                                                 <div className="w-16 font-medium text-gray-600 truncate text-right">{club}</div>
                                                 <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                     <div className="h-full bg-primary rounded-full" style={{ width: `${barWidth}%` }}></div>
                                                 </div>
                                                 <div className="w-6 font-bold text-gray-800 text-right">{count}</div>
                                             </div>
                                         );
                                     })}
                                 </div>
                             ) : (
                                 <div className="text-center text-gray-400 text-xs py-2">No shots recorded</div>
                             )}
                        </div>

                        <div className="p-2">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2">{t('shotDetail')}</div>
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-100 text-gray-500 font-bold">
                                        <tr>
                                            <th className="py-3 text-center w-10">{t('hole')}</th>
                                            <th className="py-3 text-center">{t('par')}</th>
                                            <th className="py-3 text-center">{t('score')}</th>
                                            <th className="py-3 text-center">{t('putts')}</th>
                                            <th className="py-3 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {round.holes.map((h, hIdx) => {
                                            const holeKey = `${index}-${hIdx}`;
                                            const isHoleExpanded = expandedHoleIndex === holeKey;
                                            return (
                                                <React.Fragment key={holeKey}>
                                                    <tr onClick={() => toggleHoleExpand(index, hIdx)} className={`active:bg-gray-50 transition-colors cursor-pointer ${isHoleExpanded ? 'bg-green-50/30' : ''}`}>
                                                        <td className="py-3 text-center font-bold text-gray-500">{h.holeNumber}</td>
                                                        <td className="py-3 text-center text-gray-400">{h.par}</td>
                                                        <td className="py-3 text-center">
                                                            {renderTraditionalScore(h.score, h.par)}
                                                        </td>
                                                        <td className="py-3 text-center text-gray-500">{h.putts}</td>
                                                        <td className="py-3 text-center text-gray-300">
                                                            {isHoleExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                                        </td>
                                                    </tr>
                                                    {isHoleExpanded && (
                                                        <tr className="bg-white border-l-2 border-primary">
                                                            <td colSpan={5} className="p-3">
                                                                <div className="space-y-2">
                                                                    {h.shots.length > 0 ? h.shots.map((s, sIdx) => (
                                                                        <div key={s.id} className="flex items-center justify-between text-[11px] border-b border-gray-50 pb-1 last:border-0">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-[9px]">{sIdx + 1}</span>
                                                                                <span className="font-bold text-gray-700">{s.club}</span>
                                                                            </div>
                                                                            <span className="text-primary font-medium">{s.distance ? `${s.distance}y` : ''}</span>
                                                                        </div>
                                                                    )) : <div className="text-center text-gray-300 py-1 italic">No shot data</div>}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
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
          <button onClick={handleClearAll} className="inline-flex items-center gap-2 text-xs text-red-400 hover:text-red-600 font-bold border border-red-100 hover:border-red-300 px-4 py-2 rounded-lg transition-colors">
              <Trash2 size={14} /> {t('clearHistory')}
          </button>
      </div>

      {/* --- AI Analysis Modal --- */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className={`p-4 text-white flex justify-between items-center shrink-0 transition-colors ${analysisMode === 'gentle' ? 'bg-indigo-600' : 'bg-gray-900'}`}>
                    <div className="flex items-center gap-2 font-bold text-lg">
                        {analysisMode === 'gentle' ? <Heart size={20} className="text-pink-300" /> : <ShieldAlert size={20} className="text-orange-400" />}
                        {t('aiCoach')}
                    </div>
                    <button onClick={closeAnalysisModal} className="p-1 hover:bg-white/20 rounded-full">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto bg-white">
                    {/* Mode Selector */}
                    {!analysisResult && !isAnalyzing && (
                      <div className="mb-6">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t('analysisMode')}</label>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                          <button 
                            onClick={() => setAnalysisMode('gentle')}
                            className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all ${analysisMode === 'gentle' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
                          >
                            <Heart size={16} /> {t('gentleMode')}
                          </button>
                          <button 
                            onClick={() => setAnalysisMode('strict')}
                            className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all ${analysisMode === 'strict' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                          >
                            <ShieldAlert size={16} /> {t('strictMode')}
                          </button>
                        </div>
                      </div>
                    )}

                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <Loader2 size={48} className={`${analysisMode === 'gentle' ? 'text-indigo-600' : 'text-gray-900'} animate-spin`} />
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-gray-800">{t('analyzing')}</h3>
                                <p className="text-xs text-gray-400 mt-1">{analysisMode === 'gentle' ? 'Preparing something sweet...' : 'Calibrating expectations...'}</p>
                            </div>
                        </div>
                    ) : analysisResult ? (
                        <div className="prose prose-sm max-w-none">
                            <div className={`whitespace-pre-wrap leading-relaxed font-medium ${analysisMode === 'gentle' ? 'text-gray-700' : 'text-gray-900'}`}>
                                {analysisResult}
                            </div>
                            <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center italic">
                                *AI suggestions are based on your {analysisMode === 'gentle' ? 'wonderful' : 'recorded'} round data.
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                          <p className="text-gray-500 mb-8 px-4">
                            {analysisMode === 'gentle' 
                              ? "Select this for a supportive and encouraging analysis of your performance!" 
                              : "Select this if you want direct, no-nonsense feedback on where you missed the mark."}
                          </p>
                          <button 
                            onClick={handleRunAnalysis}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all text-white flex items-center justify-center gap-3 ${analysisMode === 'gentle' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-900 hover:bg-black'}`}
                          >
                            <Sparkles size={20} /> {t('analyzeRound')}
                          </button>
                        </div>
                    )}
                </div>

                {(analysisResult || isAnalyzing) && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 flex gap-2">
                        {analysisResult && (
                            <button 
                                onClick={handleCopyAnalysis}
                                className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                {copying ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                                {copying ? t('copied') : t('copy')}
                            </button>
                        )}
                        <button 
                            disabled={isAnalyzing}
                            onClick={closeAnalysisModal}
                            className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50"
                        >
                            {t('close')}
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

    </div>
  );
};