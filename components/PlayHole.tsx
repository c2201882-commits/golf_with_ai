import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { ClubName, Shot } from '../types';
import { Trash2, Edit2, CheckCircle, X, ChevronDown, Flag } from 'lucide-react';

export const PlayHole: React.FC = () => {
  const { state, dispatch, t } = useGame();
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShotIndex, setEditingShotIndex] = useState<number>(-1);
  
  // Temporary state for the editing form
  const [editFormClub, setEditFormClub] = useState<ClubName>('');
  const [editFormDist, setEditFormDist] = useState<string>('');

  const distInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---
  const currentScore = state.currentShots.length;
  const putts = state.currentShots.filter(s => s.club === 'Putter').length;
  const isLastHole = state.currentHole === 18;

  useEffect(() => {
    if (showEditModal && distInputRef.current) {
      // Focus distance input when modal opens
      setTimeout(() => distInputRef.current?.focus(), 100);
    }
  }, [showEditModal]);

  // --- Logic Flow ---

  const handleClubClick = (club: ClubName) => {
    // PASSIVE MODE: Just add the shot. No modals.
    const newShot: Shot = {
      id: Date.now().toString(),
      club,
      distance: null,
      timestamp: Date.now()
    };
    dispatch({ type: 'ADD_SHOT', payload: newShot });
  };

  const handleFinishHole = () => {
    if (state.currentShots.length === 0) {
        if(!confirm("Score is 0. Are you sure?")) return;
    }
    
    const score = state.currentShots.length;
    const gir = (score - putts) <= (state.currentPar - 2);
    
    dispatch({
        type: 'FINISH_HOLE',
        payload: {
            holeNumber: state.currentHole,
            par: state.currentPar,
            score,
            putts,
            gir,
            shots: state.currentShots,
            date: new Date().toISOString()
        }
    });
  };

  // --- Modal Handlers ---

  const openEditModal = (idx: number) => {
      const shot = state.currentShots[idx];
      setEditingShotIndex(idx);
      setEditFormClub(shot.club);
      setEditFormDist(shot.distance ? shot.distance.toString() : '');
      setShowEditModal(true);
  };

  const closeEditModal = () => {
      setShowEditModal(false);
      setEditingShotIndex(-1);
  };

  const saveEdit = () => {
      if (editingShotIndex !== -1) {
          const originalShot = state.currentShots[editingShotIndex];
          const distValue = editFormDist === '' ? null : parseInt(editFormDist);
          
          dispatch({
              type: 'UPDATE_SHOT',
              payload: {
                  index: editingShotIndex,
                  shot: {
                      ...originalShot,
                      club: editFormClub,
                      distance: isNaN(distValue as number) ? null : distValue
                  }
              }
          });
      }
      closeEditModal();
  };

  const deleteShot = () => {
      if (editingShotIndex !== -1) {
          dispatch({ type: 'DELETE_SHOT', payload: editingShotIndex });
      }
      closeEditModal();
  };

  // --- Rendering ---

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top Info Bar */}
      <div className="bg-white px-4 py-3 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <div>
           <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">{t('hole')} {state.currentHole}</div>
           <div className="text-xl font-black text-gray-800">{t('par')} {state.currentPar}</div>
        </div>
        <div className="flex flex-col items-end">
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">{t('strokes')}</div>
            <div className={`text-2xl font-black ${currentScore > state.currentPar ? 'text-red-500' : currentScore < state.currentPar ? 'text-blue-500' : 'text-gray-800'}`}>
                {currentScore}
            </div>
        </div>
      </div>

      {state.isEditingMode && (
          <div className="bg-orange-100 text-orange-700 text-xs font-bold text-center py-1">
              EDITING HISTORY MODE
          </div>
      )}

      {/* Main Grid area */}
      <div className="flex-1 overflow-y-auto p-4 pb-48 no-scrollbar">
          {/* Shot History List */}
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-400 uppercase border-b flex justify-between items-center">
                <span>{t('shotHistory')}</span>
                <span className="text-[10px] text-gray-400 font-normal normal-case">{t('tapEdit')}</span>
             </div>
             {state.currentShots.length === 0 ? (
                 <div className="p-6 text-center text-gray-400 text-sm">Tap clubs below to add shots</div>
             ) : (
                 <ul className="divide-y divide-gray-100">
                     {state.currentShots.map((s, idx) => (
                         <li key={s.id} onClick={() => openEditModal(idx)} className="flex justify-between items-center p-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors">
                             <div className="flex items-center gap-3">
                                 <span className="w-6 h-6 flex items-center justify-center bg-primary text-white text-xs font-bold rounded-full">{idx + 1}</span>
                                 <span className="font-semibold text-gray-800">{s.club}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                 {s.distance ? (
                                     <span className="text-primary font-bold text-sm">{s.distance}y</span>
                                 ) : (s.club !== 'Putter' && s.club !== 'Penalty') ? (
                                     <span className="text-xs text-gray-300">--</span>
                                 ) : null}
                                 <Edit2 size={14} className="text-gray-300" />
                             </div>
                         </li>
                     ))}
                 </ul>
             )}
          </div>

          {/* Club Grid */}
          <div className="grid grid-cols-3 gap-2">
              {state.myBag.filter(c => c !== 'Putter').map(club => (
                  <button 
                    key={club} 
                    onClick={() => handleClubClick(club)}
                    className="bg-white text-primary border border-gray-200 py-3 rounded-lg font-bold shadow-sm active:scale-95 transition-all text-sm truncate px-1"
                  >
                      {club}
                  </button>
              ))}
              
              {/* Special Buttons */}
              <button 
                onClick={() => handleClubClick('Penalty')}
                className="bg-red-50 text-red-600 border border-red-100 py-3 rounded-lg font-bold shadow-sm active:scale-95 transition-all text-sm"
              >
                  {t('penalty')}
              </button>
              <button 
                onClick={() => handleClubClick('Putter')}
                className="col-span-3 bg-yellow-50 text-yellow-700 border border-yellow-200 py-4 rounded-xl font-bold shadow-sm active:scale-95 transition-all text-lg mt-2 flex items-center justify-center gap-2"
              >
                  <span>⛳️</span> {t('putter')}
              </button>
          </div>
      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pt-4 pb-safe-bottom bg-white border-t z-20">
          <div className="flex gap-3">
              <button 
                 onClick={() => dispatch({type: 'DELETE_SHOT', payload: state.currentShots.length - 1})}
                 disabled={state.currentShots.length === 0}
                 className="px-4 py-3 rounded-xl bg-gray-100 text-gray-500 font-bold disabled:opacity-50 active:scale-95 transition-transform"
              >
                 {t('undo')}
              </button>
              <button 
                onClick={handleFinishHole}
                className={`flex-1 py-3 rounded-xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${state.isEditingMode ? 'bg-orange-500 text-white' : 'bg-primary text-white'}`}
              >
                {state.isEditingMode ? (
                  t('saveChanges')
                ) : isLastHole ? (
                  <>{t('finishRound')} <Flag size={20} fill="currentColor" /></>
                ) : (
                  <>{t('nextHole')} <CheckCircle size={20} /></>
                )}
              </button>
          </div>
      </div>

      {/* --- Unified Edit Modal --- */}
      {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-slide-up">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900">Edit Shot {editingShotIndex + 1}</h3>
                      <button onClick={closeEditModal} className="p-1 bg-gray-100 rounded-full text-gray-500">
                          <X size={20} />
                      </button>
                  </div>

                  {/* Club Selection Dropdown */}
                  <div className="mb-6">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('clubUsed')}</label>
                      <div className="relative">
                          <select 
                            value={editFormClub} 
                            onChange={(e) => setEditFormClub(e.target.value)}
                            className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-lg font-bold rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          >
                              {/* Combine current bag + Penalty + Putter for options */}
                              {[...state.myBag, 'Penalty'].filter((v, i, a) => a.indexOf(v) === i).map(c => (
                                  <option key={c} value={c}>{c}</option>
                              ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                              <ChevronDown size={20} />
                          </div>
                      </div>
                  </div>
                  
                  {/* Distance Input */}
                  <div className="mb-8">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('distance')}</label>
                      <input 
                        ref={distInputRef}
                        type="number" 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={editFormDist}
                        onChange={(e) => setEditFormDist(e.target.value)}
                        className="w-full text-center text-4xl font-bold border-b-2 border-gray-300 py-2 focus:outline-none focus:border-primary placeholder-gray-200"
                        placeholder="--"
                      />
                  </div>

                  <div className="flex gap-3">
                      <button 
                        onClick={deleteShot}
                        className="p-4 bg-red-50 text-red-500 rounded-xl font-bold flex items-center justify-center"
                      >
                          <Trash2 size={24} />
                      </button>
                      <button 
                        onClick={saveEdit}
                        className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
                      >
                          {t('saveChanges')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};