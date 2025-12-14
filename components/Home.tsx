import React, { useRef } from 'react';
import { useGame } from '../context/GameContext';
import { Play, History, Image as ImageIcon, Trash2, Instagram } from 'lucide-react';

export const Home: React.FC = () => {
  const { state, dispatch, t } = useGame();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const hasActiveGame = state.history.length > 0 || state.currentShots.length > 0;
  const isGameFinished = state.history.length >= 18;
  const hasBackground = !!state.homeBackgroundImage;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Simple check to ensure it's an image
            if (base64String.startsWith('data:image')) {
                dispatch({ type: 'SET_HOME_BACKGROUND', payload: base64String });
            } else {
                alert('Please upload a valid image file.');
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const clearBackground = (e: React.MouseEvent) => {
      e.stopPropagation();
      dispatch({ type: 'SET_HOME_BACKGROUND', payload: null });
  };

  const triggerUpload = () => {
      fileInputRef.current?.click();
  };

  return (
    <div className="relative flex flex-col min-h-full transition-all duration-500">
      
      {/* Dynamic Background */}
      {hasBackground ? (
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat fixed"
            style={{ backgroundImage: `url(${state.homeBackgroundImage})` }}
          >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
          </div>
      ) : (
          <div className="absolute inset-0 z-0 bg-gray-50 fixed"></div>
      )}

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col min-h-full px-6 pt-safe-top pb-safe-bottom">
        
        <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-fade-in py-8">
            {/* Logo / Branding */}
            <div className="text-center">
                <div className={`w-24 h-24 rounded-full mx-auto mb-6 shadow-xl flex items-center justify-center border-4 ${hasBackground ? 'bg-white/90 border-white' : 'bg-white border-gray-100'}`}>
                    <span className="text-5xl">⛳️</span>
                </div>
                <h1 className={`text-3xl font-black tracking-tight mb-2 ${hasBackground ? 'text-white drop-shadow-md' : 'text-gray-800'}`}>
                    {t('appTitle')}
                </h1>
                <p className={`font-medium mb-3 ${hasBackground ? 'text-gray-200' : 'text-gray-500'}`}>
                    {t('subtitle')}
                </p>
                
                {/* IG Link */}
                <a 
                    href="https://www.instagram.com/eric820709/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all active:scale-95
                        ${hasBackground 
                            ? 'bg-white/20 text-white border-white/30 hover:bg-white/30' 
                            : 'bg-white text-pink-600 border-pink-100 hover:bg-pink-50 shadow-sm'}`}
                >
                    <Instagram size={14} />
                    IG: eric820709
                </a>
            </div>

            {/* Main Actions */}
            <div className="w-full max-w-sm space-y-4">
                
                {/* Start / Resume Button */}
                <button 
                    onClick={() => {
                        if (hasActiveGame) {
                            dispatch({ type: 'RESUME_GAME' });
                        } else {
                            dispatch({ type: 'SET_VIEW', payload: 'BAG_SETUP' });
                        }
                    }}
                    className="w-full group relative bg-primary hover:bg-green-600 text-white p-6 rounded-2xl shadow-xl shadow-green-900/20 transition-all active:scale-[0.98] flex items-center justify-between overflow-hidden border border-white/20"
                >
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Play size={24} fill="currentColor" className="ml-1" />
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-medium opacity-90 uppercase tracking-wide">
                                {hasActiveGame ? (isGameFinished ? t('reviewRound') : t('continueRound')) : t('newRound')}
                            </div>
                            <div className="text-2xl font-bold">
                                {hasActiveGame ? (isGameFinished ? t('analyzeRound') : t('resumeGame')) : t('startGame')}
                            </div>
                        </div>
                    </div>
                    {/* Decorative background element */}
                    <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black/10 to-transparent"></div>
                </button>

                {/* Past Games Button */}
                <button 
                    onClick={() => dispatch({ type: 'SET_VIEW', payload: 'PAST_GAMES' })}
                    className={`w-full p-5 rounded-2xl shadow-sm border-2 transition-all active:scale-[0.98] flex items-center gap-4 
                        ${hasBackground 
                            ? 'bg-white/90 hover:bg-white text-gray-900 border-transparent' 
                            : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-100'
                        }`}
                >
                    <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center">
                        <History size={20} />
                    </div>
                    <div className="text-left">
                        <div className="text-lg font-bold">{t('pastGames')}</div>
                        <div className="text-xs text-gray-500 font-medium">{state.pastRounds.length} {t('roundsArchived')}</div>
                    </div>
                </button>
            </div>
        </div>

        {/* Footer: User Info & Customization */}
        <div className={`mb-8 p-4 rounded-xl shadow-sm border flex items-center justify-between max-w-sm mx-auto w-full backdrop-blur-md
            ${hasBackground ? 'bg-black/30 border-white/20 text-white' : 'bg-white border-gray-100 text-gray-900'}`}>
            
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasBackground ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-500'}`}>
                    <UserIcon />
                </div>
                <div>
                    <div className={`text-xs font-bold uppercase ${hasBackground ? 'text-gray-300' : 'text-gray-400'}`}>{t('player')}</div>
                    <div className="font-bold">{state.userName}</div>
                </div>
            </div>

            {/* Background Image Controls */}
            <div className="flex gap-2">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                />
                
                {hasBackground && (
                    <button 
                        onClick={clearBackground}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-200 transition-colors"
                        title="Remove Background"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
                
                <button 
                    onClick={triggerUpload}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold
                        ${hasBackground ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                >
                    <ImageIcon size={16} />
                    {hasBackground ? t('edit') : 'Bg'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);