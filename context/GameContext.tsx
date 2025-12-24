
import React, { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
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
  | { type: 'ADD_FRIEND'; payload: { id: string; name: string; rounds?: FinishedRound[] } }
  | { type: 'REMOVE_FRIEND'; payload: string }
  | { type: 'UPDATE_FRIEND_DATA'; payload: Friend };

const CURRENT_STORAGE_KEY = 'golf_master_pro_v3';

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
        golferId: action.payload.golferId || state.golferId,
        pastRounds: Array.isArray(action.payload.pastRounds) ? action.payload.pastRounds : [],
        friends: Array.isArray(action.payload.friends) ? action.payload.friends : []
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
      return { ...state, currentHole: 1, currentPar: 4, currentShots: [], history: [], pastRounds: [newRound, ...state.pastRounds], view: 'PAST_GAMES' };
    }
    case 'ADD_FRIEND': {
      const exists = state.friends.some(f => f.id === action.payload.id);
      if (exists) return state;
      return { 
        ...state, 
        friends: [{ 
          id: action.payload.id, 
          name: action.payload.name, 
          lastUpdated: Date.now(), 
          rounds: action.payload.rounds || [] 
        }, ...state.friends] 
      };
    }
    case 'UPDATE_FRIEND_DATA': {
      return {
        ...state,
        friends: state.friends.map(f => {
          if (f.id === action.payload.id) {
            // 修正：直接以傳過來的數據為準，這樣刪除才能同步
            return { 
              ...action.payload, 
              lastUpdated: Date.now() 
            };
          }
          return f;
        })
      };
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
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const peerRef = useRef<any>(null);
  const activeConnections = useRef<Map<string, any>>(new Map());

  // 1. 數據載入
  useEffect(() => {
    const saved = localStorage.getItem(CURRENT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'LOAD_STATE', payload: parsed });
      } catch (e) {}
    }
    setIsDataLoaded(true);
  }, []);

  // 2. 自動存檔
  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isDataLoaded]);

  // 3. P2P 同步邏輯 (精簡版，只管數據交換)
  useEffect(() => {
    if (!isDataLoaded || !state.golferId) return;

    const peer = new Peer(state.golferId);
    peerRef.current = peer;

    const broadcastMyData = () => {
      activeConnections.current.forEach(conn => {
        if (conn.open) {
          conn.send({
            type: 'SYNC_DATA',
            payload: {
              id: state.golferId,
              name: state.userName,
              rounds: state.pastRounds.slice(0, 50) // 送出最近 50 場
            }
          });
        }
      });
    };

    peer.on('open', () => {
      // 嘗試連線所有好友
      state.friends.forEach(friend => {
        const conn = peer.connect(friend.id);
        setupConnection(conn);
      });
    });

    peer.on('connection', (conn) => {
        setupConnection(conn);
    });

    const setupConnection = (conn: any) => {
        conn.on('open', () => {
            activeConnections.current.set(conn.peer, conn);
            // 連上後立刻互相交換資料
            conn.send({
                type: 'SYNC_DATA',
                payload: {
                  id: state.golferId,
                  name: state.userName,
                  rounds: state.pastRounds.slice(0, 50)
                }
            });
        });
        conn.on('data', (data: any) => {
            if (data?.type === 'SYNC_DATA') {
                const isFriend = state.friends.some(f => f.id === data.payload.id);
                if (!isFriend) {
                    dispatch({ type: 'ADD_FRIEND', payload: data.payload });
                } else {
                    dispatch({ type: 'UPDATE_FRIEND_DATA', payload: data.payload });
                }
            }
        });
        conn.on('close', () => activeConnections.current.delete(conn.peer));
    };

    // 每 2 分鐘嘗試重連
    const retryInterval = setInterval(() => {
        state.friends.forEach(f => {
            if (!activeConnections.current.has(f.id)) {
                setupConnection(peer.connect(f.id));
            }
        });
    }, 120000);

    return () => {
        clearInterval(retryInterval);
        peer.destroy();
    };
  }, [isDataLoaded, state.golferId, state.friends.length]);

  // 當「我的紀錄」發生變化（新增或刪除）時，通知好友
  useEffect(() => {
    if (!isDataLoaded) return;
    activeConnections.current.forEach(conn => {
        if (conn.open) {
            conn.send({
                type: 'SYNC_DATA',
                payload: {
                  id: state.golferId,
                  name: state.userName,
                  rounds: state.pastRounds.slice(0, 50)
                }
            });
        }
    });
  }, [state.pastRounds.length, state.userName]);

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
