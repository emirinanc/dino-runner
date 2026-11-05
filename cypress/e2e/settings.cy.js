// P1: picks made by the parent stick across reloads.
describe('characters and versions', () => {
  beforeEach(() => cy.visitGame());

  it('the character picker switches character and remembers it', () => {
    cy.get('[data-character-id=chubby]').click();
    cy.get('[data-character-id=chubby]').should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-character-id=trex]').should('have.attr', 'aria-pressed', 'false');
    cy.window().its('game.bank.character').should('eq', 'chubby');
    cy.reload();
    cy.get('[data-character-id=chubby]').should('have.attr', 'aria-pressed', 'true');
    cy.window().its('game.settings.character').should('eq', 'chubby');
  });

  it('a version button switches the theme, page colors and URL, and is remembered', () => {
    cy.get('[data-theme-id=night]').click();
    cy.get('[data-theme-id=night]').should('have.attr', 'aria-pressed', 'true');
    cy.location('search').should('eq', '?theme=night');
    cy.window().its('game.settings.theme').should('eq', 'night');
    cy.document().then((doc) => expect(doc.documentElement.style.getPropertyValue('--bg')).to.eq('#18191b'));
    cy.visit('/'); // no ?theme: the saved one is used
    cy.get('[data-theme-id=night]').should('have.attr', 'aria-pressed', 'true');
  });

  it('?theme= in the URL picks the version', () => {
    cy.visitGame('/?theme=hero');
    cy.get('[data-theme-id=hero]').should('have.attr', 'aria-pressed', 'true');
  });
});
