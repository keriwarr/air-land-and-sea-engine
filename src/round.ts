import { Card, Deck } from './card';
import { exhaustiveSwitch, mapValues } from './utils';
import { computed, action } from 'mobx';
import { computedFn } from 'mobx-utils';
import { IMove, MOVE_TYPE, MoveState, ICardMove, IDecisionMove } from './move';
import { produce } from 'immer';
import { PLAYER, getOtherPlayer } from './player';
import { IBoardState, getInitialBoardState } from './board';
import { DECISION_TYPE, getAnticipatedDecisions } from './decision';
import { THEATER, THEATERS } from './theater';
import { CARD_TYPE_KEY } from './cardType';

export class RoundState {
  readonly deck = Deck.getStandard();
  readonly moveState = new MoveState();

  constructor(
    private readonly theaterPermutation: [THEATER, THEATER, THEATER]
  ) {}

  @computed
  private get startingHandP1() {
    return [
      this.deck.cards[0],
      this.deck.cards[2],
      this.deck.cards[4],
      this.deck.cards[6],
      this.deck.cards[8],
      this.deck.cards[10],
    ];
  }

  @computed
  private get startingHandP2() {
    return [
      this.deck.cards[1],
      this.deck.cards[3],
      this.deck.cards[5],
      this.deck.cards[7],
      this.deck.cards[9],
      this.deck.cards[11],
    ];
  }

  @computed
  private get startingDeck() {
    return [
      this.deck.cards[12],
      this.deck.cards[13],
      this.deck.cards[14],
      this.deck.cards[15],
      this.deck.cards[16],
      this.deck.cards[17],
    ];
  }

  readonly momentaryHand = computedFn(
    (moveCount: number, player: PLAYER): Readonly<Card>[] => {
      if (moveCount === 0) {
        if (player === PLAYER.ONE) {
          return this.startingHandP1;
        }
        return this.startingHandP2;
      }

      const move = this.moveState.getMove(moveCount - 1);
      const playerForMove = this.playerForMove(moveCount - 1);
      const previousState = this.momentaryHand(moveCount - 1, player);

      if (move === null || move.type === MOVE_TYPE.SURRENDER) {
        return previousState;
      }

      if (player !== playerForMove) {
        return previousState;
      }

      return produce(previousState, draftState => {
        switch (move.type) {
          case MOVE_TYPE.CARD: {
            const cardIndex = draftState.findIndex(card => card.id === move.id);
            if (cardIndex !== -1) draftState.splice(cardIndex, 1);
            break;
          }
          case MOVE_TYPE.DECISION: {
            const { decision } = move;
            switch (decision.type) {
              case DECISION_TYPE.REDEPLOY_DECISION: {
                const previousBoardState = this.momentaryBoardState(
                  moveCount - 1
                );
                const card =
                  previousBoardState[decision.made.theater][player][
                    decision.made.indexFromTop
                  ];
                if (card && !card.faceUp) {
                  draftState.push(card.card);
                }
                break;
              }
              case DECISION_TYPE.FLIP_DECISION:
              case DECISION_TYPE.REINFORCE_DECISION:
              case DECISION_TYPE.TRANSPORT_DECISION:
                break;
              default:
                exhaustiveSwitch({
                  switchValue: decision,
                  errorMessage: `Unrecognized decision: ${JSON.stringify(
                    decision
                  )}`,
                });
            }
            break;
          }
          default:
            exhaustiveSwitch({
              switchValue: move,
              errorMessage: `Unrecognized move: ${JSON.stringify(move)}`,
            });
        }
      });
    }
  );

  @computed
  get currentHandP1() {
    return this.momentaryHand(this.moveState.numMoves, PLAYER.ONE);
  }

  @computed
  get currentHandP2() {
    return this.momentaryHand(this.moveState.numMoves, PLAYER.TWO);
  }

  @computed
  get currentHand() {
    return this.activePlayer === PLAYER.ONE
      ? this.currentHandP1
      : this.currentHandP2;
  }

