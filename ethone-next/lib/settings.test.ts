import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { DEFAULTS, loadSettings, saveSettings, type Settings } from './settings';

const STORAGE_KEY = 'ethone-settings-v1';

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('has French as the default language and sensible defaults', () => {
    expect(DEFAULTS.language).toBe('fr');
    expect(DEFAULTS.darkMode).toBe(true);
    expect(DEFAULTS.fontSize).toBe(100);
    expect(DEFAULTS.theme).toBe('default');
  });

  it('returns defaults when localStorage is empty', () => {
    expect(loadSettings()).toEqual(DEFAULTS);
  });

  it('merges saved partial settings with defaults', () => {
    const partial: Settings = { ...DEFAULTS, language: 'en', fontSize: 120 };
    saveSettings(partial);
    const loaded = loadSettings();

    expect(loaded.language).toBe('en');
    expect(loaded.fontSize).toBe(120);
    expect(loaded.theme).toBe(DEFAULTS.theme);
    expect(loaded.darkMode).toBe(DEFAULTS.darkMode);
  });

  it('returns defaults when localStorage is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(loadSettings()).toEqual(DEFAULTS);
  });

  it('persists settings to localStorage', () => {
    const settings: Settings = { ...DEFAULTS, darkMode: false, density: 75 };
    saveSettings(settings);

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBe(JSON.stringify(settings));
  });

  it('tolerates extra fields in localStorage while preserving defaults', () => {
    const raw = JSON.stringify({ ...DEFAULTS, unknownField: true });
    localStorage.setItem(STORAGE_KEY, raw);

    const loaded = loadSettings();
    expect(loaded).toMatchObject(DEFAULTS);
    expect(loaded).toHaveProperty('unknownField', true);
    expect(loaded.language).toBe(DEFAULTS.language);
  });
});
