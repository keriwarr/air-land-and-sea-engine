import { enumValues, mapToObject } from './utils';
import { THEATER } from './theater';

export enum CARD_EFFECT_TYPE {
  INSTANT = 'INSTANT',
  ONGOING = 'ONGOING',
  REGULAR = 'REGULAR',
}

export enum CARD_TYPE_KEY {
  SUPPORT = 'SUPPORT',
  AIR_DROP = 'AIR_DROP',
  MANEUVER = 'MANEUVER',
  AERODROME = 'AERODROME',
  CONTAINMENT = 'CONTAINMENT',
  HEAVY = 'HEAVY',
  REINFORCE = 'REINFORCE',
  AMBUSH = 'AMBUSH',
  COVER_FIRE = 'COVER_FIRE',
  DISRUPT = 'DISRUPT',
  TRANSPORT = 'TRANSPORT',
  ESCALATION = 'ESCALATION',
  REDEPLOY = 'REDEPLOY',
  BLOCKADE = 'BLOCKADE',
}
const CARD_TYPE_KEYS = enumValues(CARD_TYPE_KEY);

interface ICardType {
  theater?: THEATER;
  rank: number;
  defaultName: string;
  effectType: CARD_EFFECT_TYPE;
  description: string | null;
}

const CARD_TYPE: { readonly [K in CARD_TYPE_KEY]: ICardType } = {
  [CARD_TYPE_KEY.SUPPORT]: {
    theater: THEATER.AIR,
    rank: 1,
    defaultName: 'Support',
    effectType: CARD_EFFECT_TYPE.ONGOING,
    description: 'You gain +3 strength in each adjacent theater.',
  },
  [CARD_TYPE_KEY.AIR_DROP]: {
    theater: THEATER.AIR,
    rank: 2,
    defaultName: 'Air Drop',
    effectType: CARD_EFFECT_TYPE.INSTANT,
    description:
      'On your next turn, you may play a battle card to a non-matching theater.',
  },
  [CARD_TYPE_KEY.MANEUVER]: {
    rank: 3,
    defaultName: 'Maneuver',
    effectType: CARD_EFFECT_TYPE.INSTANT,
    description: 'FLIP a Battle Card in an adjacent theater.',
  },
  [CARD_TYPE_KEY.AERODROME]: {
    theater: THEATER.AIR,
    rank: 4,
    defaultName: 'Aerodrome',
    effectType: CARD_EFFECT_TYPE.ONGOING,
    description:
      'You may play Battle Cards of strength 3 or less to non-matching theaters.',
  },
  [CARD_TYPE_KEY.CONTAINMENT]: {
    theater: THEATER.AIR,
    rank: 5,
    defaultName: 'Containment',
    effectType: CARD_EFFECT_TYPE.ONGOING,
    description:
      'If either player players a Battle Card face-down, immediately discard that card',
  },
  [CARD_TYPE_KEY.HEAVY]: {
    rank: 6,
    defaultName: 'Heavy',
    effectType: CARD_EFFECT_TYPE.REGULAR,
    description: null,
  },
  [CARD_TYPE_KEY.REINFORCE]: {
    theater: THEATER.LAND,
    rank: 1,
    defaultName: 'Reinforce',
    effectType: CARD_EFFECT_TYPE.INSTANT,
    description:
      'Look at the top card of the Battle Deck. You may play it face down to an adjacent theater.',
  },
  [CARD_TYPE_KEY.AMBUSH]: {
    theater: THEATER.LAND,
    rank: 2,
    defaultName: 'Ambush',
    effectType: CARD_EFFECT_TYPE.INSTANT,
    description: 'FLIP a Battle Card in any theater.',
  },
  [CARD_TYPE_KEY.COVER_FIRE]: {
    theater: THEATER.LAND,
    rank: 4,
    defaultName: 'Cover Fire',
    effectType: CARD_EFFECT_TYPE.ONGOING,
    description: 'All Battle Cards covered by this card are now strength 4.',
  },
  [CARD_TYPE_KEY.DISRUPT]: {
    theater: THEATER.LAND,
    rank: 5,
    defaultName: 'Disrupt',
    effectType: CARD_EFFECT_TYPE.INSTANT,
    description:
      'Your opponent chooses and FLIPS 1 of their Battle Cards and then you FLIP 1 of yours.',
  },
  [CARD_TYPE_KEY.TRANSPORT]: {
    theater: THEATER.SEA,
    rank: 1,
    defaultName: 'Transport',
    effectType: CARD_EFFECT_TYPE.INSTANT,
    description: 'You may MOVE 1 of your Battle Cards to a different theater.',
  },
  [CARD_TYPE_KEY.ESCALATION]: {
    theater: THEATER.SEA,
    rank: 2,
    defaultName: 'Escalation',
    effectType: CARD_EFFECT_TYPE.ONGOING,
    description: 'All of your face-down cards are now Strength 4.',
  },
  [CARD_TYPE_KEY.REDEPLOY]: {
    theater: THEATER.SEA,
    rank: 4,
    defaultName: 'Redeploy',
    effectType: CARD_EFFECT_TYPE.INSTANT,
    description:
      'Return 1 of your face-down cards to your hand. If you do, gain an extra turn.',
  },
  [CARD_TYPE_KEY.BLOCKADE]: {
    theater: THEATER.SEA,
    rank: 5,
    defaultName: 'Blockade',
    effectType: CARD_EFFECT_TYPE.ONGOING,
    description:
      "If a Battle Card is played in an adjacent theater with 3 or more cards already in it (counting both players' cards), discard that card with no effect.",
  },
};

export class CardType implements ICardType {
  readonly key: CARD_TYPE_KEY;
  readonly theater: ICardType['theater'];
  readonly rank: ICardType['rank'];
  readonly defaultName: ICardType['defaultName'];
  readonly effectType: ICardType['effectType'];
  readonly description: ICardType['description'];

  private constructor(key: CARD_TYPE_KEY) {
    this.key = key;

    const cardType = CARD_TYPE[key];
    if (cardType.theater) {
      this.theater = cardType.theater;
    }
    this.rank = cardType.rank;
    this.defaultName = cardType.defaultName;
    this.effectType = cardType.effectType;
    this.description = cardType.description;
  }

  static readonly byKey = mapToObject(CARD_TYPE_KEYS, key =>
    Object.freeze(new CardType(key))
  );
  static readonly allKeys = CARD_TYPE_KEYS;
  static readonly all = CardType.allKeys.map(key => CardType.byKey[key]);
}
