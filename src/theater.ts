import { enumValues } from './utils';

export enum THEATER {
  AIR = 'AIR',
  LAND = 'LAND',
  SEA = 'SEA',
}
export const THEATERS = enumValues(THEATER);
