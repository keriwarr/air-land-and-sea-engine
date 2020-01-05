import { Card, Deck } from '../src/card';
import { enumValues, mapToObject } from '../src/utils';
import { THEATER, THEATERS } from '../src/theater';
import { CARD_TYPE_KEY } from '../src/cardType';

describe('Card', () => {
  it('can be instantiated', () => {
    new Card({
      cardTypeKey: CARD_TYPE_KEY.SUPPORT,
      theater: THEATER.AIR,
    });
  });

  it('can not be instantiated with invalid theater', () => {
    expect(() => {
      new Card({
        cardTypeKey: CARD_TYPE_KEY.SUPPORT,
        theater: THEATER.LAND,
      });
    }).toThrow();
  });

  it('can be serialized as JSON', () => {
    expect(
      new Card({
        cardTypeKey: CARD_TYPE_KEY.SUPPORT,
        theater: THEATER.AIR,
      }).toJSON()
    ).toMatchInlineSnapshot(`
      Object {
        "cardTypeKey": "SUPPORT",
        "description": "You gain +3 strength in each adjacent theater.",
        "effectType": "ONGOING",
        "name": "Support",
        "rank": 1,
        "theater": "AIR",
      }
    `);
  });
});

describe('Deck', () => {
  it('can be instantiated', () => {
    Deck.getStandard();
  });

  it('can find all of the cards', () => {
    const deck = Deck.getStandard();
    enumValues(THEATER).forEach(theater => {
      [1, 2, 3, 4, 5, 6].forEach(rank => {
        deck.find({ theater, rank });
      });
    });
  });

  it('can not find non-existent cards', () => {
    const deck = Deck.getStandard();

    expect(() => {
      deck.find({
        theater: THEATER.AIR,
        rank: 7,
      });
    }).toThrow();
  });

  it('shuffles the cards', () => {
    const deck1 = Deck.getStandard();
    const deck2 = Deck.getStandard();

    const cardMapper = ({ rank, theater }: Readonly<Card>) => ({
      rank,
      theater,
    });
    expect(deck1.cards.map(cardMapper)).not.toEqual(
      deck2.cards.map(cardMapper)
    );

    const theaterIndex = mapToObject(
      THEATERS,
      theater => THEATERS.findIndex(t => t === theater)! + 1
    );

    const getCardValue = (card: Readonly<Card>) =>
      2 ** card.rank * 3 ** theaterIndex[card.theater];
    const cardSorter = (cardA: Readonly<Card>, cardB: Readonly<Card>) =>
      getCardValue(cardA) - getCardValue(cardB);
    expect(deck1.cards.sort(cardSorter).map(cardMapper)).toEqual(
      deck2.cards.sort(cardSorter).map(cardMapper)
    );
  });
});
