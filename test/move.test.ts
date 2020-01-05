import { MoveState, MOVE_TYPE } from '../src/move';
import { reaction, autorun } from 'mobx';

describe('MoveState', () => {
  it('instantiates', () => {
    new MoveState();
  });

  it('starts with no moves in it', () => {
    const moveState = new MoveState();

    expect(moveState.numMoves).toEqual(0);
    expect(moveState.mostRecentMove).toEqual(null);
    autorun(reaction => {
      expect(() => {
        moveState.getMove(0);
      }).toThrow();
      reaction.dispose();
    });
  });

  it('does not update observers too much', () => {
    const moveState = new MoveState();

    moveState.pushMove({
      type: MOVE_TYPE.SURRENDER,
    });

    const mockObserver1 = jest.fn();
    const mockObserver2 = jest.fn();
    reaction(() => moveState.getMove(0), mockObserver1);
    reaction(() => moveState.mostRecentMove, mockObserver2);

    moveState.pushMove({
      type: MOVE_TYPE.SURRENDER,
    });

    expect(mockObserver1).not.toHaveBeenCalled();
    expect(mockObserver2).toHaveBeenCalled();
  });
});
