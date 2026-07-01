import type { ItemId } from '../config/pashaTypes';
import type { PashaTypeId } from '../config/pashaTypes';

export interface GameSessionConfig {
  playerName: string;
  pashaType: PashaTypeId;
  itemId: ItemId;
}

export interface RunResult {
  score: number;
  survivalTime: number;
  tasksDeflected: number;
  tasksMissed: number;
  maxChaosLevel: number;
  babyFinal: number;
  daughterFinal: number;
  workFinal: number;
  energyFinal: number;
  won: boolean;
  resultStatus: string;
  pashaType: PashaTypeId;
  itemId: ItemId;
  playerName: string;
}

/** Конкретная конечность для отбивания */
export type LimbKind = 'leftFoot' | 'rightFoot' | 'leftHand' | 'rightHand' | 'bothHands' | 'head';

export interface HandState {
  leftHandFree: boolean;
  rightHandFree: boolean;
  inBathroom: boolean;
  tossBabyActive: boolean;
  kindergartenActive: boolean;
}