  readonly momentaryDeck = computedFn((moveCount: number): Readonly<Card>[] => {
    if (moveCount === 0) {
      return this.startingDeck;
    }

    const move = this.moveState.getMove(moveCount - 1);
    const previousState = this.momentaryDeck(moveCount - 1);

    if (move === null || move.type !== MOVE_TYPE.DECISION) {
      return previousState;
    }

    if (move.decision.type !== DECISION_TYPE.REINFORCE_DECISION) {
      return previousState;
    }

    if (!move.decision.made) {
      return previousState;
    }

    return previousState.slice(1);
  });

  readonly momentaryBoardState = computedFn(
    (moveCount: number): IBoardState => {
      if (moveCount === 0) {
        return getInitialBoardState(this.theaterPermutation);
      }

      const move = this.moveState.getMove(moveCount - 1);
      const player = this.playerForMove(moveCount - 1);
      const previousState = this.momentaryBoardState(moveCount - 1);

      if (move === null || move.type === MOVE_TYPE.SURRENDER) {
        return previousState;
      }

      return produce(previousState, draftState => {
        switch (move.type) {
          case MOVE_TYPE.CARD: {
            draftState[move.theater][player].unshift({
              card: this.deck.byId[move.id],
              faceUp: move.faceUp,
            });
            break;
          }
          case MOVE_TYPE.DECISION: {
            const { decision } = move;
            switch (decision.type) {
              case DECISION_TYPE.FLIP_DECISION: {
                const targetedCard =
                  draftState[decision.theater][decision.targetedPlayer][0];
                // TODO - how to smartly handle the case where there is no
                // possible flip target?
                if (targetedCard) {
                  targetedCard.faceUp = !targetedCard.faceUp;
                }
                break;
              }
              case DECISION_TYPE.REDEPLOY_DECISION: {
                draftState[decision.made.theater][player].splice(
                  decision.made.indexFromTop,
                  1
                );
                break;
              }
              case DECISION_TYPE.REINFORCE_DECISION: {
                if (!decision.made) {
                  break;
                }
                const deck = this.momentaryDeck(moveCount);
                draftState[decision.made.theater][player].unshift({
                  card: deck[0],
                  faceUp: false,
                });
                break;
              }
              case DECISION_TYPE.TRANSPORT_DECISION: {
                if (!decision.made) {
                  break;
                }
                const [transportedCard] = draftState[
                  decision.made.originTheater
                ][player].splice(decision.made.originIndexFromTop, 1);
                draftState[decision.made.destinationTheater][player].unshift(
                  transportedCard
                );
                break;
              }
              default:
                exhaustiveSwitch({
                  switchValue: decision,
                  errorMessage: `Unrecognized decision: ${JSON.stringify(
                    decision
                  )}`,
                });
            }
            break;
          }
          default:
            exhaustiveSwitch({
              switchValue: move,
              errorMessage: `Unrecognized move: ${JSON.stringify(move)}`,
            });
        }
      });
    }
  );

  readonly getAdjacentTheaters = computedFn((theater: THEATER) => {
    const theaterIndex = this.theaterPermutation.findIndex(t => t === theater);

    switch (theaterIndex) {
      case 0:
        return [this.theaterPermutation[1]];
      case 1:
        return [this.theaterPermutation[0], this.theaterPermutation[2]];
      case 2:
        return [this.theaterPermutation[1]];
      default:
        throw new Error(
          `Could not find theater ${theater} in theater permutation.`
        );
    }
  });

