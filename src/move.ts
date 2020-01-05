import { observable, computed, action, IObservableValue } from 'mobx';
import { computedFn } from 'mobx-utils';
import { IDecision } from './decision';
import { THEATER } from './theater';

export enum MOVE_TYPE {
  CARD = 'CARD',
  DECISION = 'DECISION',
  SURRENDER = 'SURRENDER',
}

interface IGenericMove<T extends MOVE_TYPE = MOVE_TYPE> {
  type: T;
}

export interface ICardMove extends IGenericMove<MOVE_TYPE.CARD> {
  id: number;
  theater: THEATER;
  faceUp: boolean;
}

export interface IDecisionMove extends IGenericMove<MOVE_TYPE.DECISION> {
  decision: IDecision;
}

interface ISurrenderMove extends IGenericMove<MOVE_TYPE.SURRENDER> {}

export type IMove = ISurrenderMove | ICardMove | IDecisionMove;

export class MoveState {
  private readonly moves: IObservableValue<null | IMove>[] = [];

  @observable
  private internalNumMoves = 0;

  public readonly getMove = computedFn((index: number) => {
    if (!this.moves[index]) {
      throw new Error(`OOB: Can't access move #${index}.`);
    }

    return this.moves[index].get();
  });

  @computed
  public get mostRecentMove() {
    return this.internalNumMoves === 0
      ? null
      : this.getMove(this.internalNumMoves - 1);
  }

  @computed
  public get numMoves() {
    return this.internalNumMoves;
  }

  @action
  readonly pushMove = (move: IMove) => {
    const box = observable.box(move);
    this.moves.push(box);
    this.internalNumMoves += 1;
  };
}
