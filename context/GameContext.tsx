import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { GameState, ClubName, Shot, RoundHoleData, ViewState, FinishedRound, Language, Friend } from '../types';
import { translations, TranslationKey } from '../translations';

type Action =
  | { type: 'LOAD_STATE'; payload: GameState }
  | { type: 'SET_BAG'; payload: ClubName[] }
  | { type: 'SET_VIEW'; payload: ViewState }
  | { type: 'SET_LANGUAGE'; payload: Language } 
  | { type: 'SET_USER_NAME'; payload: string }
  | { type: 'SET_HOME_BACKGROUND'; payload: string | null }
  | { type: 'START_HOLE'; payload: { hole: number; par: number } }
  | { type: 'SET_CURRENT_PAR'; payload: number }
  | { type: 'ADD_SHOT'; payload: Shot }
  | { type: 'UPDATE_SHOT'; payload: { index: number; shot: Shot } }
  | { type: 'DELETE_SHOT'; payload: number } 
  | { type: 'FINISH_HOLE'; payload: RoundHoleData }
  | { type: 'EDIT_HOLE'; payload: { index: number; data: RoundHoleData } }
  | { type: 'ARCHIVE_ROUND'; payload: { courseName: string; date: string } }
  | { type: 'RESUME_GAME' }
  | { type: 'RESET_GAME' }
  | { type: 'DELETE_ROUND'; payload: number } 
  | { type: 'CLEAR_HISTORY' }
  | { type: 'ADD_FRIEND'; payload: Friend }
  | { type: 'REMOVE_FRIEND'; payload: string };

const initialState: GameState = {
  view: 'HOME',
  language: 'zh-TW', 
  myBag: ["Driver", "Hybrid", "7 Iron", "8 Iron", "9 Iron", "PW", "SW", "Putter"],
  userName: "Golfer",
  golferId: `GF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
  homeBackgroundImage: null,
  currentHole: 1,
  currentPar: 4,
  currentShots: [],
  history: [],
  pastRounds: [],
  friends: [],
  isEditingMode: false,
  editingHoleIndex: -1,
  maxHoleReached: 1,
};

const gameReducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'LOAD_STATE': {
      return { 
        ...initialState, 
        ...action.payload,
        friends: Array.isArray(action.payload.friends) ? action.payload.friends : [],
        pastRounds: Array.isArray(action.payload.pastRounds) ? action.payload.pastRounds : [],
        golferId: action.payload.golferId || initialState.golferId
      };
    }
    case 'SET_BAG': return { ...state, myBag: action.payload };
    case 'SET_VIEW': return { ...state, view: action.payload };
    case 'SET_LANGUAGE': return { ...state, language: action.payload };
    case 'SET_USER_NAME': return { ...state, userName: action.payload };
    case 'SET_HOME_BACKGROUND': return { ...state, homeBackgroundImage: action.payload };
    case 'START_HOLE': return { ...state, currentHole: action.payload.hole, currentPar: action.payload.par, currentShots: [], view: 'PLAY', isEditingMode: false };
    case 'SET_CURRENT_PAR': return { ...state, currentPar: action.payload };
    case 'ADD_SHOT': return { ...state, currentShots: [...state.currentShots, action.payload] };
    case 'FINISH_HOLE': {
      if (state.isEditingMode && state.editingHoleIndex !== -1) {
        const newHistory = [...state.history];
        newHistory[state.editingHoleIndex] = action.payload;
        return { ...state, history: newHistory, isEditingMode: false, editingHoleIndex: -1, view: 'ANALYSIS' };
      }
      const newHistory = [...state.history, action.payload];
      const nextHole = state.currentHole + 1;
      return { ...state, history: newHistory, maxHoleReached: nextHole, currentHole: nextHole, currentShots: [], view: nextHole > 18 ? 'ANALYSIS' : 'HOLE_SETUP' };
    }
    case 'ARCHIVE_ROUND': {
      const totalScore = state.history.reduce((acc, h) => acc + h.score, 0);
      const totalPar = state.history.reduce((acc, h) => acc + h.par, 0);
      const totalPutts = state.history.reduce((acc, h) => acc + h.putts, 0);
      const newRound: FinishedRound = { id: `round_${Date.now()}`, courseName: action.payload.courseName, date: action.payload.date, playerName: state.userName, holes: [...state.history], totalScore, totalPar, totalPutts };
      return { ...state, currentHole: 1, currentPar: 4, currentShots: [], history: [], isEditingMode: false, editingHoleIndex: -1, maxHoleReached: 1, pastRounds: [newRound, ...state.pastRounds], view: 'PAST_GAMES' };
    }
    case 'ADD_FRIEND': {
      const filtered = state.friends.filter(f => f.id !== action.payload.id);
      return { ...state, friends: [action.payload, ...filtered] };
    }
    case 'REMOVE_FRIEND': {
      return { ...state, friends: state.friends.filter(f => f.id !== action.payload) };
    }
    case 'RESUME_GAME':
      return { ...state, isEditingMode: false, editingHoleIndex: -1, view: (state.history.length >= 18) ? 'ANALYSIS' : 'HOLE_SETUP' };
    case 'RESET_GAME': return { ...state, view: 'HOME', currentHole: 1, currentShots: [], history: [], maxHoleReached: 1 };
    case 'DELETE_ROUND': {
      const newRounds = [...state.pastRounds];
      newRounds.splice(action.payload, 1);
      return { ...state, pastRounds: newRounds };
    }
    case 'CLEAR_HISTORY': return { ...state, pastRounds: [] };
    default: return state;
  }
};

interface GameContextProps {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  t: (key: TranslationKey) => string;
}

const GameContext = createContext<GameContextProps | undefined>(undefined);
const LOCAL_STORAGE_KEY = 'golf_master_pro_v2'; 

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'LOAD_STATE', payload: parsed });
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const t = (key: TranslationKey) => translations[state.language][key] || translations['en'][key] || key;

  return (
    <GameContext.Provider value={{ state, dispatch, t }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
};