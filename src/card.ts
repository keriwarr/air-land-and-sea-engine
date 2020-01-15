import { keyBy, shuffle } from './utils';
import { THEATER } from './theater';
import { CARD_TYPE_KEY, CardType } from './cardType';

interface ICard {
  cardTypeKey: CARD_TYPE_KEY;
  theater: THEATER;
  name?: string;
}

const STANDARD_DECK_DATA: Array<ICard> = [
  {
    cardTypeKey: CARD_TYPE_KEY.SUPPORT,
    theater: THEATER.AIR,
  },
  {
    cardTypeKey: CARD_TYPE_KEY.AIR_DROP,
    theater: THEATER.AIR,
  },
  {
    cardTypeKey: CARD_TYPE_KEY.MANEUVER,
    theater: THEATER.AIR,
  },
  {
    cardTypeKey: CARD_TYPE_KEY.AERODROME,
    theater: THEATER.AIR,
  },
  {
    cardTypeKey: CARD_TYPE_KEY.CONTAINMENT,
    theater: THEATER.AIR,
  },
  {
    cardTypeKey: CARD_TYPE_KEY.HEAVY,
    theater: THEATER.AIR,
    name: 'Heavy Bombers',
  },
  {
    cardTypeKey: CARD_TYPE_KEY.REINFORCE,
    theater: THEATER.LAND,
  },
  {
    cardTypeKey: CARD_TYPE_KEY.AMBUSH,
    theater: THEATER.LAND,
  },
  {
    cardTypeKey: CARD_TYPE_KEY.MANEUVER,
    theater: THEATER.LAND,
  },
  {
    cardTypeKey: CARD_TYPE_KEY.COVER_FIRE,
    theater: THEATER.LAND,
  },
  {
    cardTypeKey: CARD_TYPE_KEY.DISRUPT,
    theater: THEATER.LAND,
  },
  {
    cardTypeKey: CARD_TYPE_KEY.HEAVY,
    theater: THEATER.LAND,
    name: 'Heavy Tanks',
  },
  {
    cardTypeKey: CARD_TYPE_KEY.TRANSPORT,
    theater: THEATER.SEA,
  },
  {
    cardTypeKey: CARD_TYPE_KEY.ESCALATION,
    theater: THEATER.SEA,
  },
  {
    cardTypeKey: CARD_TYPE_KEY.MANEUVER,
    theater: THEATER.SEA,
  },
  {
    cardTypeKey: CARD_TYPE_KEY.REDEPLOY,
    theater: THEATER.SEA,
  },
  {
    cardTypeKey: CARD_TYPE_KEY.BLOCKADE,
    theater: THEATER.SEA,
  },
  {
    cardTypeKey: CARD_TYPE_KEY.HEAVY,
    theater: THEATER.SEA,
    name: 'Super Battleship',
  },
];

export class Card {
  private readonly cardType: CardType;
  private readonly customName: ICard['name'];
  public readonly id: number;

  public readonly theater: ICard['theater'];

  private static cardIdCounter = 1;

  public constructor(card: ICard) {
    const cardType = CardType.byKey[card.cardTypeKey];

    if (cardType.theater && cardType.theater !== card.theater) {
      throw new Error(
        `Card type ${cardType.key} can not be instantiated as card in theater ${card.theater}`
      );
    }

    this.id = Card.cardIdCounter;
    Card.cardIdCounter += 1;
    this.cardType = cardType;
    this.theater = card.theater;
    this.customName = card.name;
  }

  public get cardTypeKey() {
    return this.cardType.key;
  }

  public get name() {
    return this.customName || this.cardType.defaultName;
  }

  public get rank() {
    return this.cardType.rank;
  }

  public get effectType() {
    return this.cardType.effectType;
  }

  public get description() {
    return this.cardType.description;
  }

  public toJSON() {
    return {
      cardTypeKey: this.cardTypeKey,
      name: this.name,
      rank: this.rank,
      theater: this.theater,
      effectType: this.effectType,
      description: this.description,
    };
  }

  readonly getMove = ({
    faceUp = true,
    theater = this.theater,
  }: {
    faceUp?: boolean;
    theater?: THEATER;
  } = {}) => {
    return {
      id: this.id,
      faceUp,
      theater: theater,
    };
  };
}

export class Deck {
  public readonly cards: Readonly<Card>[];
  public readonly byId: { [id: number]: Readonly<Card> };

  constructor(cardData: ICard[]) {
    this.cards = cardData.map(datum => Object.freeze(new Card(datum)));
    shuffle(this.cards);
    this.byId = keyBy(this.cards, card => card.id);
  }

  // TODO memoize this
  // TODO should this do a .filter and then throw if multiple cards are matched?
  public readonly find = ({
    theater,
    rank,
    type,
  }: {
    theater?: THEATER;
    rank?: number;
    type?: CARD_TYPE_KEY;
  }) => {
    const card = this.cards.find(
      card =>
        (theater === undefined || card.theater === theater) &&
        (rank === undefined || card.rank === rank) &&
        (type === undefined || card.cardTypeKey === type)
    );

    if (!card) {
      throw new Error(
        `Card of theather ${theater} and rank ${rank} does not exist in this deck`
      );
    }

    return card;
  };

  public static getStandard() {
    return new Deck(STANDARD_DECK_DATA);
  }
}