  readonly momentaryEffectiveStrengths = computedFn((moveCount: number) => {
    const startingPoint = mapValues(this.deck.byId, card => card.rank);

    const theaters = this.momentaryIterableTheaters(moveCount);

    const p1FlippedCardIds: number[] = [];
    const p2FlippedCardIds: number[] = [];
    let p1Escalated = false;
    let p2Escalated = false;
    theaters.forEach(({ player, cards }) => {
      if (player === PLAYER.ONE) {
        p1FlippedCardIds.push(
          ...cards.filter(({ faceUp }) => !faceUp).map(({ card }) => card.id)
        );
      } else {
        p2FlippedCardIds.push(
          ...cards.filter(({ faceUp }) => !faceUp).map(({ card }) => card.id)
        );
      }

      cards.forEach(({ card, faceUp }) => {
        if (!faceUp) {
          startingPoint[card.id] = 2;
        }
      });

      if (
        cards.findIndex(
          ({ card, faceUp }) =>
            card.cardTypeKey === CARD_TYPE_KEY.ESCALATION && faceUp
        ) > -1
      ) {
        if (player === PLAYER.ONE) {
          p1Escalated = true;
        } else {
          p2Escalated = true;
        }
      }

      const coverFireIndex = cards.findIndex(
        ({ card, faceUp }) =>
          card.cardTypeKey === CARD_TYPE_KEY.COVER_FIRE && faceUp
      );
      if (coverFireIndex > -1) {
        cards.slice(coverFireIndex + 1).forEach(({ card }) => {
          startingPoint[card.id] = 4;
        });
      }
    });

    if (p1Escalated) {
      p1FlippedCardIds.forEach(cardId => {
        startingPoint[cardId] = 4;
      });
    }

    if (p2Escalated) {
      p2FlippedCardIds.forEach(cardId => {
        startingPoint[cardId] = 4;
      });
    }

    return startingPoint;
  });

  readonly momentaryTheaterStrengths = computedFn(
    (moveCount: number): IBoardState<number> => {
      const effectiveStrengths = this.momentaryEffectiveStrengths(moveCount);
      const iterableTheaters = this.momentaryIterableTheaters(moveCount);

      const supportingTheaters = iterableTheaters.filter(
        ({ cards }) =>
          !!cards.find(
            ({ card, faceUp }) =>
              card.cardTypeKey === CARD_TYPE_KEY.SUPPORT && faceUp
          )
      );

      const boardState = this.momentaryBoardState(moveCount);

      return produce(boardState, draftState => {
        const theaterStrengths = mapValues(draftState, theaterBoardState => {
          return mapValues(theaterBoardState, playerBoardState => {
            return playerBoardState.reduce(
              (total, { card }) => total + effectiveStrengths[card.id],
              0
            );
          });
        });

        supportingTheaters.forEach(
          ({ theater: supportingTheater, player: supportingPlayer }) => {
            this.getAdjacentTheaters(supportingTheater).forEach(
              supportedTheaterKey => {
                theaterStrengths[supportedTheaterKey][supportingPlayer] += 3;
              }
            );
          }
        );

        return theaterStrengths;
      });
    }
  );

  @computed
  get currentTheaterStrengths() {
    return this.momentaryTheaterStrengths(this.moveState.numMoves);
  }

  @computed
  get orderedTheaterStrengths() {
    return this.theaterPermutation.map(theater => ({
      [PLAYER.ONE]: this.currentTheaterStrengths[theater][PLAYER.ONE],
      [PLAYER.TWO]: this.currentTheaterStrengths[theater][PLAYER.TWO],
      theater,
    }));
  }

  readonly momentaryTheaterController = computedFn(
    (moveCount: number, theater: THEATER) => {
      const theaterStrengths = this.momentaryTheaterStrengths(moveCount);

      if (
        theaterStrengths[theater][PLAYER.ONE] >=
        theaterStrengths[theater][PLAYER.TWO]
      ) {
        return PLAYER.ONE;
      }
      return PLAYER.TWO;
    }
  );

  readonly momentaryTheatersControlled = computedFn(
    (moveCount: number, player: PLAYER) => {
      return THEATERS.map(theater =>
        this.momentaryTheaterController(moveCount, theater)
      ).filter(controller => controller === player).length;
    }
  );

  @computed
  public get boardState() {
    return this.momentaryBoardState(this.moveState.numMoves);
  }

  // mostly just for testing?
  @computed
  public get orderedBoardState() {
    const boardState = this.boardState;
    return this.theaterPermutation.map(theater => ({
      [PLAYER.ONE]: boardState[theater][PLAYER.ONE],
      [PLAYER.TWO]: boardState[theater][PLAYER.TWO],
      theater,
    }));
  }

