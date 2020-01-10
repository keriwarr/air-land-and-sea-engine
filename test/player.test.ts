import { getOtherPlayer, PLAYER } from '../src/player';

describe('getOtherPlayer', () => {
  it('gets the other player', () => {
    expect(getOtherPlayer(PLAYER.ONE)).toBe(PLAYER.TWO);
    expect(getOtherPlayer(PLAYER.TWO)).toBe(PLAYER.ONE);
  });
});
