import React from 'react';
import { useGame } from '../context/GameContext';

export const HoleSetup: React.FC = () => {
  const { state, dispatch, t } = useGame();

  const selectPar = (par: number) => {
    dispatch({ type: 'START_HOLE', payload: { hole: state.currentHole, par } });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 max-w-md mx-auto">
      <div className="text-center mb-10">
        <div className="text-primary font-bold tracking-widest uppercase mb-2">{t('teeOff')}</div>
        <h2 className="text-4xl font-extrabold text-gray-900">{t('hole')} {state.currentHole}</h2>
        <p className="text-gray-500 mt-2">{t('selectPar')}</p>
      </div>

      <div className="grid grid-cols-1 w-full gap-4">
        {[3, 4, 5].map((par) => (
          <button
            key={par}
            onClick={() => selectPar(par)}
            className="group relative w-full bg-white hover:bg-green-50 border-2 border-gray-100 hover:border-primary rounded-2xl p-6 transition-all duration-200 shadow-sm active:scale-95"
          >
            <span className="text-2xl font-bold text-gray-800 group-hover:text-primary">{t('par')} {par}</span>
          </button>
        ))}
      </div>
      
      {state.history.length > 0 && (
          <button 
            onClick={() => dispatch({type: 'SET_VIEW', payload: 'ANALYSIS'})}
            className="mt-12 text-gray-400 text-sm font-medium underline"
          >
            {t('skipAnalysis')}
          </button>
      )}
    </div>
  );
};