  readonly momentaryIterableTheaters = computedFn((moveCount: number) => {
    const boardState = this.momentaryBoardState(moveCount);
    return [
      {
        theater: this.theaterPermutation[0],
        player: PLAYER.ONE,
        cards: boardState[this.theaterPermutation[0]].ONE,
      },
      {
        theater: this.theaterPermutation[1],
        player: PLAYER.ONE,
        cards: boardState[this.theaterPermutation[1]].ONE,
      },
      {
        theater: this.theaterPermutation[2],
        player: PLAYER.ONE,
        cards: boardState[this.theaterPermutation[2]].ONE,
      },
      {
        theater: this.theaterPermutation[0],
        player: PLAYER.TWO,
        cards: boardState[this.theaterPermutation[0]].TWO,
      },
      {
        theater: this.theaterPermutation[1],
        player: PLAYER.TWO,
        cards: boardState[this.theaterPermutation[1]].TWO,
      },
      {
        theater: this.theaterPermutation[2],
        player: PLAYER.TWO,
        cards: boardState[this.theaterPermutation[2]].TWO,
      },
    ];
  });

  @computed
  public get simpleBoardState(): IBoardState<string[]> {
    return mapValues(this.boardState, theater =>
      mapValues(theater, cards =>
        cards.map(
          ({ card, faceUp }) =>
            `${card.theater}-${card.name}-${card.rank}${
              faceUp ? '' : ' (flipped)'
            }`
        )
      )
    );
  }

  readonly playerForMove = computedFn(
    (moveCount: number): PLAYER => {
      if (moveCount === 0) {
        return PLAYER.ONE;
      }

      // I should re do this my measuring how many turns each player has taken
      // so far, and comparing that to how many they should have taken w.r.t. redeploy

      const anticipatedMoves = this.anticipatedDecisionsStack(moveCount);

      if (anticipatedMoves.length > 0) {
        return anticipatedMoves[anticipatedMoves.length - 1].player;
      }

      const turnOrderIsToggledNow = this.turnOrderToggledByRedeploy(moveCount);
      const lastMoveCountWithNoAnticipatedMoves = this.lastMoveCountWithNoAnticipatedMoves(
        moveCount
      );
      const lastPlayerForMove = this.playerForMove(
        lastMoveCountWithNoAnticipatedMoves
      );
      const turnOrderWasToggledThen = this.turnOrderToggledByRedeploy(
        lastMoveCountWithNoAnticipatedMoves
      );

      if (turnOrderIsToggledNow !== turnOrderWasToggledThen) {
        return lastPlayerForMove;
      }

      return getOtherPlayer(lastPlayerForMove);
    }
  );

  readonly anticipatedDecisionsStack = computedFn(
    (moveCount: number): Array<{ type: DECISION_TYPE; player: PLAYER }> => {
      if (moveCount === 0) {
        return [];
      }

      const move = this.moveState.getMove(moveCount - 1);
      const player = this.playerForMove(moveCount - 1);
      const previousState = this.anticipatedDecisionsStack(moveCount - 1);

      if (move === null) {
        return previousState;
      }

      return produce(previousState, draftState => {
        switch (move.type) {
          case MOVE_TYPE.CARD: {
            const card = this.deck.byId[move.id];
            getAnticipatedDecisions(card.cardTypeKey, player).forEach(
              anticipatedDecision => {
                draftState.push(anticipatedDecision);
              }
            );
            break;
          }
          case MOVE_TYPE.DECISION: {
            draftState.pop();
            if (move.decision.type === DECISION_TYPE.FLIP_DECISION) {
              const previousBoardState = this.momentaryBoardState(
                moveCount - 1
              );
              const flippedCard =
                previousBoardState[move.decision.theater][
                  move.decision.targetedPlayer
                ][0];
              if (flippedCard && !flippedCard.faceUp) {
                getAnticipatedDecisions(
                  flippedCard.card.cardTypeKey,
                  move.decision.targetedPlayer
                ).forEach(anticipatedDecision => {
                  draftState.push(anticipatedDecision);
                });
              }
            }
            break;
          }
          case MOVE_TYPE.SURRENDER: {
            break;
          }
          default:
            exhaustiveSwitch({
              switchValue: move,
              errorMessage: `Unrecognized move: ${JSON.stringify(move)}`,
            });
        }
      });
    }
  );

