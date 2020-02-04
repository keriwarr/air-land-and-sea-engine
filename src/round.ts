import { Card, Deck, ICardDescriptor } from './card';
import {
  exhaustiveSwitch,
  mapValues,
  keyBy,
  mapToObject,
  isNotNull,
} from './utils';
import { computed, action } from 'mobx';
import { computedFn } from 'mobx-utils';
import { IMove, MOVE_TYPE, MoveState, ICardMove, IDecisionMove } from './move';
import { produce } from 'immer';
import { PLAYER, getOtherPlayer } from './player';
import { IBoardState, getInitialBoardState } from './board';
import {
  DECISION_TYPE,
  getAnticipatedDecisions,
  IAnticipatedDecision,
  IFlipDecision,
  IReinforceDecision,
  ITransportDecision,
  IRedeployDecision,
} from './decision';
import { THEATER, THEATERS } from './theater';
import { CARD_TYPE_KEY } from './cardType';

export class RoundState {
  readonly deck = Deck.getStandard();
  readonly moveState = new MoveState();

  constructor(
    private readonly theaterPermutation: [THEATER, THEATER, THEATER],
    private readonly opts: { disableHandContainsCheck?: boolean } = {}
  ) {}

  // for testing only
  // note that this is currently coupled to the implementations of
  // this.startingHandP1 and this.startingHandP2
  public readonly allocateHands = (
    playerOne: ICardDescriptor[],
    playerTwo: ICardDescriptor[] = [],
    deck: ICardDescriptor[] = []
  ) => {
    if (this.numMoves !== 0) {
      throw new Error('This method can only be used before moves are played');
    }
    deck.forEach((cardDescriptor, index) => {
      this.deck.swapToIndex(cardDescriptor, index + 12);
    });
    playerOne.forEach((cardDescriptor, index) => {
      this.deck.swapToIndex(cardDescriptor, index * 2);
    });
    playerTwo.forEach((cardDescriptor, index) => {
      this.deck.swapToIndex(cardDescriptor, index * 2 + 1);
    });
  };

  @computed
  get numMoves() {
    return this.moveState.numMoves;
  }

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
  get startingDeck() {
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
      const playerForMove = this.momentaryActivePlayer(moveCount - 1);
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
                const cardState =
                  previousBoardState[decision.made.theater][player][
                    decision.made.indexFromTop
                  ];
                if (cardState && !cardState.faceUp) {
                  draftState.push(cardState.card);
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
    },
    { keepAlive: true }
  );

  @computed
  get currentHandP1() {
    return this.momentaryHand(this.numMoves, PLAYER.ONE);
  }

