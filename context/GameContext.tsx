
import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { GameState, ClubName, Shot, RoundHoleData, ViewState, FinishedRound, Language, Friend } from '../types';
import { translations, TranslationKey } from '../translations';
import { Peer } from 'peerjs';

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
    case 'LOAD_STATE': return { ...initialState, ...action.payload, golferId: action.payload.golferId || initialState.golferId };
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
      return { ...state, currentHole: 1, currentPar: 4, currentShots: [], history: [], pastRounds: [newRound, ...state.pastRounds], view: 'PAST_GAMES' };
    }
    case 'ADD_FRIEND': {
      const friendExists = state.friends.find(f => f.id === action.payload.id);
      if (friendExists) {
          return { ...state, friends: state.friends.map(f => f.id === action.payload.id ? { ...action.payload, lastUpdated: Date.now() } : f) };
      }
      return { ...state, friends: [action.payload, ...state.friends] };
    }
    case 'REMOVE_FRIEND': return { ...state, friends: state.friends.filter(f => f.id !== action.payload) };
    case 'RESUME_GAME': return { ...state, view: (state.history.length >= 18) ? 'ANALYSIS' : 'HOLE_SETUP' };
    case 'RESET_GAME': return { ...state, view: 'HOME', currentHole: 1, currentShots: [], history: [], maxHoleReached: 1 };
    case 'DELETE_ROUND': return { ...state, pastRounds: state.pastRounds.filter((_, i) => i !== action.payload) };
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

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const peerRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('golf_master_pro_v3');
    if (saved) {
      try { dispatch({ type: 'LOAD_STATE', payload: JSON.parse(saved) }); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('golf_master_pro_v3', JSON.stringify(state));
  }, [state]);

  // --- REAL-TIME P2P SYNC LOGIC ---
  useEffect(() => {
    if (!state.golferId) return;

    // Initialize Peer with golferId as the address
    const peer = new Peer(state.golferId);
    peerRef.current = peer;

    peer.on('open', (id) => console.log('My P2P ID is: ' + id));

    // Listen for incoming syncs from friends
    peer.on('connection', (conn) => {
      conn.on('data', (data: any) => {
        if (data && data.type === 'SYNC_PROFILE') {
          dispatch({ type: 'ADD_FRIEND', payload: data.payload });
        }
      });
    });

    // Automatically try to notify online friends whenever we update pastRounds
    const syncWithFriends = () => {
        const myProfile = {
            id: state.golferId,
            name: state.userName,
            rounds: state.pastRounds.slice(0, 10)
        };
        
        state.friends.forEach(friend => {
            const conn = peer.connect(friend.id);
            conn.on('open', () => {
                conn.send({ type: 'SYNC_PROFILE', payload: myProfile });
            });
        });
    };

    // Broadcast update when rounds change
    if (state.pastRounds.length > 0) {
        syncWithFriends();
    }

    return () => peer.destroy();
  }, [state.golferId, state.pastRounds.length, state.userName]); // Dependency on rounds length and name

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
