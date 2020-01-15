import { Card } from './card';
import { PLAYER } from './player';
import { mapToObject } from './utils';
import { THEATER } from './theater';

type IPlayerTheaterBoardState = {
  card: Readonly<Card>;
  faceUp: boolean;
};

export interface ITheaterBoardState<T> {
  [PLAYER.ONE]: T;
  [PLAYER.TWO]: T;
}

export interface IBoardState<T = IPlayerTheaterBoardState[]> {
  [THEATER.AIR]: ITheaterBoardState<T>;
  [THEATER.LAND]: ITheaterBoardState<T>;
  [THEATER.SEA]: ITheaterBoardState<T>;
}

const getInitialTheaterBoardState = () => ({
  [PLAYER.ONE]: [],
  [PLAYER.TWO]: [],
});

export const getInitialBoardState = (
  theaterPermutation: [THEATER, THEATER, THEATER]
): IBoardState => mapToObject(theaterPermutation, getInitialTheaterBoardState);
