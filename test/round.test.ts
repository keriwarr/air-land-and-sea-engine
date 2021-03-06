import { RoundState } from '../src/round';
import { PLAYER } from '../src/player';
import { THEATER, getDifferentTheater } from '../src/theater';
import { CARD_TYPE_KEY } from '../src/cardType';
import { enumValues } from '../src/utils';

const descriptors = {
  SUPPORT: { type: CARD_TYPE_KEY.SUPPORT },
  REINFORCE: { type: CARD_TYPE_KEY.REINFORCE },
  TRANSPORT: { type: CARD_TYPE_KEY.TRANSPORT },
  AIR_DROP: { type: CARD_TYPE_KEY.AIR_DROP },
  AMBUSH: { type: CARD_TYPE_KEY.AMBUSH },
  ESCALATION: { type: CARD_TYPE_KEY.ESCALATION },
  AIR_MANEUVER: { type: CARD_TYPE_KEY.MANEUVER, theater: THEATER.AIR },
  LAND_MANEUVER: { type: CARD_TYPE_KEY.MANEUVER, theater: THEATER.LAND },
  SEA_MANEUVER: { type: CARD_TYPE_KEY.MANEUVER, theater: THEATER.SEA },
  AERODROME: { type: CARD_TYPE_KEY.AERODROME },
  COVER_FIRE: { type: CARD_TYPE_KEY.COVER_FIRE },
  REDEPLOY: { type: CARD_TYPE_KEY.REDEPLOY },
  CONTAINMENT: { type: CARD_TYPE_KEY.CONTAINMENT },
  DISRUPT: { type: CARD_TYPE_KEY.DISRUPT },
  BLOCKADE: { type: CARD_TYPE_KEY.BLOCKADE },
  HEAVY_BOMBERS: { type: CARD_TYPE_KEY.HEAVY, theater: THEATER.AIR },
  HEAVY_TANKS: { type: CARD_TYPE_KEY.HEAVY, theater: THEATER.LAND },
  SUPER_BATTLESHIP: { type: CARD_TYPE_KEY.HEAVY, theater: THEATER.SEA },
};

const DEFAULT_THEATER_ORDER = [THEATER.AIR, THEATER.LAND, THEATER.SEA] as const;

