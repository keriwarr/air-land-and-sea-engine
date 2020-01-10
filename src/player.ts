export enum PLAYER {
  ONE = 'ONE',
  TWO = 'TWO',
}

export const getOtherPlayer = (player: PLAYER) =>
  player === PLAYER.ONE ? PLAYER.TWO : PLAYER.ONE;
