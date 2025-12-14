import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { FinishedRound } from '../types';
import { ChevronDown, ChevronUp, Calendar, User, BarChart, X, Trash2, Sparkles, Bot, Loader2, Trophy } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export const PastGames: React.FC = () => {
  const { state, dispatch, t } = useGame();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
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

  // --- AI Analysis Logic ---
  const handleAnalyzeRound = async (round: FinishedRound) => {
    setIsAnalyzing(true);
    setShowAnalysisModal(true);
    setAnalysisResult(null);

    try {
      // 1. Construct the data prompt
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

      const prompt = `
        Act as a professional PGA golf coach. Analyze the following round for a player named ${round.playerName}.
        ${languageInstruction}

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
        1. Give a brief encouraging summary of the round.
        2. Identify 2-3 key areas for improvement based on the stats (e.g., putting average, scoring on Par 3s vs Par 5s, GIR conversion).
        3. Suggest 1 specific drill to practice before the next round.
        4. Keep the tone constructive, professional, and concise (under 200 words).
        5. Use simple formatting (bullet points).
      `;

      // 2. Call Gemini API
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setAnalysisResult(response.text || "Could not generate analysis. Please try again.");

    } catch (error) {
      console.error("AI Analysis Error:", error);
      setAnalysisResult("Sorry, I encountered an error analyzing your round. Please check your connection and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const closeAnalysisModal = () => {
    setShowAnalysisModal(false);
    setAnalysisResult(null);
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
            <div key={key} className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all group">
                
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
                    <div className="border-t border-gray-100 bg-gray-50 animate-fade-in">
                        {/* AI Analysis Button Area */}
                        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bot size={20} className="text-indigo-600" />
                                <span className="text-xs font-bold text-indigo-800">{t('getProInsights')}</span>
                            </div>
                            <button 
                                onClick={() => handleAnalyzeRound(round)}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
                            >
                                <Sparkles size={14} /> {t('analyzeRound')}
                            </button>
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

                        <div className="p-5 border-b border-gray-200">
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
                                                     <div 
                                                        className="h-full bg-primary rounded-full" 
                                                        style={{ width: `${barWidth}%` }}
                                                     ></div>
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

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-200 text-gray-600">
                                    <tr>
                                        <th className="py-2 text-center">{t('hole')}</th>
                                        <th className="py-2 text-center">{t('par')}</th>
                                        <th className="py-2 text-center">{t('score')}</th>
                                        <th className="py-2 text-center">{t('putts')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {round.holes.map((h, idx) => {
                                        const diff = h.score - h.par;
                                        const scoreColor = diff < 0 ? 'text-blue-600' : diff > 0 ? 'text-red-500' : 'text-gray-900';
                                        return (
                                            <tr key={idx}>
                                                <td className="py-2 text-center font-bold text-gray-500">{h.holeNumber}</td>
                                                <td className="py-2 text-center text-gray-400">{h.par}</td>
                                                <td className={`py-2 text-center font-bold ${scoreColor}`}>{h.score}</td>
                                                <td className="py-2 text-center text-gray-500">{h.putts}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center pb-8">
          <button 
            onClick={handleClearAll}
            className="inline-flex items-center gap-2 text-xs text-red-400 hover:text-red-600 font-bold border border-red-100 hover:border-red-300 px-4 py-2 rounded-lg transition-colors"
          >
              <Trash2 size={14} />
              {t('clearHistory')}
          </button>
      </div>

      {/* --- AI Analysis Modal --- */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="bg-indigo-600 p-4 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <Sparkles size={20} className="text-yellow-300" />
                        {t('aiCoach')}
                    </div>
                    <button onClick={closeAnalysisModal} className="p-1 hover:bg-indigo-700 rounded-full">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <Loader2 size={48} className="text-indigo-600 animate-spin" />
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-gray-800">{t('analyzing')}</h3>
                            </div>
                        </div>
                    ) : (
                        <div className="prose prose-sm prose-indigo max-w-none">
                            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed font-medium">
                                {analysisResult}
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center italic">
                                *AI suggestions are based on your scorecard data.
                            </div>
                        </div>
                    )}
                </div>

                {!isAnalyzing && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
                        <button 
                            onClick={closeAnalysisModal}
                            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors"
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