describe('RoundState', () => {
  let roundState: RoundState;

  beforeEach(() => {
    roundState = new RoundState(DEFAULT_THEATER_ORDER);
  });

  describe('End Conditions', () => {
    it('initially has no victor', () => {
      expect(roundState.victor).toBe(null);
      expect(roundState.complete).toBe(false);
    });

    it('has a victor after a surrender', () => {
      roundState.surrender();
      expect(roundState.victor).toBe(PLAYER.TWO);
      expect(roundState.complete).toBe(true);
    });

    it('has a different victor after a later surrender', () => {
      roundState.allocateHands([descriptors.HEAVY_BOMBERS]);

      roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);

      roundState.surrender();
      expect(roundState.victor).toBe(PLAYER.ONE);
      expect(roundState.complete).toBe(true);
    });

    it('does not permit surrendering twice', () => {
      roundState.surrender();
      expect(() => {
        roundState.surrender();
      }).toThrowErrorMatchingInlineSnapshot(
        `"Can not play move: game is complete"`
      );
    });

    // not implemented yet
    it.skip('does not permit surrendering if a decision is anticipated', () => {
      roundState.allocateHands([descriptors.AIR_MANEUVER]);

      roundState.playCardDescriptor(descriptors.AIR_MANEUVER);
      expect(() => {
        roundState.surrender();
      }).toThrowErrorMatchingInlineSnapshot();
    });

    it("doesn't permit playing a card after surrendering", () => {
      roundState.allocateHands([], [descriptors.HEAVY_BOMBERS]);

      roundState.surrender();

      expect(() => {
        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);
      }).toThrowErrorMatchingInlineSnapshot(
        `"Can not play move: game is complete"`
      );
    });

    it("doesn't have a victor if a decision is anticipated", () => {
      roundState.allocateHands(
        [
          descriptors.BLOCKADE,
          descriptors.COVER_FIRE,
          descriptors.SUPER_BATTLESHIP,
          descriptors.AIR_DROP,
          descriptors.TRANSPORT,
          descriptors.AERODROME,
        ],
        [
          descriptors.HEAVY_TANKS,
          descriptors.AMBUSH,
          descriptors.HEAVY_BOMBERS,
          descriptors.AIR_MANEUVER,
          descriptors.LAND_MANEUVER,
          descriptors.SEA_MANEUVER,
        ]
      );

      // all face down until...
      roundState.playCardDescriptor(descriptors.BLOCKADE, { faceUp: false });
      roundState.playCardDescriptor(descriptors.HEAVY_TANKS, { faceUp: false });
      roundState.playCardDescriptor(descriptors.COVER_FIRE, { faceUp: false });
      roundState.playCardDescriptor(descriptors.AMBUSH, { faceUp: false });
      roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP, {
        faceUp: false,
      });
      roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS, {
        faceUp: false,
      });
      roundState.playCardDescriptor(descriptors.AIR_DROP, { faceUp: false });
      roundState.playCardDescriptor(descriptors.AIR_MANEUVER, {
        faceUp: false,
      });
      roundState.playCardDescriptor(descriptors.TRANSPORT, { faceUp: false });
      roundState.playCardDescriptor(descriptors.LAND_MANEUVER, {
        faceUp: false,
      });
      roundState.playCardDescriptor(descriptors.AERODROME, { faceUp: false });
      // face up maneuver!
      roundState.playCardDescriptor(descriptors.SEA_MANEUVER);

      expect(roundState.victor).toBe(null);
      expect(roundState.complete).toBe(false);

      // flip over the cover fire
      roundState.playFlipDecision({
        theater: THEATER.LAND,
        targetedPlayer: PLAYER.ONE,
      });

      expect(roundState.victor).not.toBe(null);
      expect(roundState.complete).toBe(true);
    });
  });

  describe('Cards Types', () => {
    describe(CARD_TYPE_KEY.SUPPORT, () => {
      it('adds strength to the center theater', () => {
        roundState.allocateHands([descriptors.SUPPORT]);

        roundState.playCardDescriptor(descriptors.SUPPORT);

        expect(roundState.orderedTheaterStrengths).toMatchInlineSnapshot(`
          Array [
            Object {
              "ONE": 1,
              "TWO": 0,
              "theater": "AIR",
            },
            Object {
              "ONE": 3,
              "TWO": 0,
              "theater": "LAND",
            },
            Object {
              "ONE": 0,
              "TWO": 0,
              "theater": "SEA",
            },
          ]
        `);
      });

      it('adds strength to the outside theaters', () => {
        roundState = new RoundState([THEATER.LAND, THEATER.AIR, THEATER.SEA]);

        roundState.allocateHands([descriptors.SUPPORT]);

        roundState.playCardDescriptor(descriptors.SUPPORT);

        expect(roundState.orderedTheaterStrengths).toMatchInlineSnapshot(`
          Array [
            Object {
              "ONE": 3,
              "TWO": 0,
              "theater": "LAND",
            },
            Object {
              "ONE": 1,
              "TWO": 0,
              "theater": "AIR",
            },
            Object {
              "ONE": 3,
              "TWO": 0,
              "theater": "SEA",
            },
          ]
        `);
      });

      it('does not work when face down', () => {
        roundState.allocateHands([descriptors.SUPPORT]);

        roundState.playCardDescriptor(descriptors.SUPPORT, { faceUp: false });

        expect(roundState.orderedTheaterStrengths).toMatchInlineSnapshot(`
          Array [
            Object {
              "ONE": 2,
              "TWO": 0,
              "theater": "AIR",
            },
            Object {
              "ONE": 0,
              "TWO": 0,
              "theater": "LAND",
            },
            Object {
              "ONE": 0,
              "TWO": 0,
              "theater": "SEA",
            },
          ]
        `);
      });

      it('stops working when flipped over', () => {
        roundState.allocateHands(
          [descriptors.SUPPORT, descriptors.LAND_MANEUVER],
          [descriptors.AMBUSH]
        );

        roundState.playCardDescriptor(descriptors.SUPPORT);
        roundState.playCardDescriptor(descriptors.AMBUSH);

        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.AIR,
        });

        expect(roundState.orderedTheaterStrengths).toMatchInlineSnapshot(`
          Array [
            Object {
              "ONE": 2,
              "TWO": 0,
              "theater": "AIR",
            },
            Object {
              "ONE": 0,
              "TWO": 2,
              "theater": "LAND",
            },
            Object {
              "ONE": 0,
              "TWO": 0,
              "theater": "SEA",
            },
          ]
        `);

        roundState.playCardDescriptor(descriptors.LAND_MANEUVER);

        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.AIR,
        });

        expect(roundState.orderedTheaterStrengths).toMatchInlineSnapshot(`
          Array [
            Object {
              "ONE": 1,
              "TWO": 0,
              "theater": "AIR",
            },
            Object {
              "ONE": 6,
              "TWO": 2,
              "theater": "LAND",
            },
            Object {
              "ONE": 0,
              "TWO": 0,
              "theater": "SEA",
            },
          ]
        `);
      });
    });

    describe(CARD_TYPE_KEY.AIR_DROP, () => {
      it('permits playing in to non-matching theaters', () => {
        roundState.allocateHands(
          [
            descriptors.AIR_DROP,
            descriptors.HEAVY_BOMBERS,
            descriptors.SUPER_BATTLESHIP,
          ],
          [descriptors.HEAVY_TANKS]
        );

        roundState.playCardDescriptor(descriptors.AIR_DROP);
        roundState.playCardDescriptor(descriptors.HEAVY_TANKS);

        roundState.playCardDescriptor(
          descriptors.HEAVY_BOMBERS,
          { theater: THEATER.LAND },
          { dryRun: true }
        );

        roundState.playCardDescriptor(
          descriptors.HEAVY_BOMBERS,
          { theater: THEATER.SEA },
          { dryRun: true }
        );

        roundState.playCardDescriptor(
          descriptors.SUPER_BATTLESHIP,
          { theater: THEATER.AIR },
          { dryRun: true }
        );
      });

      // not implemented yet
      it.skip("doesn't override blockade", () => {
        roundState = new RoundState([THEATER.AIR, THEATER.SEA, THEATER.LAND]);

        roundState.allocateHands(
          [
            descriptors.BLOCKADE,
            descriptors.HEAVY_TANKS,
            descriptors.COVER_FIRE,
          ],
          [descriptors.AIR_DROP, descriptors.HEAVY_BOMBERS, descriptors.DISRUPT]
        );

        roundState.playCardDescriptor(descriptors.BLOCKADE);
        roundState.playCardDescriptor(descriptors.DISRUPT, {
          faceUp: false,
          theater: THEATER.LAND,
        });
        roundState.playCardDescriptor(descriptors.HEAVY_TANKS);
        roundState.playCardDescriptor(descriptors.AIR_DROP);
        roundState.playCardDescriptor(descriptors.COVER_FIRE);
        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS, {
          theater: THEATER.LAND,
        });

        expect(roundState.simpleBoardState).toMatchInlineSnapshot(`
          Object {
            "AIR": Object {
              "ONE": Array [],
              "TWO": Array [
                "AIR-Air Drop-2",
              ],
            },
            "LAND": Object {
              "ONE": Array [
                "LAND-Cover Fire-4",
                "LAND-Heavy Tanks-6",
              ],
              "TWO": Array [
                "LAND-Disrupt-5 (flipped)",
              ],
            },
            "SEA": Object {
              "ONE": Array [
                "SEA-Blockade-5",
              ],
              "TWO": Array [],
            },
          }
        `);
      });

      it('can be cancelled by flipping', () => {
        roundState.allocateHands(
          [
            descriptors.AIR_DROP,
            descriptors.HEAVY_BOMBERS,
            descriptors.HEAVY_TANKS,
            descriptors.SUPER_BATTLESHIP,
          ],
          [descriptors.AMBUSH]
        );

        roundState.playCardDescriptor(descriptors.AIR_DROP);

        roundState.playCardDescriptor(descriptors.AMBUSH);
        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.AIR,
        });

        expect(() => {
          roundState.playCardDescriptor(
            descriptors.HEAVY_BOMBERS,
            { theater: THEATER.SEA },
            { dryRun: true }
          );
        }).toThrowErrorMatchingInlineSnapshot(
          `"Played card doesn't match the theater it was played in"`
        );

        expect(() => {
          roundState.playCardDescriptor(
            descriptors.HEAVY_TANKS,
            { theater: THEATER.AIR },
            { dryRun: true }
          );
        }).toThrowErrorMatchingInlineSnapshot(
          `"Played card doesn't match the theater it was played in"`
        );

        expect(() => {
          roundState.playCardDescriptor(
            descriptors.SUPER_BATTLESHIP,
            { theater: THEATER.LAND },
            { dryRun: true }
          );
        }).toThrowErrorMatchingInlineSnapshot(
          `"Played card doesn't match the theater it was played in"`
        );
      });

      it("doesn't prevent playing in matching theaters", () => {
        roundState.allocateHands(
          [
            descriptors.AIR_DROP,
            descriptors.HEAVY_BOMBERS,
            descriptors.HEAVY_TANKS,
            descriptors.SUPER_BATTLESHIP,
          ],
          [descriptors.COVER_FIRE]
        );

        roundState.playCardDescriptor(descriptors.AIR_DROP);
        roundState.playCardDescriptor(descriptors.COVER_FIRE);

        roundState.playCardDescriptor(
          descriptors.HEAVY_BOMBERS,
          {},
          { dryRun: true }
        );
        roundState.playCardDescriptor(
          descriptors.HEAVY_TANKS,
          {},
          { dryRun: true }
        );
        roundState.playCardDescriptor(
          descriptors.SUPER_BATTLESHIP,
          {},
          { dryRun: true }
        );
      });
    });

    describe(CARD_TYPE_KEY.MANEUVER, () => {
      it("can't flip over itself", () => {
        roundState.allocateHands([descriptors.AIR_MANEUVER]);
        roundState.playCardDescriptor(descriptors.AIR_MANEUVER);
        expect(roundState.anticipatedDecision).toBe(null);
      });

      it("can't flip over a card in a non-adjacent theater", () => {
        roundState.allocateHands(
          [descriptors.SUPER_BATTLESHIP, descriptors.AIR_MANEUVER],
          [descriptors.HEAVY_BOMBERS]
        );
        roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);
        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);
        roundState.playCardDescriptor(descriptors.AIR_MANEUVER);

        expect(roundState.anticipatedDecision).toBe(null);
      });

      it('can filp over an allied card', () => {
        roundState.allocateHands(
          [descriptors.HEAVY_BOMBERS, descriptors.LAND_MANEUVER],
          [descriptors.SUPER_BATTLESHIP]
        );
        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);
        roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);
        roundState.playCardDescriptor(descriptors.LAND_MANEUVER);
        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.AIR,
        });

        expect(roundState.simpleBoardState).toMatchInlineSnapshot(`
          Object {
            "AIR": Object {
              "ONE": Array [
                "AIR-Heavy Bombers-6 (flipped)",
              ],
              "TWO": Array [],
            },
            "LAND": Object {
              "ONE": Array [
                "LAND-Maneuver-3",
              ],
              "TWO": Array [],
            },
            "SEA": Object {
              "ONE": Array [],
              "TWO": Array [
                "SEA-Super Battleship-6",
              ],
            },
          }
        `);
      });

      it('can filp over an enemy card', () => {
        roundState.allocateHands(
          [descriptors.HEAVY_BOMBERS, descriptors.LAND_MANEUVER],
          [descriptors.SUPER_BATTLESHIP]
        );
        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);
        roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);
        roundState.playCardDescriptor(descriptors.LAND_MANEUVER);

        roundState.playFlipDecision({
          targetedPlayer: PLAYER.TWO,
          theater: THEATER.SEA,
        });

        expect(roundState.simpleBoardState).toMatchInlineSnapshot(`
          Object {
            "AIR": Object {
              "ONE": Array [
                "AIR-Heavy Bombers-6",
              ],
              "TWO": Array [],
            },
            "LAND": Object {
              "ONE": Array [
                "LAND-Maneuver-3",
              ],
              "TWO": Array [],
            },
            "SEA": Object {
              "ONE": Array [],
              "TWO": Array [
                "SEA-Super Battleship-6 (flipped)",
              ],
            },
          }
        `);
      });

      it('can be flipped over by a triggered effect', () => {
        roundState.allocateHands(
          [descriptors.HEAVY_TANKS, descriptors.LAND_MANEUVER],
          [descriptors.AIR_MANEUVER]
        );
        roundState.playCardDescriptor(descriptors.HEAVY_TANKS);
        roundState.playCardDescriptor(descriptors.AIR_MANEUVER, {
          faceUp: false,
        });
        roundState.playCardDescriptor(descriptors.LAND_MANEUVER);

        roundState.playFlipDecision({
          targetedPlayer: PLAYER.TWO,
          theater: THEATER.AIR,
        });

        expect(roundState.anticipatedDecisionsStack.length).toBe(1);

        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.LAND,
        });

        expect(roundState.simpleBoardState).toMatchInlineSnapshot(`
          Object {
            "AIR": Object {
              "ONE": Array [],
              "TWO": Array [
                "AIR-Maneuver-3",
              ],
            },
            "LAND": Object {
              "ONE": Array [
                "LAND-Maneuver-3 (flipped)",
                "LAND-Heavy Tanks-6",
              ],
              "TWO": Array [],
            },
            "SEA": Object {
              "ONE": Array [],
              "TWO": Array [],
            },
          }
        `);
      });

      it('has no effect if there are no targetable cards', () => {
        roundState.allocateHands([descriptors.AIR_MANEUVER]);
        roundState.playCardDescriptor(descriptors.AIR_MANEUVER);

        expect(roundState.anticipatedDecisionsStack.length).toBe(0);
      });

      it('must flip a card if there are targetable cards', () => {
        roundState.allocateHands(
          [descriptors.HEAVY_BOMBERS, descriptors.LAND_MANEUVER],
          [descriptors.SUPER_BATTLESHIP, descriptors.HEAVY_TANKS]
        );

        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);
        roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);
        roundState.playCardDescriptor(descriptors.LAND_MANEUVER);

        expect(() => {
          roundState.playCardDescriptor(
            descriptors.HEAVY_TANKS,
            {},
            { dryRun: true }
          );
        }).toThrowErrorMatchingInlineSnapshot(
          `"Can not play a card when a decision is anticipated"`
        );
      });

      it("doesn't anticipate decisions when played face down", () => {
        roundState.allocateHands([descriptors.AIR_MANEUVER]);
        roundState.playCardDescriptor(descriptors.AIR_MANEUVER, {
          faceUp: false,
        });

        expect(roundState.anticipatedDecisionsStack.length).toBe(0);
      });
    });

    describe(CARD_TYPE_KEY.AERODROME, () => {
      beforeEach(() => {
        roundState = new RoundState([THEATER.AIR, THEATER.LAND, THEATER.SEA], {
          disableHandContainsCheck: true,
        });
      });

      it('permits cards to be played in any theater', () => {
        roundState.playCardDescriptor(descriptors.AERODROME);
        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);

        [1, 2, 3].forEach(rank => {
          enumValues(THEATER).forEach(theater => {
            roundState.playCardDescriptor(
              {
                rank,
                theater,
              },
              { theater: getDifferentTheater(theater) },
              { dryRun: true }
            );
          });
        });
      });

      it("doesn't grant permissions to the opponent", () => {
        roundState.playCardDescriptor(descriptors.AERODROME);

        [1, 2, 3].forEach(rank => {
          enumValues(THEATER).forEach(theater => {
            expect(() => {
              roundState.playCardDescriptor(
                {
                  rank,
                  theater,
                },
                {
                  theater: getDifferentTheater(theater),
                },
                { dryRun: true }
              );
            }).toThrow();
          });
        });
      });

      it("doesn't work on cards of strength four or more", () => {
        roundState.playCardDescriptor(descriptors.AERODROME);
        roundState.playCardDescriptor(descriptors.SUPPORT);

        [4, 5, 6].forEach(rank => {
          enumValues(THEATER).forEach(theater => {
            expect(() => {
              roundState.playCardDescriptor(
                { rank, theater },
                { theater: getDifferentTheater(theater) },
                { dryRun: true }
              );
            }).toThrow();
          });
        });
      });

      it('continues work for multiple turns', () => {
        roundState.playCardDescriptor(descriptors.AERODROME);
        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);
        roundState.playCardDescriptor(descriptors.HEAVY_TANKS);
        roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);

        [1, 2, 3].forEach(rank => {
          enumValues(THEATER).forEach(theater => {
            roundState.playCardDescriptor(
              { rank, theater },
              { theater: getDifferentTheater(theater) },
              { dryRun: true }
            );
          });
        });
      });

      it('stops working when flipped over', () => {
        roundState.playCardDescriptor(descriptors.AERODROME);
        roundState.playCardDescriptor(descriptors.LAND_MANEUVER);
        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.AIR,
        });

        [1, 2, 3].forEach(rank => {
          enumValues(THEATER).forEach(theater => {
            expect(() => {
              roundState.playCardDescriptor(
                { rank, theater },
                { theater: getDifferentTheater(theater) },
                { dryRun: true }
              );
            }).toThrow();
          });
        });
      });

      it('starts working again when flipped back over', () => {
        roundState.playCardDescriptor(descriptors.AERODROME);

        roundState.playCardDescriptor(descriptors.LAND_MANEUVER);
        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.AIR,
        });

        roundState.playCardDescriptor(descriptors.AMBUSH);
        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.AIR,
        });

        roundState.playCardDescriptor(descriptors.HEAVY_TANKS);

        [1, 2, 3].forEach(rank => {
          enumValues(THEATER).forEach(theater => {
            roundState.playCardDescriptor(
              { rank, theater },
              { theater: getDifferentTheater(theater) },
              { dryRun: true }
            );
          });
        });
      });
    });

    describe(CARD_TYPE_KEY.CONTAINMENT, () => {
      it.todo('causes a relevant status effect to be advertised');

      it.todo("doesn't prevent cards from being played face-down");

      it.todo('discards cards that are played face down');

      it.todo('prevents discarded cards from using their effect');

      it.todo(
        'prevents a decision from being anticipated when causing a discard'
      );

      it.todo('can be disabled by being flipped over');

      it.todo("doesn't cause flipped cards to be discarded");

      it.todo('stops working when flipped over');
    });

    describe(CARD_TYPE_KEY.HEAVY, () => {
      it("just adds strength where it's played", () => {
        roundState.allocateHands([descriptors.HEAVY_BOMBERS]);
        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);

        expect(roundState.orderedTheaterStrengths).toMatchInlineSnapshot(`
          Array [
            Object {
              "ONE": 6,
              "TWO": 0,
              "theater": "AIR",
            },
            Object {
              "ONE": 0,
              "TWO": 0,
              "theater": "LAND",
            },
            Object {
              "ONE": 0,
              "TWO": 0,
              "theater": "SEA",
            },
          ]
        `);
      });
    });

    describe(CARD_TYPE_KEY.REINFORCE, () => {
      it('adds a card face down', () => {
        roundState.allocateHands([descriptors.REINFORCE]);
        roundState.playCardDescriptor(descriptors.REINFORCE);

        expect(roundState.cardFaceUp(roundState.startingDeck[0].id)).toBe(
          undefined
        );

        roundState.playReinforceDecision({
          made: {
            theater: THEATER.AIR,
          },
        });

        expect(roundState.cardFaceUp(roundState.startingDeck[0].id)).toBe(
          false
        );
      });

      // not implemented yet
      it.skip('does not override containment', () => {
        roundState.allocateHands(
          [descriptors.CONTAINMENT],
          [descriptors.REINFORCE]
        );

        roundState.playCardDescriptor(descriptors.CONTAINMENT);
        roundState.playCardDescriptor(descriptors.REINFORCE);

        roundState.playReinforceDecision({
          made: {
            theater: THEATER.AIR,
          },
        });

        expect(roundState.simpleBoardState).toMatchInlineSnapshot(`
          Object {
            "AIR": Object {
              "ONE": Array [
                "AIR-Containment-5",
              ],
              "TWO": Array [],
            },
            "LAND": Object {
              "ONE": Array [],
              "TWO": Array [
                "LAND-Reinforce-1",
              ],
            },
            "SEA": Object {
              "ONE": Array [],
              "TWO": Array [],
            },
          }
        `);
      });

      // not implemented yet
      it.skip('does not override blockade', () => {
        roundState = new RoundState([THEATER.LAND, THEATER.AIR, THEATER.SEA]);

        roundState.allocateHands(
          [
            descriptors.AIR_MANEUVER,
            descriptors.BLOCKADE,
            descriptors.REINFORCE,
          ],
          [descriptors.SEA_MANEUVER, descriptors.HEAVY_BOMBERS],
          [descriptors.LAND_MANEUVER]
        );

        roundState.playCardDescriptor(descriptors.BLOCKADE);

        roundState.playCardDescriptor(descriptors.SEA_MANEUVER, {
          faceUp: false,
          theater: THEATER.AIR,
        });

        roundState.playCardDescriptor(descriptors.AIR_MANEUVER, {
          faceUp: false,
          theater: THEATER.AIR,
        });

        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS, {
          theater: THEATER.AIR,
        });

        roundState.playCardDescriptor(descriptors.REINFORCE);
        roundState.playReinforceDecision({
          made: {
            theater: THEATER.AIR,
          },
        });

        expect(roundState.simpleBoardState).toMatchInlineSnapshot(`
          Object {
            "AIR": Object {
              "ONE": Array [
                "AIR-Maneuver-3 (flipped)",
              ],
              "TWO": Array [
                "AIR-Heavy Bombers-6",
                "SEA-Maneuver-3 (flipped)",
              ],
            },
            "LAND": Object {
              "ONE": Array [
                "LAND-Reinforce-1",
              ],
              "TWO": Array [],
            },
            "SEA": Object {
              "ONE": Array [
                "SEA-Blockade-5",
              ],
              "TWO": Array [],
            },
          }
        `);
      });

      it('allows choosing not to reinforce', () => {
        roundState.allocateHands([descriptors.REINFORCE]);
        roundState.playCardDescriptor(descriptors.REINFORCE);

        expect(roundState.cardFaceUp(roundState.startingDeck[0].id)).toBe(
          undefined
        );

        roundState.playReinforceDecision({
          made: null,
        });

        expect(roundState.cardFaceUp(roundState.startingDeck[0].id)).toBe(
          undefined
        );
      });

      it('must add the card in an adjacent theater', () => {
        roundState.allocateHands([descriptors.REINFORCE]);
        roundState.playCardDescriptor(descriptors.REINFORCE);

        expect(roundState.cardFaceUp(roundState.startingDeck[0].id)).toBe(
          undefined
        );

        expect(() => {
          roundState.playReinforceDecision(
            {
              made: {
                theater: THEATER.LAND,
              },
            },
            { dryRun: true }
          );
        }).toThrowErrorMatchingInlineSnapshot(
          `"Reinforcement card must be played to adjacent theater"`
        );
      });

      it('can be triggered multiple times', () => {
        roundState.allocateHands(
          [descriptors.REINFORCE, descriptors.AIR_MANEUVER],
          [descriptors.AMBUSH]
        );

        roundState.playCardDescriptor(descriptors.REINFORCE);
        roundState.playReinforceDecision({
          made: {
            theater: THEATER.AIR,
          },
        });

        roundState.playCardDescriptor(descriptors.AMBUSH);
        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.LAND,
        });

        roundState.playCardDescriptor(descriptors.AIR_MANEUVER);
        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.LAND,
        });

        expect(roundState.cardFaceUp(roundState.startingDeck[1].id)).toBe(
          undefined
        );

        roundState.playReinforceDecision({
          made: {
            theater: THEATER.SEA,
          },
        });

        expect(roundState.cardFaceUp(roundState.startingDeck[1].id)).toBe(
          false
        );
      });

      it("doesn't anticipate a decision when played face down", () => {
        roundState.allocateHands([descriptors.REINFORCE]);
        roundState.playCardDescriptor(descriptors.REINFORCE, { faceUp: false });

        expect(roundState.anticipatedDecision).toBe(null);
      });
    });

    describe(CARD_TYPE_KEY.AMBUSH, () => {
      it('can flip over itself', () => {
        roundState.allocateHands([descriptors.AMBUSH]);
        roundState.playCardDescriptor(descriptors.AMBUSH);
        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.LAND,
        });
        expect(roundState.simpleBoardState).toMatchInlineSnapshot(`
          Object {
            "AIR": Object {
              "ONE": Array [],
              "TWO": Array [],
            },
            "LAND": Object {
              "ONE": Array [
                "LAND-Ambush-2 (flipped)",
              ],
              "TWO": Array [],
            },
            "SEA": Object {
              "ONE": Array [],
              "TWO": Array [],
            },
          }
        `);
      });

      it('can flip over a card in an adjacent theater', () => {
        roundState.allocateHands(
          [descriptors.HEAVY_TANKS, descriptors.AMBUSH],
          [descriptors.HEAVY_BOMBERS]
        );
        roundState.playCardDescriptor(descriptors.HEAVY_TANKS);
        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);
        roundState.playCardDescriptor(descriptors.AMBUSH);
        roundState.playFlipDecision({
          targetedPlayer: PLAYER.TWO,
          theater: THEATER.AIR,
        });

        expect(roundState.simpleBoardState).toMatchInlineSnapshot(`
          Object {
            "AIR": Object {
              "ONE": Array [],
              "TWO": Array [
                "AIR-Heavy Bombers-6 (flipped)",
              ],
            },
            "LAND": Object {
              "ONE": Array [
                "LAND-Ambush-2",
                "LAND-Heavy Tanks-6",
              ],
              "TWO": Array [],
            },
            "SEA": Object {
              "ONE": Array [],
              "TWO": Array [],
            },
          }
        `);
      });

      it('can flip over a card in a non-adjacent theater', () => {
        roundState = new RoundState([THEATER.LAND, THEATER.AIR, THEATER.SEA]);
        roundState.allocateHands(
          [descriptors.SUPER_BATTLESHIP, descriptors.AMBUSH],
          [descriptors.HEAVY_TANKS]
        );
        roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);
        roundState.playCardDescriptor(descriptors.HEAVY_TANKS);
        roundState.playCardDescriptor(descriptors.AMBUSH);
        roundState.playFlipDecision(
          {
            targetedPlayer: PLAYER.ONE,
            theater: THEATER.SEA,
          },
          { dryRun: true }
        );
        roundState.playFlipDecision(
          {
            targetedPlayer: PLAYER.TWO,
            theater: THEATER.LAND,
          },
          { dryRun: true }
        );
      });

      it('can be flipped over by a triggered effect', () => {
        roundState.allocateHands(
          [descriptors.SUPER_BATTLESHIP, descriptors.AMBUSH],
          [descriptors.SEA_MANEUVER]
        );
        roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);
        roundState.playCardDescriptor(descriptors.SEA_MANEUVER, {
          faceUp: false,
        });
        roundState.playCardDescriptor(descriptors.AMBUSH);
        roundState.playFlipDecision({
          targetedPlayer: PLAYER.TWO,
          theater: THEATER.SEA,
        });
        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.LAND,
        });

        expect(roundState.simpleBoardState).toMatchInlineSnapshot(`
          Object {
            "AIR": Object {
              "ONE": Array [],
              "TWO": Array [],
            },
            "LAND": Object {
              "ONE": Array [
                "LAND-Ambush-2 (flipped)",
              ],
              "TWO": Array [],
            },
            "SEA": Object {
              "ONE": Array [
                "SEA-Super Battleship-6",
              ],
              "TWO": Array [
                "SEA-Maneuver-3",
              ],
            },
          }
        `);
      });

      it("doesn't anticipate a decision when played face down", () => {
        roundState.allocateHands([descriptors.AMBUSH]);
        roundState.playCardDescriptor(descriptors.AMBUSH, { faceUp: false });

        expect(roundState.anticipatedDecision).toBe(null);
      });
    });

    describe(CARD_TYPE_KEY.COVER_FIRE, () => {
      it('strengthens weak cards beneath it', () => {
        roundState.allocateHands(
          [descriptors.REINFORCE, descriptors.COVER_FIRE],
          [descriptors.HEAVY_BOMBERS]
        );

        roundState.playCardDescriptor(descriptors.REINFORCE);
        roundState.playReinforceDecision({ made: null });

        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);

        roundState.playCardDescriptor(descriptors.COVER_FIRE);

        expect(roundState.orderedTheaterStrengths).toMatchInlineSnapshot(`
          Array [
            Object {
              "ONE": 0,
              "TWO": 6,
              "theater": "AIR",
            },
            Object {
              "ONE": 8,
              "TWO": 0,
              "theater": "LAND",
            },
            Object {
              "ONE": 0,
              "TWO": 0,
              "theater": "SEA",
            },
          ]
        `);
      });

      it('strengthens flipped cards beneath it', () => {
        roundState.allocateHands(
          [descriptors.AIR_MANEUVER, descriptors.COVER_FIRE],
          [descriptors.HEAVY_BOMBERS]
        );

        roundState.playCardDescriptor(descriptors.AIR_MANEUVER, {
          faceUp: false,
          theater: THEATER.LAND,
        });

        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);

        roundState.playCardDescriptor(descriptors.COVER_FIRE);

        expect(roundState.orderedTheaterStrengths).toMatchInlineSnapshot(`
          Array [
            Object {
              "ONE": 0,
              "TWO": 6,
              "theater": "AIR",
            },
            Object {
              "ONE": 8,
              "TWO": 0,
              "theater": "LAND",
            },
            Object {
              "ONE": 0,
              "TWO": 0,
              "theater": "SEA",
            },
          ]
        `);
      });

      it('weakens strong cards beneath it', () => {
        roundState.allocateHands(
          [descriptors.HEAVY_TANKS, descriptors.COVER_FIRE],
          [descriptors.HEAVY_BOMBERS]
        );

        roundState.playCardDescriptor(descriptors.HEAVY_TANKS);

        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);

        roundState.playCardDescriptor(descriptors.COVER_FIRE);

        expect(roundState.orderedTheaterStrengths).toMatchInlineSnapshot(`
          Array [
            Object {
              "ONE": 0,
              "TWO": 6,
              "theater": "AIR",
            },
            Object {
              "ONE": 8,
              "TWO": 0,
              "theater": "LAND",
            },
            Object {
              "ONE": 0,
              "TWO": 0,
              "theater": "SEA",
            },
          ]
        `);
      });

      it('stops working when flipped over', () => {
        roundState.allocateHands(
          [descriptors.REINFORCE, descriptors.COVER_FIRE],
          [descriptors.HEAVY_BOMBERS, descriptors.AIR_MANEUVER]
        );

        roundState.playCardDescriptor(descriptors.REINFORCE);
        roundState.playReinforceDecision({ made: null });
        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);
        roundState.playCardDescriptor(descriptors.COVER_FIRE);
        roundState.playCardDescriptor(descriptors.AIR_MANEUVER);
        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.LAND,
        });

        expect(roundState.orderedTheaterStrengths).toMatchInlineSnapshot(`
          Array [
            Object {
              "ONE": 0,
              "TWO": 9,
              "theater": "AIR",
            },
            Object {
              "ONE": 3,
              "TWO": 0,
              "theater": "LAND",
            },
            Object {
              "ONE": 0,
              "TWO": 0,
              "theater": "SEA",
            },
          ]
        `);
      });

      it('works as expected when moved to a new theater', () => {
        roundState.allocateHands(
          [
            descriptors.REINFORCE,
            descriptors.COVER_FIRE,
            descriptors.TRANSPORT,
          ],
          [descriptors.SUPPORT, descriptors.SUPER_BATTLESHIP]
        );

        roundState.playCardDescriptor(descriptors.REINFORCE);
        roundState.playReinforceDecision({ made: null });
        roundState.playCardDescriptor(descriptors.SUPPORT);
        roundState.playCardDescriptor(descriptors.COVER_FIRE);
        roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);
        roundState.playCardDescriptor(descriptors.TRANSPORT);
        roundState.playTransportDecision({
          made: {
            originTheater: THEATER.LAND,
            originIndexFromTop: 0,
            destinationTheater: THEATER.SEA,
          },
        });

        expect(roundState.simpleBoardState).toMatchInlineSnapshot(`
          Object {
            "AIR": Object {
              "ONE": Array [],
              "TWO": Array [
                "AIR-Support-1",
              ],
            },
            "LAND": Object {
              "ONE": Array [
                "LAND-Reinforce-1",
              ],
              "TWO": Array [],
            },
            "SEA": Object {
              "ONE": Array [
                "LAND-Cover Fire-4",
                "SEA-Transport-1",
              ],
              "TWO": Array [
                "SEA-Super Battleship-6",
              ],
            },
          }
        `);
        expect(roundState.orderedTheaterStrengths).toMatchInlineSnapshot(`
          Array [
            Object {
              "ONE": 0,
              "TWO": 1,
              "theater": "AIR",
            },
            Object {
              "ONE": 1,
              "TWO": 3,
              "theater": "LAND",
            },
            Object {
              "ONE": 8,
              "TWO": 6,
              "theater": "SEA",
            },
          ]
        `);
      });

      it("doesn't strengthen cards above it", () => {
        roundState.allocateHands(
          [descriptors.COVER_FIRE, descriptors.REINFORCE],
          [descriptors.HEAVY_BOMBERS]
        );

        roundState.playCardDescriptor(descriptors.COVER_FIRE);

        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);

        roundState.playCardDescriptor(descriptors.REINFORCE);
        roundState.playReinforceDecision({ made: null });

        expect(roundState.orderedTheaterStrengths).toMatchInlineSnapshot(`
          Array [
            Object {
              "ONE": 0,
              "TWO": 6,
              "theater": "AIR",
            },
            Object {
              "ONE": 5,
              "TWO": 0,
              "theater": "LAND",
            },
            Object {
              "ONE": 0,
              "TWO": 0,
              "theater": "SEA",
            },
          ]
        `);
      });
    });

    describe(CARD_TYPE_KEY.DISRUPT, () => {
      it('causes two decisions to be enqueued', () => {
        roundState.allocateHands(
          [descriptors.HEAVY_TANKS, descriptors.DISRUPT],
          [descriptors.SUPER_BATTLESHIP]
        );

        roundState.playCardDescriptor(descriptors.HEAVY_TANKS);
        roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);
        roundState.playCardDescriptor(descriptors.DISRUPT);

        expect(roundState.anticipatedDecisionsStack).toHaveLength(2);
      });

      // broken. `getAnticipatedDecisions` doesn't consider board state
      it.skip("doesn't anticipate a decision from the opponent if they haven't played any cards", () => {
        roundState.allocateHands([descriptors.DISRUPT]);

        roundState.playCardDescriptor(descriptors.DISRUPT);

        expect(roundState.anticipatedDecisionsStack).toHaveLength(1);
      });

      it('anticipates a decision from the opponent first', () => {
        roundState.allocateHands(
          [descriptors.HEAVY_TANKS, descriptors.DISRUPT],
          [descriptors.SUPER_BATTLESHIP]
        );

        roundState.playCardDescriptor(descriptors.HEAVY_TANKS);
        roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);
        roundState.playCardDescriptor(descriptors.DISRUPT);

        expect(roundState.anticipatedDecision?.player).toBe(PLAYER.TWO);
      });

      it('anticipates a decision from your self second', () => {
        roundState.allocateHands(
          [descriptors.SUPER_BATTLESHIP, descriptors.DISRUPT],
          [descriptors.HEAVY_TANKS]
        );

        roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);
        roundState.playCardDescriptor(descriptors.HEAVY_TANKS);
        roundState.playCardDescriptor(descriptors.DISRUPT);

        roundState.playFlipDecision({
          targetedPlayer: PLAYER.TWO,
          theater: THEATER.SEA,
        });

        expect(roundState.anticipatedDecision?.player).toBe(PLAYER.ONE);
      });

      it('allows the opponent to flip a card in any theater', () => {
        roundState.allocateHands(
          [
            descriptors.SUPPORT,
            descriptors.COVER_FIRE,
            descriptors.SEA_MANEUVER,
            descriptors.DISRUPT,
          ],
          [
            descriptors.HEAVY_BOMBERS,
            descriptors.HEAVY_TANKS,
            descriptors.SUPER_BATTLESHIP,
          ]
        );

        roundState.playCardDescriptor(descriptors.SUPPORT);
        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);
        roundState.playCardDescriptor(descriptors.COVER_FIRE);
        roundState.playCardDescriptor(descriptors.HEAVY_TANKS);
        roundState.playCardDescriptor(descriptors.SEA_MANEUVER, {
          faceUp: false,
        });
        roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);
        roundState.playCardDescriptor(descriptors.DISRUPT);

        enumValues(THEATER).forEach(theater => {
          expect(() => {
            roundState.playFlipDecision(
              {
                targetedPlayer: PLAYER.TWO,
                theater,
              },
              { dryRun: true }
            );
          }).not.toThrow();
        });
      });

      it('resovles the effects of the opponents flip before proceeding to your flip', () => {
        roundState.allocateHands(
          [descriptors.HEAVY_BOMBERS, descriptors.DISRUPT],
          [descriptors.LAND_MANEUVER]
        );

        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);
        roundState.playCardDescriptor(descriptors.LAND_MANEUVER, {
          faceUp: false,
        });
        roundState.playCardDescriptor(descriptors.DISRUPT);

        roundState.playFlipDecision({
          targetedPlayer: PLAYER.TWO,
          theater: THEATER.LAND,
        });

        expect(roundState.anticipatedDecisionsStack).toMatchInlineSnapshot(`
          Array [
            Object {
              "player": "TWO",
              "promptingMoveIndex": 3,
              "type": "FLIP_DECISION",
            },
            Object {
              "player": "ONE",
              "promptingMoveIndex": 2,
              "type": "FLIP_DECISION",
            },
          ]
        `);

        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.AIR,
        });

        expect(roundState.simpleBoardState).toMatchInlineSnapshot(`
          Object {
            "AIR": Object {
              "ONE": Array [
                "AIR-Heavy Bombers-6 (flipped)",
              ],
              "TWO": Array [],
            },
            "LAND": Object {
              "ONE": Array [
                "LAND-Disrupt-5",
              ],
              "TWO": Array [
                "LAND-Maneuver-3",
              ],
            },
            "SEA": Object {
              "ONE": Array [],
              "TWO": Array [],
            },
          }
        `);

        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: descriptors.HEAVY_BOMBERS.theater,
        });

        expect(roundState.simpleBoardState).toMatchInlineSnapshot(`
          Object {
            "AIR": Object {
              "ONE": Array [
                "AIR-Heavy Bombers-6",
              ],
              "TWO": Array [],
            },
            "LAND": Object {
              "ONE": Array [
                "LAND-Disrupt-5",
              ],
              "TWO": Array [
                "LAND-Maneuver-3",
              ],
            },
            "SEA": Object {
              "ONE": Array [],
              "TWO": Array [],
            },
          }
        `);
      });

      it('it allows you to flip a card in any theater', () => {
        roundState.allocateHands(
          [
            descriptors.HEAVY_BOMBERS,
            descriptors.HEAVY_TANKS,
            descriptors.SUPER_BATTLESHIP,
            descriptors.DISRUPT,
          ],
          [
            descriptors.SUPPORT,
            descriptors.COVER_FIRE,
            descriptors.SEA_MANEUVER,
          ]
        );

        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);
        roundState.playCardDescriptor(descriptors.SUPPORT);
        roundState.playCardDescriptor(descriptors.HEAVY_TANKS);
        roundState.playCardDescriptor(descriptors.COVER_FIRE);
        roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);
        roundState.playCardDescriptor(descriptors.SEA_MANEUVER, {
          faceUp: false,
        });
        roundState.playCardDescriptor(descriptors.DISRUPT);

        roundState.playFlipDecision({
          targetedPlayer: PLAYER.TWO,
          theater: THEATER.AIR,
        });

        enumValues(THEATER).forEach(theater => {
          expect(() => {
            roundState.playFlipDecision(
              {
                targetedPlayer: PLAYER.ONE,
                theater,
              },
              { dryRun: true }
            );
          }).not.toThrow();
        });
      });

      // broken. might be tough to fix
      it.skip('can be cancelled by being flipped over mid-effect', () => {
        roundState.allocateHands(
          [descriptors.HEAVY_BOMBERS, descriptors.DISRUPT],
          [descriptors.AIR_MANEUVER]
        );

        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);
        roundState.playCardDescriptor(descriptors.AIR_MANEUVER, {
          faceUp: false,
        });
        roundState.playCardDescriptor(descriptors.DISRUPT);

        roundState.playFlipDecision({
          targetedPlayer: PLAYER.TWO,
          theater: THEATER.AIR,
        });

        expect(roundState.anticipatedDecisionsStack).toMatchInlineSnapshot(`
          Array [
            Object {
              "player": "TWO",
              "promptingMoveIndex": 3,
              "type": "FLIP_DECISION",
            },
            Object {
              "player": "ONE",
              "promptingMoveIndex": 2,
              "type": "FLIP_DECISION",
            },
          ]
        `);

        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.LAND,
        });

        expect(roundState.anticipatedDecision).toBe(null);
      });

      it("doesn't anticipate a decision when played face down", () => {
        roundState.allocateHands(
          [descriptors.HEAVY_BOMBERS, descriptors.DISRUPT],
          [descriptors.HEAVY_TANKS]
        );

        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);
        roundState.playCardDescriptor(descriptors.HEAVY_TANKS);
        roundState.playCardDescriptor(descriptors.DISRUPT, { faceUp: false });

        expect(roundState.anticipatedDecision).toBe(null);
      });
    });

    describe(CARD_TYPE_KEY.TRANSPORT, () => {
      it.todo('moves a card');

      it.todo('can move face down cards');

      it.todo('can move covered cards');

      it.todo('does not trigger containment or blockade');

      it.todo('permits choosing not to transport');

      it.todo('can transport itself');

      it.todo('can be triggered multiple times');

      it.todo("doesn't anticipate a decision when played face down");
    });

    describe(CARD_TYPE_KEY.ESCALATION, () => {
      it.todo('strengthens your flipped down cards');

      it.todo("doesn't strengthen the opponents flipped down cards");

      it.todo("doesn't strengthen face-up cards");

      it.todo('stops working when flipped over');

      it.todo('works as expected when moved to a new theater');
    });

    describe(CARD_TYPE_KEY.REDEPLOY, () => {
      it.todo('returns a card to your hand');

      it.todo("can't return a face-up card to your hand");

      it.todo('must return a card if possible');

      it.todo('does not grant a bonus turn if a card is not returned');

      it.todo('grants an immediate bonus turn when played');

      it.todo('grants an immedaite bonus turn when flipped by its owner');

      it.todo('grants a delayed bonus turn when flipped by its opponent');

      it.todo('can be activated more than once');

      it.todo('handles a truly degenerate case');

      it.todo("doesn't anticipate a decision when played face down");

      it.todo(
        "doesn't anticipate a decision when player has no face down cards"
      );
    });

    describe(CARD_TYPE_KEY.BLOCKADE, () => {
      it.todo('causes a relevant status effect to be advertised');

      it.todo("doesn't prevent cards from being played in affected theaters");

      it.todo('discards cards that are played in affected theaters');

      it.todo('prevents discarded cards from using their effect');

      it.todo(
        'prevents a decision from being anticipated when causing a discard'
      );

      it.todo('can be disabled by being flipped over');

      it.todo('affects both players');

      it.todo('stops working when flipped over');

      it.todo('works as expected when moved to a new theater');
    });
  });

  describe('Move Validation', () => {
    it.todo("prevents playing cards that are not in the player's hand");

    it.todo('prevents playing cards face up to non-matching theaters');

    it.todo("doesn't prevent playing cards that would be discarded");

    it.todo('prevents playing cards when a decision is anticipated');

    it.todo('prevents surrendering when a decision is anticipated');

    it.todo('prevents make a decision when none is anticipated');

    it.todo('prevents making a decision of the incorrect type');

    it.todo('prevents playing cards once a player has surrendered');
  });

  describe('Discarding', () => {
    it.todo('moves the discarded card to a visible pile');
  });

  describe('Face-down Cards', () => {
    it.todo('can be played in any theater');

    it.todo('has strength of two');

    it.todo("doesn't trigger instant effects");

    it.todo('allows instant effects to be triggered when flipped up');
  });

  describe('Hand', () => {
    it.todo('loses a card when it is played');
  });

  describe('Deck', () => {
    it.todo("knows which cards haven't been seen by either player");

    it.todo('start with six cards in it');

    it.todo('loses a card each time a reinforce decision is made');
  });

  describe('Testing Features', () => {
    describe('playMove:dryRun', () => {});

    describe('opts.disableHandContainsCheck', () => {});
  });

  describe('Status Effects', () => {
    describe('Global Status Effects', () => {
      it('has a status effect when Containment is played', () => {
        roundState.allocateHands(
          [descriptors.CONTAINMENT],
          [descriptors.AMBUSH]
        );

        expect(roundState.globalEffects.length).toBe(0);

        roundState.playCardDescriptor(descriptors.CONTAINMENT);

        expect(roundState.globalEffects).toEqual([CARD_TYPE_KEY.CONTAINMENT]);

        roundState.playCardDescriptor(descriptors.AMBUSH);
        roundState.playFlipDecision({
          targetedPlayer: PLAYER.ONE,
          theater: THEATER.AIR,
        });

        expect(roundState.globalEffects.length).toBe(0);
      });
    });

    describe('Player Status Effects', () => {
      it.todo('has a status effect when Air Drop is played');

      it.todo(
        "doesn't have an Air Drop status effect two turns after it's played"
      );

      it.todo('has a status effect when Escalation is played');

      it.todo('has a status effect when Aerodrome is played');
    });

    describe('Theater Status Effects', () => {
      it('has a status effect when Blockade is played and three or more cards are present', () => {
        roundState = new RoundState([THEATER.AIR, THEATER.SEA, THEATER.LAND]);
        roundState.allocateHands(
          [
            descriptors.BLOCKADE,
            descriptors.COVER_FIRE,
            descriptors.SUPER_BATTLESHIP,
            descriptors.AIR_DROP,
            descriptors.TRANSPORT,
          ],
          [
            descriptors.HEAVY_TANKS,
            descriptors.AMBUSH,
            descriptors.HEAVY_BOMBERS,
            descriptors.AIR_MANEUVER,
          ]
        );

        roundState.playCardDescriptor(descriptors.BLOCKADE);

        expect(roundState.theaterEffectsMap).toMatchInlineSnapshot(`
          Object {
            "AIR": Array [],
            "LAND": Array [],
            "SEA": Array [],
          }
        `);

        roundState.playCardDescriptor(descriptors.HEAVY_TANKS);
        roundState.playCardDescriptor(descriptors.COVER_FIRE);

        expect(roundState.theaterEffectsMap).toMatchInlineSnapshot(`
          Object {
            "AIR": Array [],
            "LAND": Array [],
            "SEA": Array [],
          }
        `);

        roundState.playCardDescriptor(descriptors.AMBUSH, { faceUp: false });

        expect(roundState.theaterEffectsMap).toMatchInlineSnapshot(`
          Object {
            "AIR": Array [],
            "LAND": Array [
              "BLOCKADE",
            ],
            "SEA": Array [],
          }
        `);

        roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);

        roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);
        roundState.playCardDescriptor(descriptors.AIR_DROP);

        expect(roundState.theaterEffectsMap).toMatchInlineSnapshot(`
          Object {
            "AIR": Array [],
            "LAND": Array [
              "BLOCKADE",
            ],
            "SEA": Array [],
          }
        `);

        roundState.playCardDescriptor(descriptors.AIR_MANEUVER, {
          faceUp: false,
        });

        expect(roundState.theaterEffectsMap).toMatchInlineSnapshot(`
          Object {
            "AIR": Array [
              "BLOCKADE",
            ],
            "LAND": Array [
              "BLOCKADE",
            ],
            "SEA": Array [],
          }
        `);

        // using air drop effect here tsk tsk
        roundState.playCardDescriptor(descriptors.TRANSPORT, {
          theater: THEATER.SEA,
        });
        roundState.playTransportDecision({
          made: {
            originTheater: THEATER.AIR,
            originIndexFromTop: 0,
            destinationTheater: THEATER.LAND,
          },
        });

        expect(roundState.theaterEffectsMap).toMatchInlineSnapshot(`
          Object {
            "AIR": Array [],
            "LAND": Array [
              "BLOCKADE",
            ],
            "SEA": Array [],
          }
        `);
        expect(roundState.simpleBoardState).toMatchInlineSnapshot(`
          Object {
            "AIR": Object {
              "ONE": Array [],
              "TWO": Array [
                "AIR-Maneuver-3 (flipped)",
                "AIR-Heavy Bombers-6",
              ],
            },
            "LAND": Object {
              "ONE": Array [
                "AIR-Air Drop-2",
                "LAND-Cover Fire-4",
              ],
              "TWO": Array [
                "LAND-Ambush-2 (flipped)",
                "LAND-Heavy Tanks-6",
              ],
            },
            "SEA": Object {
              "ONE": Array [
                "SEA-Transport-1",
                "SEA-Super Battleship-6",
                "SEA-Blockade-5",
              ],
              "TWO": Array [],
            },
          }
        `);
      });
    });

    describe('Player Theater Status Effects', () => {
      it.todo('has a status effect when Support is played');
    });
  });

  describe('Time travel', () => {
    // try playing out a full game, and changing one of the first moves in a way
    // that doesn't retro-actively break the future moves, and then see if the
    // state can be correctly recomputed.
    it.todo('can replay history on top of a modified past move');

    it.todo('can undo moves');

    it.todo('can redo moves');

    it.todo('can process new moves after undoing');
  });

  describe('Full Game Examples', () => {});

  describe('Import/Export', () => {
    it('Exports a complete history of the round to JSON', () => {
      roundState = new RoundState([THEATER.AIR, THEATER.SEA, THEATER.LAND]);
      roundState.allocateHands(
        [
          descriptors.BLOCKADE,
          descriptors.COVER_FIRE,
          descriptors.SUPER_BATTLESHIP,
          descriptors.AIR_DROP,
          descriptors.TRANSPORT,
          descriptors.AERODROME,
        ],
        [
          descriptors.HEAVY_TANKS,
          descriptors.AMBUSH,
          descriptors.HEAVY_BOMBERS,
          descriptors.AIR_MANEUVER,
          descriptors.LAND_MANEUVER,
          descriptors.CONTAINMENT,
        ],
        [
          descriptors.SEA_MANEUVER,
          descriptors.ESCALATION,
          descriptors.DISRUPT,
          descriptors.REDEPLOY,
          descriptors.SUPPORT,
          descriptors.REINFORCE,
        ]
      );

      roundState.playCardDescriptor(descriptors.BLOCKADE);
      roundState.playCardDescriptor(descriptors.HEAVY_TANKS);
      roundState.playCardDescriptor(descriptors.COVER_FIRE);
      roundState.playCardDescriptor(descriptors.AMBUSH, { faceUp: false });
      roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);
      roundState.playCardDescriptor(descriptors.HEAVY_BOMBERS);
      roundState.playCardDescriptor(descriptors.AIR_DROP);
      roundState.playCardDescriptor(descriptors.AIR_MANEUVER, {
        faceUp: false,
      });
      roundState.playCardDescriptor(descriptors.TRANSPORT, {
        theater: THEATER.SEA,
      });
      roundState.playTransportDecision({
        made: {
          originTheater: THEATER.AIR,
          originIndexFromTop: 0,
          destinationTheater: THEATER.LAND,
        },
      });

      expect(roundState.toJSON()).toMatchSnapshot();
    });
  });

  // Concerning the feature which tracks whether a given card has been observed
  // by a given player at any point in the round.
  //
  // See RoundState.prototype.momentarySeenCardsForPlayer;
  describe('Seen Cards', () => {
    it("marks each player's stating hand as seen", () => {
      roundState.allocateHands(
        [
          descriptors.BLOCKADE,
          descriptors.COVER_FIRE,
          descriptors.SUPER_BATTLESHIP,
          descriptors.AIR_DROP,
          descriptors.TRANSPORT,
          descriptors.AERODROME,
        ],
        [
          descriptors.HEAVY_TANKS,
          descriptors.AMBUSH,
          descriptors.HEAVY_BOMBERS,
          descriptors.AIR_MANEUVER,
          descriptors.LAND_MANEUVER,
          descriptors.CONTAINMENT,
        ]
      );

      expect(roundState.currentUnseenCardsP1.map(card => card.toString()))
        .toMatchInlineSnapshot(`
        Array [
          "AIR-Support-1",
          "AIR-Maneuver-3",
          "AIR-Containment-5",
          "AIR-Heavy Bombers-6",
          "LAND-Reinforce-1",
          "LAND-Ambush-2",
          "LAND-Maneuver-3",
          "LAND-Disrupt-5",
          "LAND-Heavy Tanks-6",
          "SEA-Escalation-2",
          "SEA-Maneuver-3",
          "SEA-Redeploy-4",
        ]
      `);

      expect(roundState.currentUnseenCardsP2.map(card => card.toString()))
        .toMatchInlineSnapshot(`
        Array [
          "AIR-Support-1",
          "AIR-Air Drop-2",
          "AIR-Aerodrome-4",
          "LAND-Reinforce-1",
          "LAND-Cover Fire-4",
          "LAND-Disrupt-5",
          "SEA-Transport-1",
          "SEA-Escalation-2",
          "SEA-Maneuver-3",
          "SEA-Redeploy-4",
          "SEA-Blockade-5",
          "SEA-Super Battleship-6",
        ]
      `);
    });

    it('marks played cards as seen', () => {
      roundState.allocateHands([descriptors.SUPER_BATTLESHIP]);

      expect(
        roundState.currentUnseenCardsP2.includes(
          roundState.deck.find(descriptors.SUPER_BATTLESHIP)
        )
      ).toBe(true);

      roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP);

      expect(
        roundState.currentUnseenCardsP2.includes(
          roundState.deck.find(descriptors.SUPER_BATTLESHIP)
        )
      ).toBe(false);
    });

    it('does not mark cards played face down as seen', () => {
      roundState.allocateHands([descriptors.SUPER_BATTLESHIP]);

      expect(
        roundState.currentUnseenCardsP2.includes(
          roundState.deck.find(descriptors.SUPER_BATTLESHIP)
        )
      ).toBe(true);

      roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP, {
        faceUp: false,
      });

      expect(
        roundState.currentUnseenCardsP2.includes(
          roundState.deck.find(descriptors.SUPER_BATTLESHIP)
        )
      ).toBe(true);
    });

    it('marks cards flipped face up as seen', () => {
      roundState.allocateHands(
        [descriptors.SUPER_BATTLESHIP],
        [descriptors.LAND_MANEUVER]
      );

      roundState.playCardDescriptor(descriptors.SUPER_BATTLESHIP, {
        faceUp: false,
      });
      roundState.playCardDescriptor(descriptors.LAND_MANEUVER);

      expect(
        roundState.currentUnseenCardsP2.includes(
          roundState.deck.find(descriptors.SUPER_BATTLESHIP)
        )
      ).toBe(true);

      roundState.playFlipDecision({
        targetedPlayer: PLAYER.ONE,
        theater: THEATER.SEA,
      });

      expect(
        roundState.currentUnseenCardsP2.includes(
          roundState.deck.find(descriptors.SUPER_BATTLESHIP)
        )
      ).toBe(false);
    });

    it('marks cards observed with reinforce as seen', () => {
      roundState.allocateHands(
        [descriptors.REINFORCE],
        [],
        [descriptors.SUPPORT]
      );

      expect(
        roundState.currentUnseenCardsP1.includes(
          roundState.deck.find(descriptors.SUPPORT)
        )
      ).toBe(true);

      roundState.playCardDescriptor(descriptors.REINFORCE);

      expect(
        roundState.currentUnseenCardsP1.includes(
          roundState.deck.find(descriptors.SUPPORT)
        )
      ).toBe(false);
    });
  });
});
