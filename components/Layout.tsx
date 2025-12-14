import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Menu, X, BarChart2, Home, User, History, Grid, Instagram, Globe } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { state, dispatch, t } = useGame();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(state.userName);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setTempName(state.userName);
    setIsEditingName(false);
  };

  const handleNav = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  };

  const saveName = () => {
    if(tempName.trim()) {
      dispatch({type: 'SET_USER_NAME', payload: tempName.trim()});
      setIsEditingName(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = state.language === 'en' ? 'zh-TW' : 'en';
    dispatch({ type: 'SET_LANGUAGE', payload: newLang });
  };

  const isHome = state.view === 'HOME';

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header (Hidden on Home Screen for cleaner look, or kept minimal) */}
      {!isHome && (
          <header className="bg-primary text-white px-4 pb-3 pt-safe-top flex items-center justify-between shadow-md z-30 sticky top-0 shrink-0">
            <button onClick={toggleMenu} className="p-1 hover:bg-green-700 rounded transition-colors">
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-bold tracking-wide">{t('appTitle')}</h1>
            <button 
              onClick={() => dispatch({ type: 'SET_VIEW', payload: 'ANALYSIS' })}
              className="p-1 hover:bg-green-700 rounded transition-colors"
            >
              <BarChart2 size={24} />
            </button>
          </header>
      )}

      {/* Side Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={toggleMenu}
        />
      )}

      {/* Side Menu Drawer */}
      <div className={`fixed top-0 left-0 bottom-0 w-72 bg-white z-50 transform transition-transform duration-300 shadow-2xl flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header */}
        <div className="px-4 pb-4 bg-primary text-white flex justify-between items-center pt-safe-top shrink-0">
          <span className="font-bold text-xl">{t('menu')}</span>
          <button onClick={toggleMenu}><X size={24} /></button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          
          {/* User Profile Section */}
          <div className="p-4 bg-green-50 border-b border-green-100 shrink-0">
             <div className="flex items-center gap-2 mb-2 text-primary font-bold">
                <User size={18} />
                <span>{t('golferProfile')}</span>
             </div>
             {isEditingName ? (
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={tempName} 
                   onChange={(e) => setTempName(e.target.value)}
                   className="flex-1 px-2 py-1 text-sm border rounded"
                 />
                 <button onClick={saveName} className="text-xs bg-primary text-white px-2 rounded">{t('save')}</button>
               </div>
             ) : (
               <div className="flex justify-between items-center">
                 <span className="text-lg font-bold text-gray-800">{state.userName}</span>
                 <button onClick={() => setIsEditingName(true)} className="text-xs text-primary underline">{t('edit')}</button>
               </div>
             )}
          </div>

          {/* Navigation Items */}
          <div className="p-4 space-y-2 flex-1">
            
            <button 
              onClick={() => handleNav(() => dispatch({ type: 'SET_VIEW', payload: 'HOME' }))}
              className="w-full flex items-center space-x-3 p-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-semibold border border-gray-100 shadow-sm active:scale-95 transition-transform"
            >
              <Grid size={20} className="text-gray-400" />
              <span>{t('mainMenu')}</span>
            </button>

            {/* Language Toggle */}
            <button 
              onClick={toggleLanguage}
              className="w-full flex items-center space-x-3 p-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-semibold border border-gray-100 shadow-sm active:scale-95 transition-transform"
            >
              <Globe size={20} className="text-blue-500" />
              <div className="flex flex-col items-start">
                  <span className="text-sm">{t('language')}</span>
                  <span className="text-xs text-gray-400">{state.language === 'en' ? 'English' : '繁體中文'}</span>
              </div>
            </button>

            {/* Only show 'Current Game' if there is actually data or we are not on the home screen */}
            {(state.history.length > 0 || state.currentShots.length > 0) && (
                <button 
                  onClick={() => handleNav(() => dispatch({ type: 'RESUME_GAME' }))}
                  className="w-full flex items-center space-x-3 p-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-semibold border border-gray-100 shadow-sm active:scale-95 transition-transform"
                >
                  <Home size={20} className="text-primary" />
                  <span>{t('currentGame')}</span>
                </button>
            )}

             <button 
              onClick={() => handleNav(() => dispatch({ type: 'SET_VIEW', payload: 'PAST_GAMES' }))}
              className="w-full flex items-center space-x-3 p-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-semibold border border-gray-100 shadow-sm active:scale-95 transition-transform"
            >
              <History size={20} className="text-orange-500" />
              <span>{t('pastGames')}</span>
            </button>
          </div>
          
          {/* Footer - Pushed to bottom with safe area padding */}
          <div className="p-4 text-center border-t border-gray-100 bg-gray-50 pb-safe-bottom shrink-0">
             <div className="text-xs text-gray-400 mb-2">Golf Master Pro v1.3</div>
             <a 
               href="https://www.instagram.com/eric820709/" 
               target="_blank" 
               rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600 hover:text-pink-700 transition-colors bg-white px-3 py-1.5 rounded-full border border-pink-100 shadow-sm"
             >
                <Instagram size={14} /> IG: eric820709
             </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {/* Render Menu Button on Home Screen if needed, or leave it cleaner. 
            Here we add a floating menu button for Home Screen since header is hidden */}
        {isHome && (
            <button 
                onClick={toggleMenu} 
                className="absolute top-safe-top left-4 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md z-20 text-gray-600"
                style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}
            >
                <Menu size={24} />
            </button>
        )}

        <div className="h-full overflow-y-auto no-scrollbar pb-safe-bottom">
           {children}
        </div>
      </main>
    </div>
  );
};