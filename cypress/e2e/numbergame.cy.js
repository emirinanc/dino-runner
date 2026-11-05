// P0/P1: a number game round. Fixed questions (1 + 7 and its chain) make it deterministic.
const g = (id, n) => ({ id, n });
const CHAIN = [
  { kind: 'add', groups: [g(0, 1), g(1, 7)], relation: null, answer: 8 },
  { kind: 'add', groups: [g(1, 7), g(0, 1)], relation: 'swap', answer: 8 },
  { kind: 'add', groups: [g(1, 7), g(0, 2)], relation: 'more', answer: 9 },
  { kind: 'add', groups: [g(0, 2), g(1, 7)], relation: 'swap', answer: 9 },
  { kind: 'add', groups: [g(0, 2), g(1, 6)], relation: 'less', answer: 8 },
];

const reward = () => cy.get('#dlg-numbers [data-testid=ng-reward]');
const option = (n) => cy.contains('#dlg-numbers .ng-option', new RegExp(`^${n}$`));
// The two wrong options are picked at random; any one of them will do.
const wrongOption = (answer) => cy.get('#dlg-numbers .ng-option').filter((_, b) => b.textContent !== String(answer)).first();
const answerRight = (n) => {
  option(n).click();
  cy.get('#dlg-numbers .ng-option.right').should('not.exist'); // the next question is up
};

describe('number game', () => {
  beforeEach(() => {
    cy.visitGame();
    cy.window().then((win) => {
      win.ui.numberGame.makeQuestions = () => structuredClone(CHAIN);
    });
    cy.get('#btn-numbers').click();
    cy.get('#dlg-numbers').should('have.attr', 'open');
    cy.get('#dlg-numbers .ng-equation').should('contain.text', '1+7=?');
  });

  it('a wrong answer counts all pictures together, then asks again', () => {
    cy.get('@manifest').its('response.body.clips').then((clips) => {
      wrongOption(8).click();
      cy.get('#dlg-numbers .ng-option').should('have.length', 3).each((b) => expect(b).to.be.disabled);
      cy.get('#dlg-numbers .ng-badge', { timeout: 15000 }).should('have.length', 8);
      cy.get('#dlg-numbers .ng-option', { timeout: 15000 }).should('not.be.disabled');
      reward().should('have.attr', 'aria-label').and('match', /^0 of 5\b/);
      cy.heard().its('clips').should((heard) => {
        expect(heard.at(-1)).to.eq(`audio/tr/${clips['Peki, kaç tane?']}`);
        expect(heard).to.include(`audio/tr/${clips['Hadi birlikte sayalım!']}`);
      });
    });
  });

  it('right answers fill the reward counter; the final screen appears after the round', () => {
    reward().should('have.attr', 'aria-label').and('match', /^0 of 5\b/);
    answerRight(8);
    reward().should('have.attr', 'aria-label').and('match', /^1 of 5\b/);
    cy.get('#dlg-numbers .ng-history').should('contain.text', '1+7=8');
    cy.get('#dlg-numbers .ng-scene .ng-group').first().find('.ng-item').should('have.length', 7); // swapped: 7 + 1
    answerRight(8);
    answerRight(9);
    answerRight(9);
    cy.get('#dlg-numbers .ng-item.ghost').should('have.length', 1); // one went away
    option(8).click();
    reward().should('have.attr', 'aria-label').and('match', /^5 of 5\b/);
    cy.get('#dlg-numbers .ng-done').should('be.visible');
    cy.get('#dlg-numbers [data-testid=ng-done-reward]').should('be.visible').and('have.attr', 'aria-label').and('match', /^5 of 5\b/);
    cy.focused().should('have.attr', 'data-action', 'close-done');
  });

  it('Space on the final screen closes it and starts the game', () => {
    for (const n of [8, 8, 9, 9]) answerRight(n);
    option(8).click();
    cy.get('#dlg-numbers .ng-done').should('be.visible');
    cy.window().then((win) => win.document.activeElement?.blur()); // wherever the focus is
    cy.pressSpace();
    cy.get('#dlg-numbers').should('not.have.attr', 'open');
    cy.window().its('game.state').should('eq', 'running');
  });

  it('tapping pictures counts them', () => {
    cy.get('#dlg-numbers .ng-scene .ng-item').eq(3).click();
    cy.get('#dlg-numbers .ng-scene .ng-item').eq(0).click();
    cy.get('#dlg-numbers .ng-badge').then((b) => expect([...b].map((x) => x.textContent)).to.deep.equal(['2', '1']));
  });
});
