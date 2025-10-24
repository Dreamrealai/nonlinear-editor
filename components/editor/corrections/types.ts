export interface CorrectionValues {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
}

export interface TransformValues {
  rotation: number;
  scale: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export interface AudioEffectValues {
  bassGain: number;
  midGain: number;
  trebleGain: number;
  compression: number;
  normalize: boolean;
}

export type SectionType = 'color' | 'transform' | 'audio';
