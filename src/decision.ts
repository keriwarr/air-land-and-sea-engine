import { PLAYER, getOtherPlayer } from './player';
import { THEATER } from './theater';
import { CARD_TYPE_KEY } from './cardType';

export enum DECISION_TYPE {
  FLIP_DECISION = 'FLIP_DECISION',
  REINFORCE_DECISION = 'REINFORCE_DECISION',
  TRANSPORT_DECISION = 'TRANSPORT_DECISION',
  REDEPLOY_DECISION = 'REDEPLOY_DECISION',
}

interface IGenericDecision<T extends DECISION_TYPE = DECISION_TYPE> {
  type: T;
}

interface IFlipDecision extends IGenericDecision<DECISION_TYPE.FLIP_DECISION> {
  targetedPlayer: PLAYER;
  theater: THEATER;
}
interface IReinforceDecision
  extends IGenericDecision<DECISION_TYPE.REINFORCE_DECISION> {
  made: {
    theater: THEATER;
  } | null;
}
interface ITransportDecision
  extends IGenericDecision<DECISION_TYPE.TRANSPORT_DECISION> {
  made: {
    originTheater: THEATER;
    originIndexFromTop: number;
    destinationTheater: THEATER;
  } | null;
}
interface IRedeployDecision
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

export const getAnticipatedDecisions = (
  cardTypeKey: CARD_TYPE_KEY,
  player: PLAYER
): Array<{ type: DECISION_TYPE; player: PLAYER }> => {
  switch (cardTypeKey) {
    case CARD_TYPE_KEY.REINFORCE:
      return [{ type: DECISION_TYPE.REINFORCE_DECISION, player }];
    case CARD_TYPE_KEY.AMBUSH:
      return [{ type: DECISION_TYPE.FLIP_DECISION, player }];
    case CARD_TYPE_KEY.MANEUVER:
      return [{ type: DECISION_TYPE.FLIP_DECISION, player }];
    case CARD_TYPE_KEY.DISRUPT:
      return [
        { type: DECISION_TYPE.FLIP_DECISION, player },
        {
          type: DECISION_TYPE.FLIP_DECISION,
          player: getOtherPlayer(player),
        },
      ];
    case CARD_TYPE_KEY.REDEPLOY:
      return [{ type: DECISION_TYPE.REDEPLOY_DECISION, player }];
    case CARD_TYPE_KEY.TRANSPORT:
      return [{ type: DECISION_TYPE.TRANSPORT_DECISION, player }];
    default:
      return [];
  }
};
