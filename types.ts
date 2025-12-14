export type ViewState = 'HOME' | 'BAG_SETUP' | 'HOLE_SETUP' | 'PLAY' | 'ANALYSIS' | 'PAST_GAMES';
export type Language = 'en' | 'zh-TW';

// Allow any string for custom clubs, but keep the type alias for clarity
export type ClubName = string;

export interface Shot {
  id: string; // Unique ID for keying
  club: ClubName;
  distance: number | null;
  timestamp: number;
}

export interface RoundHoleData {
  holeNumber: number;
  par: number;
  shots: Shot[];
  score: number;
  putts: number;
  gir: boolean;
  date: string;
}

export interface FinishedRound {
  id: string;
  courseName: string;
  date: string;
  playerName: string;
  holes: RoundHoleData[];
  totalScore: number;
  totalPar: number;
  totalPutts: number;
}

export interface GameState {
  view: ViewState;
  language: Language; // Added language
  myBag: ClubName[];
  userName: string; // User's name
  
  // Customization
  homeBackgroundImage?: string | null; // Base64 data string

  // Current Game State
  currentHole: number;
  currentPar: number;
  currentShots: Shot[];
  history: RoundHoleData[];
  
  // Persistent History
  pastRounds: FinishedRound[];

  // Editing state for current game
  isEditingMode: boolean;
  editingHoleIndex: number; // Index in history array
  maxHoleReached: number;
}

export const ALL_POSSIBLE_CLUBS: ClubName[] = [
  "Driver", "3 Wood", "5 Wood", "Hybrid",
  "4 Iron", "5 Iron", "6 Iron", "7 Iron", "8 Iron", "9 Iron",
  "PW", "AW", "SW", "LW"
];