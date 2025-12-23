import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Download, ChevronRight, Play, Save, Trash2, Trophy } from 'lucide-react';

export const Analysis: React.FC = () => {
  const { state, dispatch, t } = useGame();
  
  const [courseName, setCourseName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD

  // Stats Calcs
  const totalScore = state.history.reduce((acc, h) => acc + h.score, 0);
  const totalPar = state.history.reduce((acc, h) => acc + h.par, 0);
  const totalPutts = state.history.reduce((acc, h) => acc + h.putts, 0);
  const girCount = state.history.filter(h => h.gir).length;
  const girPercentage = state.history.length > 0 ? Math.round((girCount / state.history.length) * 100) : 0;
  const scoreDiff = totalScore - totalPar;
  const scoreDiffDisplay = scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff === 0 ? 'E' : scoreDiff;

  const downloadCSV = () => {
    if (state.history.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += `Player,${state.userName}\nCourse,${courseName || 'Unknown'}\nDate,${date}\n\n`;
    csvContent += "Hole,Par,Score,Putts,GIR,Shot Number,Club,Distance\n";
    
    state.history.forEach(h => {
        h.shots.forEach((s, idx) => {
            csvContent += `${h.holeNumber},${h.par},${h.score},${h.putts},${h.gir ? 'Y' : 'N'},${idx + 1},${s.club},${s.distance || ''}\n`;
        });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `golf_scorecard_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFinishGame = (e: React.FormEvent) => {
    e.preventDefault();
    if(!courseName.trim()) {
        alert(t('enterCourse'));
        return;
    }
    
    dispatch({
        type: 'ARCHIVE_ROUND',
        payload: {
            courseName: courseName.trim(),
            date: date
        }
    });
  };

  const handleDiscardGame = () => {
      if(confirm(t('confirmDiscard'))) {
          dispatch({ type: 'RESET_GAME' });
      }
  };

  // Helper to render traditional symbols
  const renderTraditionalScore = (score: number, par: number) => {
    const diff = score - par;
    const baseClass = "inline-flex items-center justify-center w-8 h-8 font-black text-sm relative";
    
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

  return (
    <div className="px-4 pt-4 pb-safe-bottom max-w-2xl mx-auto">
      {/* Score Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex justify-between">
            <span>{t('currentRound')}</span>
            <span className="text-primary text-base font-normal">{state.userName}</span>
        </h2>
        
        <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">{t('score')}</div>
                <div className="text-3xl font-black text-gray-900 mt-1">{totalScore}</div>
                <div className={`text-sm font-bold ${scoreDiff > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    {scoreDiffDisplay}
                </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">{t('putts')}</div>
                <div className="text-3xl font-black text-gray-900 mt-1">{totalPutts}</div>
                <div className="text-sm text-gray-500 font-medium">Total</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">{t('gir')}</div>
                <div className="text-3xl font-black text-primary mt-1">{girPercentage}%</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">{t('holes')}</div>
                <div className="text-3xl font-black text-gray-900 mt-1">{state.history.length}</div>
            </div>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
          <button 
             onClick={downloadCSV}
             className="flex-1 bg-blue-50 text-blue-600 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform border border-blue-200"
          >
              <Download size={18} /> {t('exportCsv')}
          </button>
          
          {state.history.length < 18 && (
              <button 
                onClick={() => dispatch({ type: 'RESUME_GAME' })}
                className="flex-1 bg-primary text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md shadow-green-200"
              >
                  <Play size={18} /> {t('resume')}
              </button>
          )}
      </div>

      {/* Hole Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <table className="w-full text-sm">
              <thead className="bg-primary text-white">
                  <tr>
                      <th className="py-3 px-2 text-center">H</th>
                      <th className="py-3 px-2 text-center">{t('par')}</th>
                      <th className="py-3 px-2 text-center">Scr</th>
                      <th className="py-3 px-2 text-center">{t('putts')}</th>
                      <th className="py-3 px-2 text-center">GIR</th>
                      <th className="py-3 px-2 w-8"></th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {state.history.map((h, idx) => {
                      return (
                          <tr 
                            key={idx} 
                            onClick={() => dispatch({ type: 'EDIT_HOLE', payload: { index: idx, data: h } })}
                            className="hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
                          >
                              <td className="py-3 px-2 text-center font-bold bg-gray-50 text-gray-600">{h.holeNumber}</td>
                              <td className="py-3 px-2 text-center text-gray-500">{h.par}</td>
                              <td className="py-3 px-2 text-center">
                                  {renderTraditionalScore(h.score, h.par)}
                              </td>
                              <td className="py-3 px-2 text-center text-gray-600">{h.putts}</td>
                              <td className="py-3 px-2 text-center">
                                  {h.gir ? <span className="text-primary font-bold">✓</span> : <span className="text-gray-300">-</span>}
                              </td>
                              <td className="py-3 px-2 text-center text-gray-300">
                                  <ChevronRight size={16} />
                              </td>
                          </tr>
                      );
                  })}
              </tbody>
          </table>
          {state.history.length === 0 && (
              <div className="p-8 text-center text-gray-400">No data recorded yet.</div>
          )}
      </div>
      
      {/* End Game / Archive Section */}
      {state.history.length > 0 && (
        <div className="bg-gray-900 text-white p-6 rounded-2xl mb-8 shadow-lg">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Trophy size={20} className="text-yellow-400" />
                {t('finishSave')}
            </h3>
            <p className="text-sm text-gray-300 mb-6">
                Enter details below to permanently save this round to your history.
            </p>
            
            <form onSubmit={handleFinishGame} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{t('courseName')}</label>
                    <input 
                        required
                        type="text" 
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        placeholder="e.g. Pebble Beach"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 text-white placeholder-gray-500"
                    />
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{t('datePlayed')}</label>
                    <input 
                        required
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 text-white"
                    />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 mt-2"
                >
                    <Save size={20} /> {t('saveHistory')}
                </button>
            </form>
        </div>
      )}

      {/* Discard Section */}
      {state.history.length > 0 && (
          <div className="mb-8 text-center">
            <button 
                onClick={handleDiscardGame}
                className="text-red-400 text-sm font-semibold flex items-center justify-center gap-2 mx-auto hover:text-red-500 px-4 py-2 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
            >
                <Trash2 size={16} /> {t('discardRound')}
            </button>
          </div>
      )}
    </div>
  );
};