import { PLAYER, getOtherPlayer, PLAYERS } from './player';
import { THEATER, THEATERS } from './theater';
import { CARD_TYPE_KEY } from './cardType';
import { IBoardState } from 'board';
import { exhaustiveSwitch, isNotNull } from 'utils';

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

export interface IGenericAnticipatedDecision<
  T extends DECISION_TYPE = DECISION_TYPE
> {
  readonly type: T;
  readonly player: PLAYER;
  readonly promptingMoveIndex: number;
}

export interface IAnticipatedFlipDecision
  extends IGenericAnticipatedDecision<DECISION_TYPE.FLIP_DECISION> {
  readonly targetedPlayers: PLAYER[];
  readonly targetedTheaters: THEATER[];
}

export type IAnticipatedDecision<
  T extends DECISION_TYPE = DECISION_TYPE
> = T extends DECISION_TYPE.FLIP_DECISION
  ? IAnticipatedFlipDecision
  : T extends
      | DECISION_TYPE.REINFORCE_DECISION
      | DECISION_TYPE.TRANSPORT_DECISION
      | DECISION_TYPE.REDEPLOY_DECISION
  ? IGenericAnticipatedDecision<T>
  : never;

/**
 * the anticipated decisions are returned in order of anticipation. i.e. the
 * zeroeth decition is the one that we anticipate to be made next.
 */
export const getAnticipatedDecisions = (
  cardTypeKey: CARD_TYPE_KEY,
  player: PLAYER,
  promptingMoveIndex: number,
  adjacentThaters: THEATER[]
) => {
  return (() => {
    switch (cardTypeKey) {
      case CARD_TYPE_KEY.REINFORCE:
        return [
          {
            type: DECISION_TYPE.REINFORCE_DECISION,
            player,
            promptingMoveIndex,
          } as const,
        ];
      case CARD_TYPE_KEY.AMBUSH: {
        return [
          {
            type: DECISION_TYPE.FLIP_DECISION,
            targetedPlayers: PLAYERS,
            targetedTheaters: THEATERS,
            player,
            promptingMoveIndex,
          } as const,
        ];
      }
      case CARD_TYPE_KEY.MANEUVER: {
        return [
          {
            type: DECISION_TYPE.FLIP_DECISION,
            targetedPlayers: PLAYERS,
            targetedTheaters: adjacentThaters,
            player,
            promptingMoveIndex,
          } as const,
        ];
      }
      case CARD_TYPE_KEY.DISRUPT:
        return [
          {
            type: DECISION_TYPE.FLIP_DECISION,
            targetedPlayers: [getOtherPlayer(player)] as PLAYER[],
            targetedTheaters: THEATERS,
            player: getOtherPlayer(player),
            promptingMoveIndex,
          } as const,
          {
            type: DECISION_TYPE.FLIP_DECISION,
            targetedPlayers: [player] as PLAYER[],
            targetedTheaters: THEATERS,
            player,
            promptingMoveIndex,
          } as const,
        ];
      case CARD_TYPE_KEY.REDEPLOY: {
        return [
          {
            type: DECISION_TYPE.REDEPLOY_DECISION,
            player,
            promptingMoveIndex,
          } as const,
        ];
      }
      case CARD_TYPE_KEY.TRANSPORT:
        return [
          {
            type: DECISION_TYPE.TRANSPORT_DECISION,
            player,
            promptingMoveIndex,
          } as const,
        ];
      default:
        return [];
    }
  })();
};

export const getOptionsForDecision = <T extends DECISION_TYPE = DECISION_TYPE>(
  anticipatedDecision: IAnticipatedDecision<T>,
  boardState: IBoardState
): IDecisionDescription<T>[] => {
  switch (anticipatedDecision.type) {
    case DECISION_TYPE.FLIP_DECISION: {
      return anticipatedDecision.targetedPlayers.map(targetedPlayer => {
        return anticipatedDecision.targetedTheaters.map(targetedTheater => {
          if (boardState[targetedTheater][targetedPlayer].length > 0) {
            return {
              targetedPlayer,
              theater: targetedTheater;
            }
          }
          return null;
        }).filter(isNotNull);
      }).reduce((flat, next) => [...flat, next], []);
    }
    case DECISION_TYPE.REDEPLOY_DECISION: {
      break;
    }
    case DECISION_TYPE.REINFORCE_DECISION: {
      break;
    }
    case DECISION_TYPE.TRANSPORT_DECISION: {
      break;
    }
    default:
      exhaustiveSwitch({
        switchValue: anticipatedDecision,
        errorMessage: `Unrecognized decision: ${JSON.stringify(
          anticipatedDecision
        )}`,
      });
  }
  return [];
};
