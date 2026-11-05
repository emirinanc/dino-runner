import { CONFIG } from '../../src/config.js';

// P1: after a crash the score card shows and reads the score; the breakdown explains it.
describe('score card', () => {
  beforeEach(() => cy.visitGame());

  it('appears after a crash with the number, its words and the high score', () => {
    cy.pressSpace();
    cy.endRun(387);
    cy.get('#overlay-title').should('have.text', 'GAME OVER');
    cy.get('#btn-restart').should('be.visible');
    cy.get('#score-card').should('be.visible');
    cy.get('#score-card .big-number').should('have.text', '387');
    cy.get('#score-card .number-words').should('have.text', 'üç yüz seksen yedi');
    cy.window().then((win) => expect(win.localStorage.getItem('dino-runner:high')).to.eq('387'));
  });

  it('reads the score aloud with a voice clip', () => {
    cy.get('@manifest').its('response.body.clips').then((clips) => {
      cy.endRun(387);
      cy.heard().its('clips').should('include', `audio/tr/${clips['Üç yüz seksen yedi.']}`);
      cy.heard().its('spoken').should('have.length', 0);
    });
  });

  // Regression: the first frame after start() / resume() can be stamped before
  // the time they stored; it ran the game backwards to a score of -1, which the
  // card read as "undefined yüz …" with the browser voice.
  it('never steps the game backwards right after starting or resuming', () => {
    cy.window().then((win) => {
      const { game } = win;
      game.restart();
      game.frame(game.last - 40);
      expect(game.distance, 'after start').to.be.at.least(0);
      game.pause();
      game.resume();
      game.frame(game.last - 40);
      expect(game.distance, 'after resume').to.be.at.least(0);
    });
  });

  it('breaks the score into place values', () => {
    cy.endRun(387);
    cy.get('#score-card [data-action=breakdown]').click();
    cy.get('#score-card .places .place').should('have.length', 3);
    cy.get('#score-card .place[data-place=hundreds] .place-name').should('have.text', '3 yüzlük');
    cy.get('#score-card .equation').invoke('text').should('eq', '300+80+7=387');
    cy.get('#score-card .equation-words').should('have.text', 'üç yüz artı seksen artı yedi eşittir üç yüz seksen yedi');
  });

  it('Space after the crash starts a new run and hides the card', () => {
    cy.endRun(12);
    // input right after a crash is ignored on purpose (CONFIG.restartDelayMs): wait for that state, not a fixed time
    cy.window().should((win) => expect(win.performance.now() - win.game.crashedAt).to.be.greaterThan(CONFIG.restartDelayMs));
    cy.pressSpace();
    cy.window().its('game.state').should('eq', 'running');
    cy.get('#score-card').should('not.be.visible');
  });
});
