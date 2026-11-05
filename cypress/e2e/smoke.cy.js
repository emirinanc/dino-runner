// P0: the page loads and the game starts. (No console errors is checked after every test.)
describe('page load', () => {
  beforeEach(() => cy.visitGame());

  it('shows the game, the versions and the characters', () => {
    cy.get('canvas#game').should('be.visible');
    cy.get('#overlay-hint').should('have.text', 'Press Space to start');
    cy.get('[data-theme-id]').should('have.length.at.least', 5);
    cy.get('[data-theme-id=classic]').should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-character-id=trex]').should('have.attr', 'aria-pressed', 'true');
    cy.get('#score-card').should('not.be.visible');
  });

  it('keeps the versions panel above the score card', () => {
    cy.get('#themes').then(([themes]) => {
      const card = themes.ownerDocument.getElementById('score-card');
      expect(themes.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).to.be.greaterThan(0);
    });
  });

  it('Space starts the game', () => {
    cy.window().its('game.state').should('eq', 'ready');
    cy.pressSpace();
    cy.window().its('game.state').should('eq', 'running');
    cy.get('#overlay').should('not.be.visible');
  });

  it('P pauses and shows the score card, Space continues', () => {
    cy.pressSpace();
    cy.window().then((win) => win.dispatchEvent(new win.KeyboardEvent('keydown', { code: 'KeyP', key: 'p', bubbles: true })));
    cy.window().its('game.state').should('eq', 'paused');
    cy.get('#overlay-title').should('have.text', 'PAUSED');
    cy.get('#score-card').should('be.visible');
    cy.pressSpace();
    cy.window().its('game.state').should('eq', 'running');
    cy.get('#score-card').should('not.be.visible');
  });
});
