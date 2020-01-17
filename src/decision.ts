import { PLAYER, getOtherPlayer } from './player';
import { THEATER } from './theater';
import { CARD_TYPE_KEY } from './cardType';
import { IBoardState } from './board';
import { enumValues } from './utils';

export enum DECISION_TYPE {
  FLIP_DECISION = 'FLIP_DECISION',
  REINFORCE_DECISION = 'REINFORCE_DECISION',
  TRANSPORT_DECISION = 'TRANSPORT_DECISION',
  REDEPLOY_DECISION = 'REDEPLOY_DECISION',
}

interface IGenericDecision<T extends DECISION_TYPE = DECISION_TYPE> {
  type: T;
}

export interface IFlipDecision
  extends IGenericDecision<DECISION_TYPE.FLIP_DECISION> {
  targetedPlayer: PLAYER;
  theater: THEATER;
}
export interface IReinforceDecision
  extends IGenericDecision<DECISION_TYPE.REINFORCE_DECISION> {
  made: {
    theater: THEATER;
  } | null;
}
export interface ITransportDecision
  extends IGenericDecision<DECISION_TYPE.TRANSPORT_DECISION> {
  made: {
    originTheater: THEATER;
    originIndexFromTop: number;
    destinationTheater: THEATER;
  } | null;
}
export interface IRedeployDecision
  extends IGenericDecision<DECISION_TYPE.REDEPLOY_DECISION> {
  made: {
    theater: THEATER;
    indexFromTop: number;
  };
}

export type IDecision =
  | IFlipDecision
  | IReinforceDecision
  | ITransportDecision
  | IRedeployDecision;

export interface IAnticipatedDecision {
  type: DECISION_TYPE;
  player: PLAYER;
  promptingMoveIndex: number;
}

export const getAnticipatedDecisions = (
  cardTypeKey: CARD_TYPE_KEY,
  player: PLAYER,
  promptingMoveIndex: number,
  playedTheater: THEATER,
  boardState: IBoardState,
  getAdjacentTheaters: (theater: THEATER) => THEATER[]
): IAnticipatedDecision[] => {
  const anticipatedTypeAndPlayers = (() => {
    switch (cardTypeKey) {
      case CARD_TYPE_KEY.REINFORCE:
        return [{ type: DECISION_TYPE.REINFORCE_DECISION, player }];
      case CARD_TYPE_KEY.AMBUSH:
        return [{ type: DECISION_TYPE.FLIP_DECISION, player }];
      case CARD_TYPE_KEY.MANEUVER: {
        const adjacentTheaters = getAdjacentTheaters(playedTheater);
        const adjacentPlayerTheaters = adjacentTheaters
          .map(theater =>
            enumValues(PLAYER).map(player => boardState[theater][player])
          )
          .reduce((flat, playerTheaters) => [...flat, ...playerTheaters], []);
        if (
          !adjacentPlayerTheaters.find(
            adjacentPlayerTheater => adjacentPlayerTheater.length > 0
          )
        ) {
          return [];
        }
        return [{ type: DECISION_TYPE.FLIP_DECISION, player }];
      }
      case CARD_TYPE_KEY.DISRUPT:
        return [
          { type: DECISION_TYPE.FLIP_DECISION, player },
          {
            type: DECISION_TYPE.FLIP_DECISION,
            player: getOtherPlayer(player),
          },
        ];
      case CARD_TYPE_KEY.REDEPLOY: {
        const playerCardStates = enumValues(THEATER)
          .map(theater => boardState[theater][player])
          .reduce((flat, cardStates) => [...flat, ...cardStates], []);
        if (!playerCardStates.find(cardState => !cardState.faceUp)) {
          return [];
        }
        return [{ type: DECISION_TYPE.REDEPLOY_DECISION, player }];
      }
      case CARD_TYPE_KEY.TRANSPORT:
        return [{ type: DECISION_TYPE.TRANSPORT_DECISION, player }];
      default:
        return [];
    }
  })();

  return anticipatedTypeAndPlayers.map(typeAndPlayer => ({
    ...typeAndPlayer,
    promptingMoveIndex: promptingMoveIndex,
  }));
};
