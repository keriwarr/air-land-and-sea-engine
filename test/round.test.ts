import { RoundState } from '../src/round';
import { PLAYER } from '../src/player';
import { DECISION_TYPE } from '../src/decision';
import { THEATER } from '../src/theater';
import { CARD_TYPE_KEY } from '../src/cardType';
import { autorun } from 'mobx';

describe('RoundState', () => {
  describe('End Conditions', () => {
    let roundState: RoundState;

    beforeEach(() => {
      roundState = new RoundState([THEATER.AIR, THEATER.LAND, THEATER.SEA]);
    });

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
      autorun(reaction => {
        roundState.playCard(roundState.currentHandP1[0].getMove());

        reaction.dispose();
      });
      roundState.surrender();
      expect(roundState.victor).toBe(PLAYER.ONE);
      expect(roundState.complete).toBe(true);
    });

    it('does not permit surrendering twice', () => {
      roundState.surrender();
      expect(() => {
        roundState.surrender();
      }).toThrow();
    });
  });

  describe('Cards Types', () => {
    let roundState: RoundState;

    beforeEach(() => {
      roundState = new RoundState([THEATER.AIR, THEATER.LAND, THEATER.SEA], {
        disableHandContainsCheck: true,
      });
    });

    describe(CARD_TYPE_KEY.SUPPORT, () => {
      it('adds strength to the center theater', () => {
        roundState.playCard(
          roundState.deck
            .find({ type: CARD_TYPE_KEY.SUPPORT })
            .getMove({ theater: THEATER.AIR })
        );

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
        roundState = new RoundState([THEATER.LAND, THEATER.AIR, THEATER.SEA], {
          disableHandContainsCheck: true,
        });
        roundState.playCard(
          roundState.deck
            .find({ type: CARD_TYPE_KEY.SUPPORT })
            .getMove({ theater: THEATER.AIR })
        );

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
        roundState.playCard(
          roundState.deck
            .find({ type: CARD_TYPE_KEY.SUPPORT })
            .getMove({ theater: THEATER.AIR, faceUp: false })
        );

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
        roundState.playCard(
          roundState.deck
            .find({ type: CARD_TYPE_KEY.SUPPORT })
            .getMove({ theater: THEATER.AIR })
        );
        roundState.playCard(
          roundState.deck.find({ type: CARD_TYPE_KEY.AMBUSH }).getMove()
        );
        roundState.playDecision({
          decision: {
            type: DECISION_TYPE.FLIP_DECISION,
            targetedPlayer: PLAYER.ONE,
            theater: THEATER.AIR,
          },
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

        roundState.playCard(
          roundState.deck
            .find({
              type: CARD_TYPE_KEY.MANEUVER,
              theater: THEATER.LAND,
            })
            .getMove()
        );
        roundState.playDecision({
          decision: {
            type: DECISION_TYPE.FLIP_DECISION,
            targetedPlayer: PLAYER.ONE,
            theater: THEATER.AIR,
          },
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
        roundState.playCard(
          roundState.deck.find({ type: CARD_TYPE_KEY.AIR_DROP }).getMove()
        );

        roundState.playCard(
          roundState.deck
            .find({ type: CARD_TYPE_KEY.HEAVY, theater: THEATER.LAND })
            .getMove()
        );

        expect(() => {
          roundState.playCard(
            roundState.deck
              .find({ type: CARD_TYPE_KEY.HEAVY, theater: THEATER.AIR })
              .getMove({ theater: THEATER.LAND }),
            { dryRun: true }
          );
        }).not.toThrow();

        expect(() => {
          roundState.playCard(
            roundState.deck
              .find({ type: CARD_TYPE_KEY.HEAVY, theater: THEATER.AIR })
              .getMove({ theater: THEATER.SEA }),
            { dryRun: true }
          );
        }).not.toThrow();

        expect(() => {
          roundState.playCard(
            roundState.deck
              .find({ type: CARD_TYPE_KEY.HEAVY, theater: THEATER.SEA })
              .getMove({ theater: THEATER.AIR }),
            { dryRun: true }
          );
        }).not.toThrow();
      });

      it.todo("doesn't override blockade");

      it.todo("doesn't override containment");

      it('can be cancelled by flipping', () => {
        roundState.playCard(
          roundState.deck
            .find({ type: CARD_TYPE_KEY.AIR_DROP })
            .getMove({ theater: THEATER.AIR })
        );

        roundState.playCard(
          roundState.deck
            .find({ type: CARD_TYPE_KEY.AMBUSH, theater: THEATER.LAND })
            .getMove()
        );

        roundState.playDecision({
          decision: {
            type: DECISION_TYPE.FLIP_DECISION,
            targetedPlayer: PLAYER.ONE,
            theater: THEATER.AIR,
          },
        });

        expect(() => {
          roundState.playCard(
            roundState.deck
              .find({ type: CARD_TYPE_KEY.HEAVY, theater: THEATER.AIR })
              .getMove({ theater: THEATER.SEA }),
            { dryRun: true }
          );
        }).toThrow();

        expect(() => {
          roundState.playCard(
            roundState.deck
              .find({ type: CARD_TYPE_KEY.HEAVY, theater: THEATER.LAND })
              .getMove({ theater: THEATER.AIR }),
            { dryRun: true }
          );
        }).toThrow();

        expect(() => {
          roundState.playCard(
            roundState.deck
              .find({ type: CARD_TYPE_KEY.HEAVY, theater: THEATER.SEA })
              .getMove({ theater: THEATER.LAND }),
            { dryRun: true }
          );
        }).toThrow();
      });

      it("doesn't prevent playing in matching theaters", () => {
        roundState.playCard(
          roundState.deck.find({ type: CARD_TYPE_KEY.AIR_DROP }).getMove()
        );

        roundState.playCard(
          roundState.deck.find({ type: CARD_TYPE_KEY.COVER_FIRE }).getMove()
        );

        expect(() => {
          roundState.playCard(
            roundState.deck
              .find({ type: CARD_TYPE_KEY.HEAVY, theater: THEATER.AIR })
              .getMove({ theater: THEATER.AIR }),
            { dryRun: true }
          );
        }).not.toThrow();

        expect(() => {
          roundState.playCard(
            roundState.deck
              .find({ type: CARD_TYPE_KEY.HEAVY, theater: THEATER.LAND })
              .getMove({ theater: THEATER.LAND }),
            { dryRun: true }
          );
        }).not.toThrow();

        expect(() => {
          roundState.playCard(
            roundState.deck
              .find({ type: CARD_TYPE_KEY.HEAVY, theater: THEATER.SEA })
              .getMove({ theater: THEATER.SEA }),
            { dryRun: true }
          );
        }).not.toThrow();
      });
    });

    describe(CARD_TYPE_KEY.MANEUVER, () => {
      it("can't flip over itself", () => {
        roundState.playCard(
          roundState.deck
            .find({ type: CARD_TYPE_KEY.MANEUVER, theater: THEATER.AIR })
            .getMove()
        );

        expect(() => {
          roundState.playDecision({
            decision: {
              type: DECISION_TYPE.FLIP_DECISION,
              targetedPlayer: PLAYER.ONE,
              theater: THEATER.AIR,
            },
          });
        }).toThrow();
      });

      it.todo("can't flip over a card in a non-adjacent theater");

      it.todo('can filp over an allied card');

      it.todo('can filp over an enemy card');

      it.todo('can be flipped over by a triggered effect');

      it.todo('has no effect if there are no targetable cards');

      it.todo('must flip a card if there are targetable cards');
    });

    describe(CARD_TYPE_KEY.AERODROME, () => {
      it.todo('permits cards to be played in any theater');

      it.todo("doesn't grant permissions to the opponent");

      it.todo("doesn't work on cards of strength four or more");

      it.todo('stops working when flipped over');
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
        roundState.playCard(
          roundState.deck
            .find({ type: CARD_TYPE_KEY.HEAVY, theater: THEATER.AIR })
            .getMove({ theater: THEATER.AIR })
        );

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
      it.todo('adds a card face down');

      it.todo('can add a card that is immediately discarded');

      it.todo('allows choosing not to reinforce');

      it.todo('must add the card in an adjacent theater');

      it.todo('can be triggered multiple times');
    });

    describe(CARD_TYPE_KEY.AMBUSH, () => {
      it.todo('can flip over itself');

      it.todo('can flip over a card in an adjacent theater');

      it.todo('can flip over a card in a non-adjacent theater');

      it.todo('can filp over an allied card');

      it.todo('can filp over an enemy card');

      it.todo('can be flipped over by a triggered effect');

      it.todo('must always flip over a card');
    });

    describe(CARD_TYPE_KEY.COVER_FIRE, () => {
      it.todo('strengthens weak cards beneath it');

      it.todo('strengthens flipped cards beneath it');

      it.todo('weakens strong cards beneath it');

      it.todo('stops working when flipped over');

      it.todo('works as expected when moved to a new theater');
    });

    describe(CARD_TYPE_KEY.DISRUPT, () => {
      it.todo('causes two decisions to be enqueued');

      it.todo('can cause the opponent to flip a card in any theater');

      it.todo("let's the opponent choose which card to flip");

      it.todo('requires the opponent to flip a card if able');

      it.todo('allows the opponent to flip a card in any theater');

      it.todo(
        'resovles the effects of the opponents flip before proceeding to your flip'
      );

      it.todo("then let's you choose which card to flip");

      it.todo('requires you to flip a card');

      it.todo('it allows you to flip a card in any theater');

      it.todo('can flip over a card in a non-adjacent theater');

      it.todo('can be cancelled by being flipped over mid-effect');
    });

    describe(CARD_TYPE_KEY.TRANSPORT, () => {
      it.todo('moves a card');

      it.todo('can move face down cards');

      it.todo('can move covered cards');

      it.todo('does not trigger containment or blockade');

      it.todo('permits choosing not to transport');

      it.todo('can transport itself');

      it.todo('can be triggered multiple times');
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
    let roundState: RoundState;

    beforeEach(() => {
      roundState = new RoundState([THEATER.AIR, THEATER.LAND, THEATER.SEA]);
    });

    it("prevents playing cards that are not in the player's hand", () => {
      autorun(reaction => {
        expect(() => {
          roundState.playCard(roundState.currentHandP2[0].getMove());
        }).toThrow();

        reaction.dispose();
      });

      // TODO - I'd like to test this case too, but I'd need a way to
      // conveniently play whatever decisions are necessary after playing p1's
      // first card.
      // roundState.playCard(roundState.currentHandP1[0].getMove());
      // expect(() => {
      //   roundState.playCard(roundState.currentHandP1[0].getMove());
      // }).toThrow();
    });

    it.todo('prevents playing cards face up to non-matching theaters');

    it.todo("doesn't prevent playing cards that would be discarded");

    it.todo('prevents playing cards when a decision is anticipated');

    it.todo('prevents surrendering when a decision is anticipated');

    it.todo('prevents make a decision when none is anticipated');

    it.todo('prevents making a decision of the incorrect type');

    it.todo(
      'prevents making a decision of the correct type but from the incorrect player'
    );

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

    it.todo('keeps track of whether the opponent has seen which card it is');
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
      it.todo('has a status effect when Containment is played');
    });

    describe('Player Status Effects', () => {
      it.todo('has a status effect when Air Drop is played');

      it.todo('has a status effect when Escalation is played');

      it.todo('has a status effect when Aerodrome is played');
    });

    describe('Theater Status Effects', () => {
      it.todo('has a status effect when Blockade is played');

      it.todo('has a status effect when Support is played');
    });
  });
});
