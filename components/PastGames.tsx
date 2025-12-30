
import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { FinishedRound, RoundHoleData, Shot, ClubName } from '../types';
import { ChevronDown, ChevronUp, Calendar, User, BarChart, X, Trash2, Sparkles, Loader2, Trophy, Heart, ShieldAlert, ImageIcon, Info, Target, Edit3, Plus, Minus, Save, MessageSquare, Flame, Coffee } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { toPng } from 'html-to-image';

export const PastGames: React.FC = () => {
  const { state, dispatch, t } = useGame();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [expandedHoleIndex, setExpandedHoleIndex] = useState<string | null>(null); 
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [currentAnalyzingRound, setCurrentAnalyzingRound] = useState<FinishedRound | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'gentle' | 'strict'>('gentle');
  const [userQuestion, setUserQuestion] = useState('');

  // Archive Editing State
  const [editingArchivedHole, setEditingArchivedHole] = useState<{roundId: string, holeIdx: number} | null>(null);
  const [editArchiveShots, setEditArchiveShots] = useState<Shot[]>([]);
  const [editArchivePutts, setEditArchivePutts] = useState(0);

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

  const getClubStats = (round: FinishedRound) => {
      const stats: Record<string, number> = {};
      let totalShots = 0;
      round.holes.forEach(hole => {
          hole.shots.forEach(shot => {
              stats[shot.club] = (stats[shot.club] || 0) + 1;
              totalShots++;
          });
      });
      const sortedStats = Object.entries(stats).sort(([,a], [,b]) => b - a);
      const maxUsage = sortedStats.length > 0 ? sortedStats[0][1] : 1;
      return { stats: sortedStats, totalShots, maxUsage };
  };

  const renderTraditionalScore = (score: number, par: number, forceColor?: string, isLarge?: boolean) => {
    const diff = score - par;
    const size = isLarge ? 'w-8 h-8 text-sm' : 'w-7 h-7 text-xs';
    const baseClass = `inline-flex items-center justify-center ${size} font-black relative ${forceColor || 'text-gray-900'}`;
    const borderStyle = { borderColor: forceColor || '#d1d5db' };
    if (diff === 0) return <span className={baseClass}>{score}</span>;
    if (diff === -1) return <span className={`${baseClass} border rounded-full`} style={borderStyle}>{score}</span>;
    if (diff <= -2) return (
        <span className={`${baseClass} border rounded-full`} style={borderStyle}>
            <span className={`absolute inset-[1.5px] border rounded-full`} style={borderStyle}></span>
            {score}
        </span>
    );
    if (diff === 1) return <span className={`${baseClass} border`} style={borderStyle}>{score}</span>;
    if (diff === 2) return (
        <span className={`${baseClass} border`} style={borderStyle}>
            <span className={`absolute inset-[1.5px] border`} style={borderStyle}></span>
            {score}
        </span>
    );
    if (diff >= 3) return (
        <span className={`${baseClass} text-white z-10 font-black`}>
            <svg className="absolute inset-0 w-full h-full -z-10 text-red-500 scale-110" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.4 5.6H18.4L18.4 9.6L22 12L18.4 14.4V18.4H14.4L12 22L9.6 18.4H5.6V14.4L2 12L5.6 9.6V5.6H9.6L12 2Z" />
            </svg>
            {score}
        </span>
    );
    return <span className={baseClass}>{score}</span>;
  };

  const handleExportImage = async (round: FinishedRound) => {
    setExportingRound(round);
    setTimeout(async () => {
        if (exportRef.current) {
            try {
                const dataUrl = await toPng(exportRef.current, { quality: 1, pixelRatio: 3, backgroundColor: '#ffffff' });
                const link = document.createElement('a');
                link.download = `Scorecard-${round.courseName}-${round.date}.png`;
                link.href = dataUrl;
                link.click();
            } catch (err) { console.error('Export failed', err); } 
            finally { setExportingRound(null); }
        }
    }, 200);
  };

  const startAnalysis = (round: FinishedRound) => {
    setCurrentAnalyzingRound(round);
    setShowAnalysisModal(true);
    setAnalysisResult(null);
    setUserQuestion('');
  };

  const handleRunAnalysis = async () => {
    if (!currentAnalyzingRound) return;
    setIsAnalyzing(true);
    try {
      const apiKey = process.env.API_KEY;
      const round = currentAnalyzingRound;
      
      const modeInstruction = analysisMode === 'strict' 
        ? "Use a strict, critical, and brutally honest tone like a demanding drill sergeant coach. Focus on flaws and mistakes." 
        : "Use a warm, encouraging, and supportive tone like a kind mentor. Focus on achievements and small improvements.";

      const golfConstraint = "You are a professional PGA Golf Coach. You ONLY discuss golf. If the user asks anything not related to golf, politely but firmly refuse to answer and tell them to stay focused on the game.";
      
      const roundDataStr = JSON.stringify(round.holes.map(h => ({
        h: h.holeNumber, p: h.par, s: h.score, putts: h.putts, gir: h.gir, clubs: h.shots.map(s => s.club)
      })));

      const prompt = `
        ${golfConstraint}
        ${modeInstruction}
        
        Round Details:
        Course: ${round.courseName}
        Player Score: ${round.totalScore} (Par: ${round.totalPar})
        Language: ${state.language}
        
        Hole Data: ${roundDataStr}
        
        ${userQuestion ? `User Question: "${userQuestion}"` : "Please provide a general review of this round."}
        
        Keep your response concise and impactful (max 250 words). Format with clear headings or bullet points if needed.
      `;

      const ai = new GoogleGenAI({ apiKey: apiKey || '' });
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt,
        config: {
          temperature: analysisMode === 'strict' ? 0.9 : 0.7,
        }
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
    setUserQuestion('');
  };

  // Archive Editing Functions
  const openArchiveEdit = (roundId: string, holeIdx: number, holeData: RoundHoleData) => {
    setEditingArchivedHole({ roundId, holeIdx });
    setEditArchiveShots([...holeData.shots]);
    setEditArchivePutts(holeData.putts);
  };

  const updateArchiveShotClub = (idx: number, club: ClubName) => {
    const newShots = [...editArchiveShots];
    newShots[idx] = { ...newShots[idx], club };
    setEditArchiveShots(newShots);
  };

  const addArchiveShot = () => {
    const newShot: Shot = { id: Date.now().toString(), club: state.myBag[0] || '7 Iron', distance: null, timestamp: Date.now() };
    setEditArchiveShots([...editArchiveShots, newShot]);
  };

  const removeArchiveShot = (idx: number) => {
    setEditArchiveShots(editArchiveShots.filter((_, i) => i !== idx));
  };

  const saveArchiveEdit = () => {
    if (!editingArchivedHole) return;
    const { roundId, holeIdx } = editingArchivedHole;
    const roundToUpdate = state.pastRounds.find(r => r.id === roundId);
    if (!roundToUpdate) return;

    const updatedHoles = [...roundToUpdate.holes];
    const holeData = updatedHoles[holeIdx];
    
    const score = editArchiveShots.length;
    const gir = (score - editArchivePutts) <= (holeData.par - 2);

    updatedHoles[holeIdx] = {
        ...holeData,
        shots: editArchiveShots,
        score: score,
        putts: editArchivePutts,
        gir: gir
    };

    const totalScore = updatedHoles.reduce((acc, h) => acc + h.score, 0);
    const totalPutts = updatedHoles.reduce((acc, h) => acc + h.putts, 0);

    const updatedRound: FinishedRound = {
        ...roundToUpdate,
        holes: updatedHoles,
        totalScore,
        totalPutts
    };

    dispatch({ type: 'UPDATE_PAST_ROUND', payload: { roundId, updatedRound } });
    setEditingArchivedHole(null);
  };

  if (state.pastRounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><Trophy size={32} className="text-gray-400" /></div>
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
          const { stats: clubStats, totalShots, maxUsage } = getClubStats(round);
          return (
            <div key={round.id} className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all group">
                <button onClick={(e) => handleDelete(e, index)} className="absolute top-0 right-0 p-3 z-20 text-gray-400 hover:text-white hover:bg-red-500 rounded-bl-2xl transition-all"><X size={20} /></button>
                <div onClick={() => toggleExpand(index)} className="p-5 cursor-pointer hover:bg-gray-50 transition-colors pr-12">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 pr-2">{round.courseName || t('unknownCourse')}</h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1"><Calendar size={12} /> {round.date} <span className="text-gray-300">|</span> <User size={12} /> {round.playerName}</div>
                        </div>
                        <div className="text-right mt-1 mr-2">
                             <div className={`text-2xl font-black leading-none ${round.totalScore - round.totalPar > 0 ? 'text-red-500' : 'text-blue-500'}`}>{round.totalScore}</div>
                             <div className="text-xs text-gray-400 font-bold mt-1">{round.totalScore - round.totalPar > 0 ? `+${round.totalScore - round.totalPar}` : round.totalScore - round.totalPar === 0 ? 'E' : round.totalScore - round.totalPar}</div>
                        </div>
                    </div>
                </div>

                {expandedIndex === index && (
                    <div className="border-t border-gray-100 bg-gray-50 animate-fade-in pb-4">
                        <div className="px-5 py-5 border-b border-gray-200/60">
                           <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                              <span className="flex items-center gap-2"><BarChart size={12} className="text-primary"/> {t('clubUsage')}</span>
                              <span className="text-gray-300 font-bold">{totalShots} {t('totalShots')}</span>
                           </div>
                           <div className="space-y-3">
                               {clubStats.map(([club, count]) => (
                                   <div key={club} className="flex flex-col gap-1">
                                       <div className="flex justify-between items-center text-[11px] font-bold text-gray-700"><span className="uppercase">{club}</span><span className="bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">{count}</span></div>
                                       <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-gradient-to-r from-primary to-green-500 transition-all duration-1000 ease-out" style={{ width: `${(count / maxUsage) * 100}%` }} /></div>
                                   </div>
                               ))}
                           </div>
                        </div>
                        <div className="p-4 flex gap-2">
                            <button onClick={() => handleExportImage(round)} className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 py-3 rounded-xl text-xs font-bold shadow-sm border border-gray-100 active:scale-95 transition-all"><ImageIcon size={16} className="text-blue-500" /> {t('exportImage')}</button>
                            <button onClick={() => startAnalysis(round)} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"><Sparkles size={16} /> {t('analyzeRound')}</button>
                        </div>
                        <div className="p-2">
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-tighter">
                                        <tr><th className="py-3 text-center">{t('hole')}</th><th className="py-3 text-center">{t('par')}</th><th className="py-3 text-center">{t('score')}</th><th className="py-3 text-center">{t('putts')}</th><th className="py-3 w-8"></th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {round.holes.map((h, hIdx) => {
                                            const holeKey = `${index}-${hIdx}`;
                                            const isHoleExpanded = expandedHoleIndex === holeKey;
                                            return (
                                                <React.Fragment key={holeKey}>
                                                    <tr onClick={() => toggleHoleExpand(index, hIdx)} className={`cursor-pointer transition-colors ${isHoleExpanded ? 'bg-blue-50/50' : 'active:bg-gray-50'}`}>
                                                        <td className="py-3 text-center font-bold text-gray-500">{h.holeNumber}</td>
                                                        <td className="py-3 text-center text-gray-400 font-medium">{h.par}</td>
                                                        <td className="py-3 text-center">{renderTraditionalScore(h.score, h.par)}</td>
                                                        <td className="py-3 text-center text-gray-500 font-bold">{h.putts}</td>
                                                        <td className="py-3 text-center text-gray-300">{isHoleExpanded ? <ChevronUp size={14}/> : <Info size={14} className="opacity-50" />}</td>
                                                    </tr>
                                                    {isHoleExpanded && (
                                                        <tr className="bg-gray-50/30">
                                                            <td colSpan={5} className="p-4 border-l-4 border-primary">
                                                                <div className="flex justify-between items-center mb-3">
                                                                    <div className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2"><Target size={12}/> {t('shotDetail')}</div>
                                                                    <button onClick={() => openArchiveEdit(round.id, hIdx, h)} className="flex items-center gap-1 text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100 active:scale-95"><Edit3 size={12}/> EDIT HOLE</button>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {h.shots.length > 0 ? h.shots.map((s, sIdx) => (
                                                                        <div key={s.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between animate-slide-up" style={{animationDelay: `${sIdx * 0.05}s`}}>
                                                                            <div className="flex items-center gap-3"><span className="w-5 h-5 bg-gray-900 text-white rounded-full flex items-center justify-center font-black text-[10px]">{sIdx + 1}</span><span className="font-black text-gray-800 text-[11px] uppercase tracking-tighter">{s.club}</span></div>
                                                                            <div className="flex items-center gap-1">{s.distance ? <span className="text-primary font-black text-[12px]">{s.distance}y</span> : <span className="text-gray-300 text-[10px]">--</span>}</div>
                                                                        </div>
                                                                    )) : <div className="text-center text-gray-300 py-2 italic text-[11px]">No data available</div>}
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

      {/* --- Archive Edit Modal --- */}
      {editingArchivedHole && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="bg-gray-900 p-6 text-white flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="text-lg font-black tracking-tighter uppercase">{t('edit')} Hole {state.pastRounds.find(r => r.id === editingArchivedHole.roundId)?.holes[editingArchivedHole.holeIdx].holeNumber}</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Adjust strokes & clubs</p>
                      </div>
                      <button onClick={() => setEditingArchivedHole(null)} className="p-2 bg-white/10 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Strokes ({editArchiveShots.length})</label>
                          {editArchiveShots.map((s, idx) => (
                              <div key={s.id} className="flex gap-2 items-center animate-slide-up">
                                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-black">{idx + 1}</div>
                                  <select 
                                      value={s.club} 
                                      onChange={(e) => updateArchiveShotClub(idx, e.target.value)}
                                      className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm focus:outline-none focus:border-indigo-500 appearance-none"
                                  >
                                      {state.myBag.map(c => <option key={c} value={c}>{c}</option>)}
                                      <option value="Penalty">Penalty</option>
                                  </select>
                                  <button onClick={() => removeArchiveShot(idx)} className="p-2.5 text-red-500 bg-red-50 rounded-xl active:scale-95 transition-transform"><Trash2 size={18}/></button>
                              </div>
                          ))}
                          <button onClick={addArchiveShot} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-gray-400 font-bold text-sm hover:border-indigo-200 hover:text-indigo-500 transition-all"><Plus size={16}/> Add Stroke</button>
                      </div>
                      
                      <div className="bg-indigo-50/50 p-6 rounded-3xl space-y-4 border border-indigo-100">
                          <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block text-center">Putts</label>
                          <div className="flex items-center justify-center gap-8">
                              <button onClick={() => setEditArchivePutts(Math.max(0, editArchivePutts - 1))} className="p-4 bg-white rounded-2xl text-indigo-600 shadow-sm border border-indigo-100 active:scale-90 transition-transform"><Minus size={20}/></button>
                              <span className="text-4xl font-black text-indigo-700">{editArchivePutts}</span>
                              <button onClick={() => setEditArchivePutts(editArchivePutts + 1)} className="p-4 bg-white rounded-2xl text-indigo-600 shadow-sm border border-indigo-100 active:scale-90 transition-transform"><Plus size={20}/></button>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0">
                      <button onClick={saveArchiveEdit} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"><Save size={20}/> {t('saveChanges')}</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- AI Analysis Modal --- */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className={`p-5 text-white flex justify-between items-center transition-colors duration-500 ${analysisMode === 'strict' ? 'bg-red-600' : 'bg-indigo-600'}`}>
                    <div className="flex items-center gap-2 font-black tracking-tight text-lg">
                      <Sparkles size={20} className="animate-pulse" />
                      {t('aiCoach')}
                    </div>
                    <button onClick={closeAnalysisModal} className="p-1 hover:bg-white/20 rounded-full"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6 no-scrollbar">
                    {/* Mode Selector */}
                    <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 flex gap-1">
                        <button 
                          onClick={() => setAnalysisMode('gentle')}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${analysisMode === 'gentle' ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                          <Coffee size={16} /> {t('gentleMode')}
                        </button>
                        <button 
                          onClick={() => setAnalysisMode('strict')}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${analysisMode === 'strict' ? 'bg-red-50 text-red-600 shadow-sm border border-red-100' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                          <Flame size={16} /> {t('strictMode')}
                        </button>
                    </div>

                    {/* Question Input */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><MessageSquare size={12}/> Ask a Specific Question</label>
                        <textarea 
                          value={userQuestion}
                          onChange={(e) => setUserQuestion(e.target.value)}
                          placeholder="e.g., Why did I have so many putts on Hole 4? (Golf topics only)"
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 h-20 resize-none font-medium"
                        />
                    </div>

                    {/* Analysis Output */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[100px] relative">
                      {isAnalyzing ? (
                          <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <Loader2 size={40} className={`animate-spin ${analysisMode === 'strict' ? 'text-red-500' : 'text-indigo-500'}`} />
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">{t('analyzing')}</h3>
                          </div>
                      ) : analysisResult ? (
                          <div className="prose prose-sm max-w-none animate-fade-in">
                            <div className="whitespace-pre-wrap leading-relaxed font-medium text-gray-700 text-sm">
                              {analysisResult}
                            </div>
                          </div>
                      ) : (
                          <div className="text-center py-10">
                            <Sparkles size={48} className="mx-auto mb-4 opacity-10 text-gray-400" />
                            <p className="text-gray-400 text-sm font-medium">Click "Run Analysis" to get feedback.</p>
                          </div>
                      )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                    <button 
                      onClick={handleRunAnalysis} 
                      disabled={isAnalyzing}
                      className={`w-full py-4 rounded-2xl font-black text-white shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${isAnalyzing ? 'opacity-50' : analysisMode === 'strict' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                      <Sparkles size={20} />
                      {isAnalyzing ? t('analyzing') : t('analyzeRound')}
                    </button>
                    <button onClick={closeAnalysisModal} className="w-full mt-2 text-gray-400 font-bold text-xs py-2 uppercase tracking-widest">{t('close')}</button>
                </div>
            </div>
        </div>
      )}

      {/* --- EXPORT TEMPLATE --- */}
      {exportingRound && (
        <div className="fixed top-[-9999px] left-[-9999px]">
            <div ref={exportRef} className="w-[1100px] bg-white p-12 flex flex-col font-sans text-[#1e3a8a] border-8 border-[#eff6ff]">
                <div className="flex justify-between items-end mb-8 border-b-4 border-[#1e3a8a] pb-6">
                    <div><h1 className="text-5xl font-black tracking-tighter uppercase mb-1">{exportingRound.courseName}</h1><p className="text-2xl font-bold opacity-50">{exportingRound.date}</p></div>
                    <div className="text-right"><div className="text-sm font-black uppercase tracking-[0.2em] opacity-40 mb-1">SCORECARD PLAYER</div><div className="text-4xl font-black">{exportingRound.playerName.toUpperCase()}</div></div>
                </div>
                <div className="flex gap-8 mb-10">
                    <div className="flex-1 border-[4px] border-[#1e3a8a]">
                        <div className="grid grid-cols-[100px_repeat(9,1fr)] items-center text-center border-b-[3px] border-[#1e3a8a] bg-[#eff6ff]">
                            <div className="py-4 font-black border-r-[2px] border-[#1e3a8a]">HOLE</div>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (<div key={num} className="py-4 font-black border-r border-[#1e3a8a] last:border-r-0">{num}</div>))}
                        </div>
                        <div className="grid grid-cols-[100px_repeat(9,1fr)] items-center text-center border-b-2 border-[#1e3a8a] bg-white">
                            <div className="py-4 font-bold border-r-[2px] border-[#1e3a8a]">PAR</div>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (<div key={num} className="py-4 font-bold border-r border-[#1e3a8a] opacity-40 italic">{exportingRound.holes.find(h => h.holeNumber === num)?.par || '-'}</div>))}
                        </div>
                        <div className="grid grid-cols-[100px_repeat(9,1fr)] items-center text-center border-b-2 border-[#1e3a8a] bg-[#fdfdfd]">
                            <div className="py-5 font-black border-r-[2px] border-[#1e3a8a] bg-[#eff6ff] text-[11px] tracking-tighter">SCORE</div>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (<div key={num} className="flex justify-center items-center border-r border-[#1e3a8a] last:border-r-0 h-full">{exportingRound.holes.find(h => h.holeNumber === num) ? renderTraditionalScore(exportingRound.holes.find(h => h.holeNumber === num)!.score, exportingRound.holes.find(h => h.holeNumber === num)!.par, '#1e3a8a') : '-'}</div>))}
                        </div>
                    </div>
                    <div className="flex-1 border-[4px] border-[#1e3a8a]">
                        <div className="grid grid-cols-[100px_repeat(9,1fr)_120px] items-center text-center border-b-[3px] border-[#1e3a8a] bg-[#eff6ff]">
                            <div className="py-4 font-black border-r-[2px] border-[#1e3a8a]">HOLE</div>{[10, 11, 12, 13, 14, 15, 16, 17, 18].map(num => (<div key={num} className="py-4 font-black border-r border-[#1e3a8a]">{num}</div>))}<div className="py-4 font-black bg-[#1e3a8a] text-white">TOTAL</div>
                        </div>
                        <div className="grid grid-cols-[100px_repeat(9,1fr)_120px] items-center text-center border-b-2 border-[#1e3a8a] bg-white">
                            <div className="py-4 font-bold border-r-[2px] border-[#1e3a8a]">PAR</div>{[10, 11, 12, 13, 14, 15, 16, 17, 18].map(num => (<div key={num} className="py-4 font-bold border-r border-[#1e3a8a] opacity-40 italic">{exportingRound.holes.find(h => h.holeNumber === num)?.par || '-'}</div>))}<div className="py-4 font-black bg-[#eff6ff]">{exportingRound.totalPar}</div>
                        </div>
                        <div className="grid grid-cols-[100px_repeat(9,1fr)_120px] items-center text-center border-b-2 border-[#1e3a8a] bg-[#fdfdfd]">
                            <div className="py-5 font-black border-r-[2px] border-[#1e3a8a] bg-[#eff6ff] text-[11px] tracking-tighter">SCORE</div>{[10, 11, 12, 13, 14, 15, 16, 17, 18].map(num => (<div key={num} className="flex justify-center items-center border-r border-[#1e3a8a] h-full">{exportingRound.holes.find(h => h.holeNumber === num) ? renderTraditionalScore(exportingRound.holes.find(h => h.holeNumber === num)!.score, exportingRound.holes.find(h => h.holeNumber === num)!.par, '#1e3a8a') : '-'}</div>))}<div className="py-4 font-black text-3xl bg-[#eff6ff] text-[#1e3a8a] h-full flex items-center justify-center border-l-2 border-[#1e3a8a]">{exportingRound.totalScore}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
