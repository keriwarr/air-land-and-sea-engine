import { PLAYER, getOtherPlayer } from './player';
import { THEATER } from './theater';
import { CARD_TYPE_KEY } from './cardType';
import { IBoardState } from 'board';

export enum DECISION_TYPE {
  FLIP_DECISION = 'FLIP_DECISION',
  REINFORCE_DECISION = 'REINFORCE_DECISION',
  TRANSPORT_DECISION = 'TRANSPORT_DECISION',
  REDEPLOY_DECISION = 'REDEPLOY_DECISION',
}

interface IGenericDecision<T extends DECISION_TYPE = DECISION_TYPE> {
  type: T;
}

interface IOptionalDecision<T> {
  made: T | null;
}

interface IFlipDescription {
  targetedPlayer: PLAYER;
  theater: THEATER;
}

interface IReinforceDescription {
  theater: THEATER;
}

interface ITransportDescription {
  originTheater: THEATER;
  originIndexFromTop: number;
  destinationTheater: THEATER;
}
interface IRedeployDescription {
  theater: THEATER;
  indexFromTop: number;
}

export interface IFlipDecision
  extends IGenericDecision<DECISION_TYPE.FLIP_DECISION>,
    IFlipDescription {}

export interface IReinforceDecision
  extends IGenericDecision<DECISION_TYPE.REINFORCE_DECISION>,
    IOptionalDecision<IReinforceDescription> {}

export interface ITransportDecision
  extends IGenericDecision<DECISION_TYPE.TRANSPORT_DECISION>,
    IOptionalDecision<ITransportDescription> {}

export interface IRedeployDecision
  extends IGenericDecision<DECISION_TYPE.REDEPLOY_DECISION>,
    IOptionalDecision<IRedeployDescription> {}

export type IDecisionDescription<
  T extends DECISION_TYPE = DECISION_TYPE
> = T extends DECISION_TYPE.FLIP_DECISION
  ? IFlipDescription
  : T extends DECISION_TYPE.REINFORCE_DECISION
  ? IReinforceDescription
  : T extends DECISION_TYPE.TRANSPORT_DECISION
  ? ITransportDescription
  : T extends DECISION_TYPE.REDEPLOY_DECISION
  ? IRedeployDescription
  : never;

export type IDecision<
  T extends DECISION_TYPE = DECISION_TYPE
> = T extends DECISION_TYPE.FLIP_DECISION
  ? IFlipDecision
  : T extends DECISION_TYPE.REINFORCE_DECISION
  ? IReinforceDecision
  : T extends DECISION_TYPE.TRANSPORT_DECISION
  ? ITransportDecision
  : T extends DECISION_TYPE.REDEPLOY_DECISION
  ? IRedeployDecision
  : never;

export interface IAnticipatedDecision<T extends DECISION_TYPE = DECISION_TYPE> {
  type: T;
  player: PLAYER;
  promptingMoveIndex: number;
}

/**
 * the anticipated decisions are returned in order of anticipation. i.e. the
 * zeroeth decition is the one that we anticipate to be made next.
 */
export const getAnticipatedDecisions = (
  cardTypeKey: CARD_TYPE_KEY,
  player: PLAYER,
  promptingMoveIndex: number
): IAnticipatedDecision[] => {
  const anticipatedTypeAndPlayers = (() => {
    switch (cardTypeKey) {
      case CARD_TYPE_KEY.REINFORCE:
        return [
          {
            type: DECISION_TYPE.REINFORCE_DECISION,
            player,
          },
        ];
      case CARD_TYPE_KEY.AMBUSH: {
        return [
          {
            type: DECISION_TYPE.FLIP_DECISION,
            player,
          },
        ];
      }
      case CARD_TYPE_KEY.MANEUVER: {
        return [
          {
            type: DECISION_TYPE.FLIP_DECISION,
            player,
          },
        ];
      }
      case CARD_TYPE_KEY.DISRUPT:
        return [
          {
            type: DECISION_TYPE.FLIP_DECISION,
            player: getOtherPlayer(player),
          },
          { type: DECISION_TYPE.FLIP_DECISION, player },
        ];
      case CARD_TYPE_KEY.REDEPLOY: {
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

export const getOptionsForDecision = <T extends DECISION_TYPE>(
  decisionType: T,
  player: PLAYER,
  playedTheater: THEATER,
  boardState: IBoardState,
  getAdjacentTheaters: (theater: THEATER) => THEATER[]
): IDecisionDescription<T>[] => {
  return [];
};
