import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { ALL_POSSIBLE_CLUBS, ClubName } from '../types';
import { Check, Plus, X } from 'lucide-react';

export const BagSelection: React.FC = () => {
  const { state, dispatch, t } = useGame();
  const [customClub, setCustomClub] = useState('');

  const toggleClub = (club: ClubName) => {
    let newBag = [...state.myBag];
    if (newBag.includes(club)) {
      newBag = newBag.filter(c => c !== club);
    } else {
      newBag.push(club);
    }
    // Always ensure putter is in
    if (!newBag.includes('Putter')) newBag.push('Putter');
    
    dispatch({ type: 'SET_BAG', payload: newBag });
  };

  const addCustomClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (customClub.trim()) {
      const newBag = [...state.myBag];
      if (!newBag.includes(customClub.trim())) {
        newBag.push(customClub.trim());
        dispatch({ type: 'SET_BAG', payload: newBag });
      }
      setCustomClub('');
    }
  };

  const confirm = () => {
    // Bag is already updated in global state via toggleClub, so we just move to the next view
    dispatch({ type: 'SET_VIEW', payload: 'HOLE_SETUP' });
  };

  // Separate standard clubs from custom ones for display logic
  const standardClubs = ALL_POSSIBLE_CLUBS;
  const currentCustomClubs = state.myBag.filter(c => !standardClubs.includes(c) && c !== 'Putter' && c !== 'Penalty');

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col h-full">
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 text-center shrink-0">
        <h2 className="text-2xl font-bold text-primary mb-2">{t('bagTitle')}</h2>
        <p className="text-gray-500 text-sm">{t('bagDesc')}</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        {/* Standard Clubs */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {standardClubs.map((club) => {
            const isSelected = state.myBag.includes(club);
            return (
              <button
                key={club}
                onClick={() => toggleClub(club)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-200 flex items-center gap-2 ${
                  isSelected 
                    ? 'bg-green-50 border-primary text-primary shadow-sm' 
                    : 'bg-white border-transparent text-gray-500 hover:bg-gray-100'
                }`}
              >
                {isSelected && <Check size={14} />}
                {club}
              </button>
            );
          })}
        </div>

        {/* Custom Clubs Section */}
        <div className="mb-8 px-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">{t('customClubs')}</div>
          
          <form onSubmit={addCustomClub} className="flex gap-2 mb-4">
            <input
              type="text"
              value={customClub}
              onChange={(e) => setCustomClub(e.target.value)}
              placeholder="e.g. Gold Putter"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm"
            />
            <button 
              type="submit"
              disabled={!customClub.trim()}
              className="bg-gray-900 text-white rounded-xl px-4 py-2 disabled:opacity-50"
            >
              <Plus size={20} />
            </button>
          </form>

          <div className="flex flex-wrap gap-2 justify-center">
            {currentCustomClubs.map((club) => (
              <button
                key={club}
                onClick={() => toggleClub(club)}
                className="px-4 py-2 rounded-full text-sm font-semibold border-2 bg-orange-50 border-orange-500 text-orange-700 shadow-sm flex items-center gap-2"
              >
                <Check size={14} />
                {club}
                <span className="ml-1 opacity-50 text-xs">(Custom)</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 pt-4 pb-safe-bottom bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
        <button 
          onClick={confirm}
          className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-lg shadow-lg active:scale-[0.98] transition-transform"
        >
          {t('startGame')}
        </button>
      </div>
    </div>
  );
};