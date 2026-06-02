export type AppState = 
  | 'idle' 
  | 'setup' 
  | 'camera-init' 
  | 'waiting' 
  | 'countdown' 
  | 'capturing' 
  | 'processing' 
  | 'preview' 
  | 'done' 
  | 'error';

export type LayoutType = 
  | '2x6_3' 
  | '2x6_4' 
  | '4x6_6' 
  | '4x6_single_p' 
  | '4x6_single_l' 
  | '4x6_triple'
  | '1x4' 
  | '2x2' 
  | 'single';

export type FilterType = 'none' | 'bw' | 'vintage' | 'vivid';

export interface BoothSettings {
  layout: LayoutType;
  filter: FilterType;
  shotCount: number;
  frameColor: string;
  timerDuration: number;
}

export interface StickerInstance {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface PhotoFrame {
  id: string;
  dataUrl: string;
}
