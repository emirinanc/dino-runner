// @vitest-environment jsdom
// P1: settings survive reloads and app updates. New defaults must be merged
// into old saved settings without losing what the parent picked.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, loadHighScore, saveHighScore } from '../../src/storage.js';

const KEY = 'dino-runner:settings';
const saved = (value) => localStorage.setItem(KEY, JSON.stringify(value));

beforeEach(() => localStorage.clear());

describe('loadSettings', () => {
  it('returns the defaults when nothing is saved', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('does not share nested objects with DEFAULT_SETTINGS', () => {
    const s = loadSettings();
    s.custom.dino = '#ff0000';
    s.learning.voices.tr = 'x';
    expect(DEFAULT_SETTINGS.custom.dino).toBeNull();
    expect(DEFAULT_SETTINGS.learning.voices).toEqual({});
  });

  it('keeps a saved character and theme', () => {
    saved({ character: 'chubby', theme: 'night' });
    expect(loadSettings()).toMatchObject({ character: 'chubby', theme: 'night', sound: true });
  });

  it('adds new defaults to settings saved by an older version', () => {
    saved({ theme: 'hero', custom: { dino: '#123456' }, learning: { lang: 'en' } });
    const s = loadSettings();
    expect(s.character).toBe('trex');
    expect(s.custom).toEqual({ ...DEFAULT_SETTINGS.custom, dino: '#123456' });
    expect(s.learning).toEqual({ ...DEFAULT_SETTINGS.learning, lang: 'en', voices: {} });
  });

  it('keeps the chosen browser voice per language', () => {
    saved({ learning: { maxNumber: 20, voices: { tr: 'uri:Yelda', en: 'uri:Samantha' } } });
    const s = loadSettings();
    expect(s.learning.voices).toEqual({ tr: 'uri:Yelda', en: 'uri:Samantha' });
    expect(s.learning.maxNumber).toBe(20);
    expect(s.learning.speak).toBe(true);
  });

  it('survives corrupt JSON', () => {
    localStorage.setItem(KEY, '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips through saveSettings', () => {
    const s = loadSettings();
    s.character = 'chubby';
    s.learning.voices.tr = 'uri:Cem';
    expect(saveSettings(s)).toBe(true);
    expect(loadSettings()).toEqual(s);
  });

  it('reports a failed save (quota exceeded, private mode)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(saveSettings(loadSettings())).toBe(false);
  });
});

describe('high score', () => {
  it('defaults to 0 and round-trips', () => {
    expect(loadHighScore()).toBe(0);
    saveHighScore(387);
    expect(loadHighScore()).toBe(387);
  });

  it('treats garbage as 0', () => {
    localStorage.setItem('dino-runner:high', '"abc"');
    expect(loadHighScore()).toBe(0);
  });
});
