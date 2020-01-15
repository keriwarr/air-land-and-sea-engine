import { enumValues, exhaustiveSwitch } from './utils';

export enum THEATER {
  AIR = 'AIR',
  LAND = 'LAND',
  SEA = 'SEA',
}
export const THEATERS = enumValues(THEATER);

export const getDifferentTheater = (theater: THEATER) => {
  switch (theater) {
    case THEATER.AIR:
      return THEATER.LAND;
    case THEATER.LAND:
      return THEATER.SEA;
    case THEATER.SEA:
      return THEATER.AIR;
    default:
      return exhaustiveSwitch({
        switchValue: theater,
      });
  }
};
