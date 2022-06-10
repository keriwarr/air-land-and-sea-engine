import { enumValues } from 'utils';

export enum PLAYER {
  ONE = 'ONE',
  TWO = 'TWO',
}

export const PLAYERS = enumValues(PLAYER);

export const getOtherPlayer = (player: PLAYER) =>
  player === PLAYER.ONE ? PLAYER.TWO : PLAYER.ONE;
