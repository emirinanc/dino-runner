// P0 (regressions): Space must not start the game behind an open dialog, and
// starting the game closes whatever dialog is open.
describe('dialogs and the Space key', () => {
  beforeEach(() => cy.visitGame());

  it('Space does not start the game while Customize is open', () => {
    cy.get('#btn-customize').click();
    cy.get('#dlg-customize').should('have.attr', 'open');
    cy.window().then((win) => win.document.activeElement?.blur()); // focus fell back to <body>
    cy.pressSpace();
    cy.window().its('game.state').should('not.eq', 'running');
    cy.get('#dlg-customize').should('have.attr', 'open');
  });

  it('Space does not start the game during number game questions', () => {
    cy.get('#btn-numbers').click();
    cy.get('#dlg-numbers').should('have.attr', 'open');
    cy.window().then((win) => win.document.activeElement?.blur());
    cy.pressSpace();
    cy.window().its('game.state').should('not.eq', 'running');
    cy.get('#dlg-numbers').should('have.attr', 'open');
  });

  it('starting the game closes an open dialog', () => {
    cy.pressSpace();
    cy.get('#btn-customize').click(); // pauses the game
    cy.window().its('game.state').should('eq', 'paused');
    cy.get('#dlg-customize').should('have.attr', 'open');
    cy.window().then((win) => win.game.resume());
    cy.get('#dlg-customize').should('not.have.attr', 'open');
    cy.window().its('game.state').should('eq', 'running');
  });
});
