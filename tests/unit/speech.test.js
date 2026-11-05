// @vitest-environment jsdom
// P0: which voice speaks. The natural clips (Puck) are the main experience;
// the browser voice is the fallback, or the parent's explicit choice.
import { describe, it, expect, beforeEach } from 'vitest';
import { Speech, sentences } from '../../src/learn/speech.js';
import { breakdownScript } from '../../src/learn/numbers.js';
import { stubAudioAndSpeech, voice, manifest } from './support/fakes.js';

const settings = (learning = {}) => ({ learning: { lang: 'tr', voices: {}, ...learning } });
const clipFile = (sentence) => `audio/tr/${manifest().clips[sentence]}`;

describe('sentences() — splitting and polishing utterances', () => {
  it.each([
    ['Aferin! bir artı altı, yedi eder!', ['Aferin!', 'Bir artı altı, yedi eder!']],
    ['üç yüz', ['Üç yüz.']], // a full stop is added so the voice falls at the end
    ['üç yüz,', ['Üç yüz,']], // pieces keep their comma
    ['Peki, kaç tane?', ['Peki, kaç tane?']],
    ['iki değil. Hadi birlikte sayalım!', ['İki değil.', 'Hadi birlikte sayalım!']], // Turkish dotted capital İ
    ['ıı. ıı.', ['Iı.', 'Iı.']], // dotless ı → I
    ['  bir.  ', ['Bir.']],
    ['', []],
  ])('%j → %j', (text, expected) => {
    expect(sentences(text, 'tr-TR')).toEqual(expected);
  });

  it('uses English capitalization rules for English', () => {
    expect(sentences('it is one. it is two', 'en-US')).toEqual(['It is one.', 'It is two.']);
  });
});

describe('Speech.say — clips vs. browser voice', () => {
  let heard, synth;

  beforeEach(() => {
    ({ heard, synth } = stubAudioAndSpeech({ voices: [voice('Yelda'), voice('Cem (Enhanced)')] }));
  });

  const ready = async (s = settings()) => {
    const speech = new Speech(s);
    await speech.loadClips('tr');
    return speech;
  };

  it('plays a whole utterance from clips, sentence by sentence, in order', async () => {
    const speech = await ready();
    await speech.say('Aferin! bir artı altı, yedi eder!', 'tr');
    expect(heard.clips).toEqual([clipFile('Aferin!'), clipFile('Bir artı altı, yedi eder!')]);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('builds a breakdown sum from its pieces', async () => {
    const speech = await ready();
    const pieces = ['üç yüz,', 'artı kırk,', 'artı yedi,', 'eşittir,', 'üç yüz kırk yedi.'];
    await speech.say([{ text: pieces.join(' '), pieces }], 'tr');
    expect(heard.clips).toHaveLength(5);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('plays the whole breakdown of 387 from 9 clips', async () => {
    const speech = await ready();
    await speech.say(breakdownScript(387, 'tr'), 'tr');
    expect(heard.clips).toHaveLength(9); // the number, 3 columns, 5 sum pieces
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('says zero with a clip', async () => {
    const speech = await ready();
    await speech.say('sıfır.', 'tr');
    expect(heard.clips).toEqual([clipFile('Sıfır.')]);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('uses the browser voice for the whole utterance if any sentence has no clip', async () => {
    const speech = await ready();
    await speech.say('Aferin! bin iki yüz.', 'tr'); // scores above 999 have no clips
    expect(heard.clips).toEqual([]);
    expect(heard.spoken.map((s) => s.text)).toEqual(['Aferin! Bin iki yüz.']);
  });

  it('uses the browser voice the parent chose instead of the clips', async () => {
    const speech = await ready(settings({ voices: { tr: 'uri:Yelda' } }));
    await speech.say('bir.', 'tr');
    expect(heard.clips).toEqual([]);
    expect(heard.spoken).toEqual([expect.objectContaining({ text: 'Bir.', voice: 'Yelda', lang: 'tr-TR' })]);
  });

  it('speaks with the natural pitch and the requested rate', async () => {
    const speech = await ready(settings({ voices: { tr: 'uri:Yelda' } }));
    await speech.say('bir.', 'tr', { rate: 0.8 });
    expect(synth.speak.mock.calls[0][0]).toMatchObject({ pitch: 1, rate: 0.8 });
  });

  it('picks the best browser voice when there are no clips', async () => {
    stubAudioAndSpeech({ voices: [voice('Yelda'), voice('Cem (Enhanced)'), voice('Samantha', 'en-US')], manifestBody: null });
    const speech = new Speech(settings());
    await speech.loadClips('tr');
    expect(speech.voicesFor('tr').map((v) => v.name)).toEqual(['Cem (Enhanced)', 'Yelda']);
    expect(speech.clipVoiceName('tr')).toBeNull();
  });

  it('falls back to the browser voice when the manifest is missing', async () => {
    ({ heard } = stubAudioAndSpeech({ voices: [voice('Yelda')], manifestBody: null }));
    const speech = new Speech(settings());
    await speech.loadClips('tr');
    await speech.say('bir.', 'tr');
    expect(heard.clips).toEqual([]);
    expect(heard.spoken.map((s) => s.voice)).toEqual(['Yelda']);
  });

  it('calls onStart for each step as it begins', async () => {
    const speech = await ready();
    const started = [];
    await speech.say([{ text: 'bir.', onStart: () => started.push(1) }, { text: 'iki.', onStart: () => started.push(2) }], 'tr');
    expect(started).toEqual([1, 2]);
  });

  it('cancel() stops the rest of a clip sequence', async () => {
    const speech = await ready();
    const done = speech.say(['bir.', 'iki.', 'üç.'], 'tr');
    speech.cancel();
    await done;
    expect(heard.clips.length).toBeLessThanOrEqual(1);
  });

  it('names the natural voice from the manifest', async () => {
    const speech = await ready();
    expect(speech.clipVoiceName('tr')).toBe(manifest().label);
    expect(speech.hasVoice('tr')).toBe(true);
  });
});

describe('Speech.say — before the clip manifest has loaded', () => {
  // On a slow first visit the score card can speak before the manifest has
  // arrived; that utterance must still use the clips, not the browser voice.
  it('still uses the clips once the manifest arrives', async () => {
    const { heard, synth, releaseManifest } = stubAudioAndSpeech({ voices: [voice('Yelda')], manifestDelay: 1 });
    const speech = new Speech(settings());
    const done = speech.say('sıfır.', 'tr');
    releaseManifest();
    await done;
    await speech.loadClips('tr');
    expect(synth.speak).not.toHaveBeenCalled();
    expect(heard.clips).toEqual([clipFile('Sıfır.')]);
  });
});
