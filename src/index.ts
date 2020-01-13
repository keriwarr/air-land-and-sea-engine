import { PLAYER } from './player';
import { RoundState } from './round';
import { DECISION_TYPE, IDecision } from './decision';
import { THEATER } from './theater';
import { ITheaterBoardState } from 'board';
import { autorun } from 'mobx';

// if (__DEV__) {
//   configure({
//     computedRequiresReaction: true,
//     observableRequiresReaction: true,
//     reactionRequiresObservable: true,
//     enforceActions: 'observed',
//   });
// }

for (let i = 0; i < 1000; i += 1) {
  const roundState = new RoundState([THEATER.AIR, THEATER.LAND, THEATER.SEA]);

  autorun(reaction => {
    //   console.log('activePlayer: ', roundState.activePlayer);
    //   console.log(
    //     'anticipatedMovesStack: ',
    //     roundState.anticipatedDecisionsStack(roundState.moveState.numMoves)
    //   );
    //   console.log(
    //     'currentHandP1',
    //     roundState.currentHandP1.map(
    //       card => `${card.theater}-${card.name}-${card.rank}`
    //     )
    //   );
    //   console.log(
    //     'currentHandP2',
    //     roundState.currentHandP2.map(
    //       card => `${card.theater}-${card.name}-${card.rank}`
    //     )
    //   );
    //   console.log('boardState:');
    //   console.log(JSON.stringify(roundState.simpleBoardState, undefined, 2));
    //   console.log('victor', roundState.victor);
    //   console.log('----');

    if (roundState.complete) {
      reaction.dispose();
      return;
    }

    const anticipatedDecisionsStack = roundState.momentaryAnticipatedDecisionsStack(
      roundState.moveState.numMoves
    );
    const boardState = roundState.simpleBoardState;
    const hand = roundState.currentHand;

    if (Math.random() < 0.1) {
      roundState.surrender();
      return;
    }

    const playerTheaters = (Object.entries(boardState) as Array<
      [THEATER, ITheaterBoardState<string[]>]
    >)
      .map(([theaterKey, theater]) =>
        Object.entries(theater).map(([player, cards]) => [
          theaterKey,
          player,
          cards,
        ])
      )
      .reduce((p, n) => [...p, ...n], []);

    if (anticipatedDecisionsStack.length > 0) {
      const { type } = anticipatedDecisionsStack[
        anticipatedDecisionsStack.length - 1
      ];
      roundState.playDecision({
        decision: ((): IDecision => {
          switch (type) {
            case DECISION_TYPE.FLIP_DECISION:
              const flipTarget = playerTheaters.find(
                ([_, __, cards]) => cards.length > 0
              );
              return {
                type,
                targetedPlayer:
                  (flipTarget && (flipTarget[1] as PLAYER)) || PLAYER.ONE,
                theater:
                  (flipTarget && (flipTarget[0] as THEATER)) || THEATER.AIR,
              };
            case DECISION_TYPE.REDEPLOY_DECISION:
              return {
                type,
                made: {
                  theater: THEATER.AIR,
                  indexFromTop: 0,
                },
              };
            case DECISION_TYPE.REINFORCE_DECISION:
              return {
                type,
                made: null,
              };
            case DECISION_TYPE.TRANSPORT_DECISION:
              return {
                type,
                made: null,
              };
          }
        })(),
      });
      return;
    }

    roundState.playCard(hand[0].getMove());
  });
}
