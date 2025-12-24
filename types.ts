export type ViewState = 'HOME' | 'BAG_SETUP' | 'HOLE_SETUP' | 'PLAY' | 'ANALYSIS' | 'PAST_GAMES' | 'SOCIAL';
export type Language = 'en' | 'zh-TW';

export type ClubName = string;

export interface Shot {
  id: string;
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

export interface Friend {
  id: string;
  name: string;
  lastUpdated: number;
  rounds: FinishedRound[];
}

export interface GameState {
  view: ViewState;
  language: Language;
  myBag: ClubName[];
  userName: string;
  golferId: string; // User's unique ID for friend system
  
  homeBackgroundImage?: string | null;

  currentHole: number;
  currentPar: number;
  currentShots: Shot[];
  history: RoundHoleData[];
  
  pastRounds: FinishedRound[];
  friends: Friend[]; // List of added friends

  isEditingMode: boolean;
  editingHoleIndex: number;
  maxHoleReached: number;
}

export const ALL_POSSIBLE_CLUBS: ClubName[] = [
  "Driver", "3 Wood", "5 Wood", "Hybrid",
  "4 Iron", "5 Iron", "6 Iron", "7 Iron", "8 Iron", "9 Iron",
  "PW", "AW", "SW", "LW"
];