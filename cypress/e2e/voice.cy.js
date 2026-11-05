// P0: the natural voice (Puck clips) by default; the browser voice only when
// the parent picks one, or for sentences without a clip.
const listen = () => cy.get('#btn-voice-test').click();

describe('voice', () => {
  it('uses the Puck clips by default', () => {
    cy.visitGame();
    cy.get('@manifest').its('response.body').then(({ label, clips }) => {
      cy.get('#btn-customize').click();
      cy.get('[name=learnVoice] option').first().should('have.text', `${label} (natural voice)`);
      listen();
      cy.heard().should((heard) => {
        expect(heard.clips).to.deep.equal([
          `audio/tr/${clips['Üç yüz seksen yedi.']}`,
          `audio/tr/${clips['Üç artı dört, yedi eder!']}`,
        ]);
        expect(heard.spoken).to.have.length(0);
      });
    });
  });

  it('uses the browser voice the parent picks, and remembers the choice', () => {
    cy.visitGame();
    cy.get('#btn-customize').click();
    cy.get('[name=learnVoice]').select('test:Yelda');
    listen();
    cy.heard().should((heard) => {
      expect(heard.clips).to.have.length(0);
      expect(heard.spoken.map((s) => s.voice)).to.deep.equal(['Yelda', 'Yelda']);
      expect(heard.spoken[0].text).to.eq('Üç yüz seksen yedi.');
    });
    cy.window().then((win) => {
      expect(JSON.parse(win.localStorage.getItem('dino-runner:settings')).learning.voices.tr).to.eq('test:Yelda');
    });
  });

  it('switching back to the natural voice uses the clips again', () => {
    cy.visitGame('/', { settings: { learning: { voices: { tr: 'test:Yelda' } } } });
    cy.get('#btn-customize').click();
    cy.get('[name=learnVoice]').should('have.value', 'test:Yelda').select('');
    listen();
    cy.heard().its('clips').should('have.length', 2);
    cy.heard().its('spoken').should('have.length', 0);
  });

  it('a score without a clip (above 999) is read by the browser voice', () => {
    cy.visitGame();
    cy.endRun(1234);
    cy.heard().its('spoken').should('deep.include', { text: 'Bin iki yüz otuz dört.', voice: 'Yelda', lang: 'tr-TR' });
    cy.heard().its('clips').should('have.length', 0);
  });

  it('reads 0 with a clip even when the clip manifest arrives late (regression)', () => {
    cy.intercept('GET', '**/audio/tr/manifest.json', (req) => {
      req.on('response', (res) => res.setDelay(1500));
    }).as('slowManifest');
    cy.visitGame('/', { waitForClips: false });
    cy.endRun(0);
    cy.wait('@slowManifest').its('response.body.clips').then((clips) => {
      cy.heard().its('clips').should('include', `audio/tr/${clips['Sıfır.']}`);
      cy.heard().its('spoken').should('have.length', 0);
    });
  });
});