  readonly lastMoveCountWithNoAnticipatedMoves = computedFn(
    (moveCount: number): number => {
      if (moveCount <= 0) {
        return 0;
      }
      const anticipatedMoves = this.anticipatedDecisionsStack(moveCount - 1);
      if (anticipatedMoves.length === 0) {
        return moveCount - 1;
      }
      return this.lastMoveCountWithNoAnticipatedMoves(moveCount - 1);
    }
  );

  readonly turnOrderToggledByRedeploy = computedFn(
    (moveCount: number): boolean => {
      if (moveCount === 0) {
        return false;
      }

      const lastMoveCountWithNoAnticipatedMoves = this.lastMoveCountWithNoAnticipatedMoves(
        moveCount
      );

      const playerAtStartOfLastTurn = this.playerForMove(
        lastMoveCountWithNoAnticipatedMoves
      );

      const redeploysBeforeCurrentMove = this.numRedeploymentsAsOfTurn(
        moveCount,
        playerAtStartOfLastTurn
      );
      const redeploysBeforeLastTurn = this.numRedeploymentsAsOfTurn(
        lastMoveCountWithNoAnticipatedMoves,
        getOtherPlayer(playerAtStartOfLastTurn)
      );

      const totalRedeployEffects =
        redeploysBeforeCurrentMove + redeploysBeforeLastTurn;
      return totalRedeployEffects % 2 === 1;
    }
  );

  readonly numRedeploymentsAsOfTurn = computedFn(
    (moveCount: number, player: PLAYER.ONE | PLAYER.TWO): number => {
      if (moveCount === 0) {
        return 0;
      }

      const move = this.moveState.getMove(moveCount - 1);
      const playerForMove = this.playerForMove(moveCount - 1);
      const previousState = this.numRedeploymentsAsOfTurn(
        moveCount - 1,
        player
      );

      if (!move || move.type !== MOVE_TYPE.DECISION) {
        return previousState;
      }

      if (playerForMove !== player) {
        return previousState;
      }

      if (move.decision.type !== DECISION_TYPE.REDEPLOY_DECISION) {
        return previousState;
      }

      const previousBoardState = this.momentaryBoardState(moveCount - 1);

      const redeployedCard =
        previousBoardState[move.decision.made.theater][playerForMove][
          move.decision.made.indexFromTop
        ];

      if (!redeployedCard || redeployedCard.faceUp) {
        return previousState;
      }

      return previousState + 1;
    }
  );

  @computed
  get activePlayer() {
    return this.playerForMove(this.moveState.numMoves);
  }

  @computed
  get complete() {
    return (
      (this.currentHandP1.length === 0 && this.currentHandP2.length === 0) ||
      !!(this.moveState.mostRecentMove?.type === MOVE_TYPE.SURRENDER)
    );
  }

  @computed
  get victor() {
    if (!this.complete) {
      return null;
    }

    if (this.moveState.mostRecentMove?.type === MOVE_TYPE.SURRENDER) {
      // this is janky
      return this.activePlayer;
    }

    return this.momentaryTheatersControlled(
      this.moveState.numMoves,
      PLAYER.ONE
    ) >= 2
      ? PLAYER.ONE
      : PLAYER.TWO;
  }

  @action
  readonly playMove = (move: IMove) => {
    if (this.complete) {
      throw new Error('Can not play move: game is complete');
    }

    // TODO validation

    this.moveState.pushMove(move);
  };

  @action
  readonly surrender = () => {
    this.playMove({ type: MOVE_TYPE.SURRENDER });
  };

  @action
  readonly playCard = (move: Omit<ICardMove, 'type'>) => {
    this.playMove({ type: MOVE_TYPE.CARD, ...move });
  };

  @action
  readonly playDecision = (decision: Omit<IDecisionMove, 'type'>) => {
    this.playMove({ type: MOVE_TYPE.DECISION, ...decision });
  };
}