  @computed
  get currentHandP2() {
    return this.momentaryHand(this.numMoves, PLAYER.TWO);
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
      const player = this.momentaryActivePlayer(moveCount - 1);
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
                const deck = this.momentaryDeck(moveCount - 1);
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
    },
    { keepAlive: true }
  );

  // better way to memoize this?
  readonly getAdjacentTheaters = computedFn(
    (theater: THEATER) => {
      const theaterIndex = this.theaterPermutation.findIndex(
        t => t === theater
      );

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
    },
    { keepAlive: true }
  );

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
    return this.momentaryTheaterStrengths(this.numMoves);
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
    return this.momentaryBoardState(this.numMoves);
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

  readonly momentaryActivePlayer = computedFn(
    (moveCount: number): PLAYER => {
      if (moveCount === 0) {
        return PLAYER.ONE;
      }

      // I should re do this my measuring how many turns each player has taken
      // so far, and comparing that to how many they should have taken w.r.t. redeploy

      const anticipatedMoves = this.momentaryAnticipatedDecisionsStack(
        moveCount
      );

      if (anticipatedMoves.length > 0) {
        return anticipatedMoves[anticipatedMoves.length - 1].player;
      }

      const turnOrderIsToggledNow = this.turnOrderToggledByRedeploy(moveCount);
      const lastMoveCountWithNoAnticipatedMoves = this.lastMoveCountWithNoAnticipatedMoves(
        moveCount
      );
      const lastPlayerForMove = this.momentaryActivePlayer(
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

  readonly momentaryAnticipatedDecisionsStack = computedFn(
    (moveCount: number): IAnticipatedDecision[] => {
      if (moveCount === 0) {
        return [];
      }

      const move = this.moveState.getMove(moveCount - 1);
      const player = this.momentaryActivePlayer(moveCount - 1);
      const previousState = this.momentaryAnticipatedDecisionsStack(
        moveCount - 1
      );

      if (move === null) {
        return previousState;
      }

      return produce(previousState, draftState => {
        switch (move.type) {
          case MOVE_TYPE.CARD: {
            const card = this.deck.byId[move.id];
            if (!move.faceUp) {
              break;
            }

            const previousBoardState = this.momentaryBoardState(moveCount - 1);

            getAnticipatedDecisions(
              card.cardTypeKey,
              player,
              moveCount - 1,
              move.theater,
              previousBoardState,
              this.getAdjacentTheaters
            ).forEach(anticipatedDecision => {
              draftState.push(anticipatedDecision);
            });
            break;
          }
          case MOVE_TYPE.DECISION: {
            draftState.pop();
            if (move.decision.type === DECISION_TYPE.FLIP_DECISION) {
              const previousBoardState = this.momentaryBoardState(
                moveCount - 1
              );
              const flippedCardState =
                previousBoardState[move.decision.theater][
                  move.decision.targetedPlayer
                ][0];
              if (flippedCardState && !flippedCardState.faceUp) {
                getAnticipatedDecisions(
                  flippedCardState.card.cardTypeKey,
                  move.decision.targetedPlayer,
                  moveCount - 1,
                  move.decision.theater,
                  previousBoardState,
                  this.getAdjacentTheaters
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
    },
    { keepAlive: true }
  );

  @computed
  get anticipatedDecisionsStack() {
    return this.momentaryAnticipatedDecisionsStack(this.numMoves);
  }

  @computed
  get anticipatedDecision(): IAnticipatedDecision | null {
    return this.anticipatedDecisionsStack[0] || null;
  }

  readonly lastMoveCountWithNoAnticipatedMoves = computedFn(
    (moveCount: number): number => {
      if (moveCount <= 0) {
        return 0;
      }
      const anticipatedMoves = this.momentaryAnticipatedDecisionsStack(
        moveCount - 1
      );
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

      const playerAtStartOfLastTurn = this.momentaryActivePlayer(
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
      const playerForMove = this.momentaryActivePlayer(moveCount - 1);
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

      const cardState =
        previousBoardState[move.decision.made.theater][playerForMove][
          move.decision.made.indexFromTop
        ];

      if (!cardState || cardState.faceUp) {
        return previousState;
      }

      return previousState + 1;
    }
  );

  @computed
  get activePlayer() {
    return this.momentaryActivePlayer(this.numMoves);
  }

  readonly momentaryCardFaceUpMap = computedFn(
    (moveCount: number): Partial<{ [cardId: number]: boolean }> => {
      if (moveCount === 0) {
        return {};
      }

      const move = this.moveState.getMove(moveCount - 1);
      const player = this.momentaryActivePlayer(moveCount - 1);
      const previousState = this.momentaryCardFaceUpMap(moveCount - 1);

      if (move === null || move.type === MOVE_TYPE.SURRENDER) {
        return previousState;
      }

      return produce(previousState, draftState => {
        switch (move.type) {
          case MOVE_TYPE.CARD: {
            draftState[move.id] = move.faceUp;
            break;
          }
          case MOVE_TYPE.DECISION: {
            const { decision } = move;
            switch (decision.type) {
              case DECISION_TYPE.FLIP_DECISION: {
                const previousBoardState = this.momentaryBoardState(
                  moveCount - 1
                );
                const cardState =
                  previousBoardState[decision.theater][
                    decision.targetedPlayer
                  ][0];
                if (cardState) {
                  draftState[cardState.card.id] = !cardState.faceUp;
                }
                break;
              }
              case DECISION_TYPE.REDEPLOY_DECISION: {
                const previousBoardState = this.momentaryBoardState(
                  moveCount - 1
                );
                const cardState =
                  previousBoardState[decision.made.theater][player][
                    decision.made.indexFromTop
                  ];
                if (cardState) {
                  delete draftState[cardState.card.id];
                }
                break;
              }
              case DECISION_TYPE.REINFORCE_DECISION: {
                if (!decision.made) {
                  break;
                }
                const deck = this.momentaryDeck(moveCount - 1);
                draftState[deck[0].id] = false;
                break;
              }
              case DECISION_TYPE.TRANSPORT_DECISION:
                break;
              default:
                exhaustiveSwitch({
                  switchValue: decision,
                  errorMessage: `Unrecognized move: ${JSON.stringify(
                    move.decision
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

  readonly momentaryCardFaceUp = computedFn(
    (moveCount: number, cardId: number) => {
      return this.momentaryCardFaceUpMap(moveCount)[cardId];
    }
  );

  @computed
  get cardFaceUpMap() {
    return this.momentaryCardFaceUpMap(this.numMoves);
  }

  readonly cardFaceUp = computedFn(
    (cardId: number) => {
      return this.momentaryCardFaceUp(this.numMoves, cardId);
    },
    { keepAlive: true }
  );

  readonly momentaryLastCardForPlayer = computedFn(
    (moveCount: number, player: PLAYER): number | null => {
      if (moveCount === 0) {
        return null;
      }

      const move = this.moveState.getMove(moveCount - 1);
      const playerForMove = this.momentaryActivePlayer(moveCount - 1);
      const previousState = this.momentaryLastCardForPlayer(
        moveCount - 1,
        player
      );

      if (move === null || move.type !== MOVE_TYPE.CARD) {
        return previousState;
      }

      if (playerForMove !== player) {
        return previousState;
      }

      return move.id;
    }
  );

  readonly lastCardForPlayer = computedFn(
    (player: PLAYER) => {
      return this.momentaryLastCardForPlayer(this.numMoves, player);
    },
    { keepAlive: true }
  );

  // This is potentially a pretty gross perf cost. Maybe find a way to do this
  // incrementally, or just a better way to implement aerodrome
  readonly momentaryAllCardLocations = computedFn((moveCount: number) => {
    const iterableTheaters = this.momentaryIterableTheaters(moveCount);

    const cardLocationsArray = iterableTheaters
      .map(({ cards, player, theater }) =>
        cards.map(({ card }, index) => ({
          player,
          theater,
          indexFromTop: index,
          cardId: card.id,
        }))
      )
      .reduce((flat, cardLocations) => [...flat, ...cardLocations], []);

    return keyBy(cardLocationsArray, cardLocation => cardLocation.cardId);
  });

  readonly momentaryCardLocation = computedFn(
    (moveCount: number, cardId: number) => {
      const allCardLocations = this.momentaryAllCardLocations(moveCount);

      const cardLocation = allCardLocations[cardId];

      return cardLocation
        ? {
            player: cardLocation.player,
            theater: cardLocation.theater,
            indexFromTop: cardLocation.indexFromTop,
          }
        : null;
    }
  );

  readonly cardLocation = computedFn(
    (cardId: number) => {
      return this.momentaryCardLocation(this.numMoves, cardId);
    },
    { keepAlive: true }
  );

  readonly momentaryGlobalEffects = computedFn(
    (moveCount: number) => {
      const containmentInEffect = this.deck.cards
        .filter(card => card.cardTypeKey === CARD_TYPE_KEY.CONTAINMENT)
        .reduce(
          (someFaceUp, containmentCard) =>
            someFaceUp ||
            !!this.momentaryCardFaceUp(moveCount, containmentCard.id),
          false
        );

      return [...(containmentInEffect ? [CARD_TYPE_KEY.CONTAINMENT] : [])];
    },
    { keepAlive: true }
  );

  @computed
  get globalEffects() {
    return this.momentaryGlobalEffects(this.numMoves);
  }

  readonly momentaryTheaterEffectsMap = computedFn((moveCount: number) => {
    const blockadedTheaters = this.deck.cards
      .filter(card => card.cardTypeKey === CARD_TYPE_KEY.BLOCKADE)
      .filter(card => !!this.momentaryCardFaceUp(moveCount, card.id))
      .map(card => this.momentaryCardLocation(moveCount, card.id))
      .filter(isNotNull)
      .map(location => this.getAdjacentTheaters(location.theater))
      .reduce((flat, theaters) => [...flat, ...theaters], [])
      .filter(theater => {
        const p1CardCount = this.momentaryBoardState(moveCount)[theater][
          PLAYER.ONE
        ].length;
        const p2CardCount = this.momentaryBoardState(moveCount)[theater][
          PLAYER.TWO
        ].length;

        return p1CardCount + p2CardCount >= 3;
      });

    return mapToObject(THEATERS, theater => {
      const theaterIsBlockaded = blockadedTheaters.includes(theater);

      return [...(theaterIsBlockaded ? [CARD_TYPE_KEY.BLOCKADE] : [])];
    });
  });

  @computed({ keepAlive: true })
  get theaterEffectsMap() {
    return this.momentaryTheaterEffectsMap(this.numMoves);
  }

  readonly momentaryTheaterEffects = computedFn(
    (moveCount: number, theater: THEATER) => {
      return this.momentaryTheaterEffectsMap(moveCount)[theater];
    }
  );

  readonly theaterEffects = computedFn((theater: THEATER) => {
    return this.momentaryTheaterEffects(this.numMoves, theater);
  });

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
      return getOtherPlayer(this.momentaryActivePlayer(this.numMoves - 1));
    }

    return this.momentaryTheatersControlled(this.numMoves, PLAYER.ONE) >= 2
      ? PLAYER.ONE
      : PLAYER.TWO;
  }

  @action
  readonly playMove = (move: IMove, opts: { dryRun?: boolean } = {}) => {
    if (this.complete) {
      throw new Error('Can not play move: game is complete');
    }

    // TODO validation

    if (!opts.dryRun) {
      this.moveState.pushMove(move);
    }
  };

  @action
  readonly surrender = () => {
    this.playMove({ type: MOVE_TYPE.SURRENDER });
  };

  @action
  readonly playCard = (
    move: Omit<ICardMove, 'type'>,
    opts: { dryRun?: boolean } = {}
  ) => {
    if (this.anticipatedDecision) {
      throw new Error('Can not play a card when a decision is anticipated');
    }

    const hand = this.currentHand;

    if (
      !hand.find(card => card.id === move.id) &&
      !this.opts.disableHandContainsCheck
    ) {
      throw new Error('Played card was not found in active players hand');
    }

    const lastPlayedCardId = this.lastCardForPlayer(this.activePlayer);
    const airDropInEffect =
      lastPlayedCardId !== null &&
      this.deck.byId[lastPlayedCardId].cardTypeKey === CARD_TYPE_KEY.AIR_DROP &&
      this.cardFaceUp(lastPlayedCardId);
    const aerodromeInEffet =
      !!this.cardFaceUp(this.deck.find({ type: CARD_TYPE_KEY.AERODROME }).id) &&
      this.cardLocation(this.deck.find({ type: CARD_TYPE_KEY.AERODROME }).id)
        ?.player === this.activePlayer &&
      this.deck.byId[move.id].rank <= 3;

    if (
      move.faceUp &&
      move.theater !== this.deck.byId[move.id].theater &&
      !airDropInEffect &&
      !aerodromeInEffet
    ) {
      throw new Error("Played card doesn't match the theater it was played in");
    }

    this.playMove({ type: MOVE_TYPE.CARD, ...move }, opts);
  };

  // for testing only
  @action
  readonly playCardDescriptor = (
    card: ICardDescriptor,
    moveConfig: {
      faceUp?: boolean;
      theater?: THEATER;
    } = {},
    opts: { dryRun?: boolean } = {}
  ) => {
    this.playCard(this.deck.find(card).getMove(moveConfig), opts);
  };

  @action
  readonly playDecision = (
    move: Omit<IDecisionMove, 'type'>,
    opts: { dryRun?: boolean } = {}
  ) => {
    const anticipatedDecision = this.anticipatedDecision;

    if (!anticipatedDecision) {
      throw new Error('There is no decision currently anticipated');
    }

    if (anticipatedDecision.player !== this.activePlayer) {
      throw new Error('A decision from the other player was anticipated');
    }

    const { decision } = move;

    if (anticipatedDecision.type !== decision.type) {
      throw new Error('This decision type was not anticipated');
    }

    const promptingMove = this.moveState.getMove(
      anticipatedDecision.promptingMoveIndex
    );

    if (!promptingMove || promptingMove.type === MOVE_TYPE.SURRENDER) {
      throw new Error("couldn't find valid prompting move for decision");
    }

    const promptingMoveTheater = (() => {
      if (promptingMove.type === MOVE_TYPE.CARD) {
        return promptingMove.theater;
      }

      if (promptingMove.decision.type === DECISION_TYPE.FLIP_DECISION) {
        return promptingMove.decision.theater;
      }

      throw new Error('Only a flip decision can prompt another decision');
    })();

    switch (decision.type) {
      case DECISION_TYPE.FLIP_DECISION: {
        const promptingCardId = (() => {
          if (promptingMove.type === MOVE_TYPE.CARD) {
            return promptingMove.id;
          }
          if (promptingMove.decision.type === DECISION_TYPE.FLIP_DECISION) {
            return this.momentaryBoardState(
              anticipatedDecision.promptingMoveIndex + 1
            )[promptingMove.decision.theater][
              promptingMove.decision.targetedPlayer
            ][0].card.id;
          }

          throw new Error('Only a flip decision can prompt another decision');
        })();

        const card = this.deck.byId[promptingCardId];
        switch (card.cardTypeKey) {
          case CARD_TYPE_KEY.MANEUVER: {
            if (
              !this.getAdjacentTheaters(promptingMoveTheater).includes(
                decision.theater
              )
            ) {
              throw new Error(
                'Maneuver may only target cards in adjacent theaters'
              );
            }
            break;
          }
          case CARD_TYPE_KEY.DISRUPT: {
            if (decision.targetedPlayer !== this.activePlayer) {
              throw new Error(
                'Disrupt decisions must be made by each player individually'
              );
            }
            break;
          }
        }
        break;
      }
      case DECISION_TYPE.REDEPLOY_DECISION: {
        if (!decision.made) {
          break;
        }
        const redeployingCard = this.boardState[decision.made.theater][
          this.activePlayer
        ][decision.made.indexFromTop];
        if (!redeployingCard) {
          throw new Error("Couldn't find valid target for redeploy decision");
        }
        if (!redeployingCard.faceUp) {
          throw new Error('Card targeted for redeploy is not face down');
        }
        break;
      }
      case DECISION_TYPE.REINFORCE_DECISION: {
        if (!decision.made) {
          break;
        }
        if (
          !this.getAdjacentTheaters(promptingMoveTheater).includes(
            decision.made.theater
          )
        ) {
          throw new Error(
            'Reinforcement card must be played to adjacent theater'
          );
        }
        break;
      }
      case DECISION_TYPE.TRANSPORT_DECISION: {
        if (!decision.made) {
          break;
        }
        const card = this.boardState[decision.made.originTheater][
          this.activePlayer
        ][decision.made.originIndexFromTop];
        if (!card) {
          throw new Error("Couldn't find valid target for transport decision");
        }
        break;
      }
      default:
        exhaustiveSwitch({
          switchValue: decision,
          errorMessage: `Unrecognized move: ${JSON.stringify(decision)}`,
        });
    }

    this.playMove({ type: MOVE_TYPE.DECISION, ...move }, opts);
  };

  @action
  readonly playFlipDecision = (
    move: Omit<IFlipDecision, 'type'>,
    opts: { dryRun?: boolean } = {}
  ) => {
    this.playDecision(
      {
        decision: { type: DECISION_TYPE.FLIP_DECISION, ...move },
      },
      opts
    );
  };

  @action
  readonly playReinforceDecision = (
    move: Omit<IReinforceDecision, 'type'>,
    opts: { dryRun?: boolean } = {}
  ) => {
    this.playDecision(
      {
        decision: { type: DECISION_TYPE.REINFORCE_DECISION, ...move },
      },
      opts
    );
  };

  @action
  readonly playTransportDecision = (
    move: Omit<ITransportDecision, 'type'>,
    opts: { dryRun?: boolean } = {}
  ) => {
    this.playDecision(
      {
        decision: { type: DECISION_TYPE.TRANSPORT_DECISION, ...move },
      },
      opts
    );
  };

  @action
  readonly playRedeployDecision = (
    move: Omit<IRedeployDecision, 'type'>,
    opts: { dryRun?: boolean } = {}
  ) => {
    this.playDecision(
      {
        decision: { type: DECISION_TYPE.REDEPLOY_DECISION, ...move },
      },
      opts
    );
  };
}
