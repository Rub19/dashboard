import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import {
  BUILT_IN_PRESETS,
  sanitizePreset,
  applyPreset,
  extractPresetFromState,
  presetToSettings,
  settingsToPresetFields,
  findPreset,
  builtInPresetById,
  loadCustomPresets,
  saveCustomPresets,
  addCustomPreset,
  removeCustomPreset,
} from './preset-engine';
import { DEFAULTS, type Settings } from './settings';

describe('preset-engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('exports built-in presets', () => {
    expect(BUILT_IN_PRESETS.length).toBe(6);
    expect(BUILT_IN_PRESETS[0].id).toBe('productivity');
  });

  it('finds built-in presets by id', () => {
    expect(builtInPresetById('gaming')?.name).toBe('Gaming');
    expect(builtInPresetById('unknown')).toBeNull();
  });

  it('finds presets in custom list', () => {
    const custom = { ...BUILT_IN_PRESETS[0], id: 'custom-1' };
    expect(findPreset('custom-1', [custom])?.id).toBe('custom-1');
    expect(findPreset('gaming', [custom])?.id).toBe('gaming');
  });

  it('sanitizes a valid flat preset', () => {
    const raw = {
      id: 'my-preset',
      name: 'My Preset',
      description: 'A nice preset',
      icon: 'sparkles',
      theme: 'cyber-neon',
      accent: 'rose',
      customAccentColor: '#fb7185',
      aura: 'cyberpunk',
      density: 'compact',
      fontFamily: 'mono',
      radiusStyle: 'sharp',
      dockScale: 'large',
      dockAlign: 'stretch',
      dockGlass: 'default',
      dockAutoHide: false,
      dockMagnify: true,
      homeGrid: '4',
      homeHero: 'full',
      uiAnimations: 'smooth',
      uiGlow: true,
      uiSoundFeedback: true,
      spotlightEnabled: true,
      ambientEffectsEnabled: true,
      interfaceBlurEnabled: true,
    };
    const preset = sanitizePreset(raw);
    expect(preset).not.toBeNull();
    expect(preset?.id).toBe('my-preset');
    expect(preset?.theme).toBe('cyber-neon');
    expect(preset?.dockGlass).toBe('default');
  });

  it('rejects invalid values and falls back to defaults', () => {
    const raw = { id: 'test', theme: 'not-a-theme', dockGlass: 'not-a-glass', homeGrid: '99' };
    const preset = sanitizePreset(raw);
    expect(preset).not.toBeNull();
    expect(preset?.theme).toBe('obsidian');
    expect(preset?.dockGlass).toBe('default');
    expect(preset?.homeGrid).toBe('4');
  });

  it('converts a preset to Next.js settings', () => {
    const preset = BUILT_IN_PRESETS[1];
    const settings = presetToSettings(preset);
    expect(settings.theme).toBe(preset.theme);
    expect(settings.accentColor).toBe(preset.accent);
    expect(settings.densityMode).toBe(preset.density);
    expect(settings.dockGlass).toBe('ultra-blur');
    expect(settings.fontFamily).toBe(preset.fontFamily);
  });

  it('extracts settings fields for presets', () => {
    const fields = settingsToPresetFields(DEFAULTS);
    expect(fields.theme).toBe(DEFAULTS.theme);
    expect(fields.dockGlass).toBe('default');
  });

  it('applies a preset through an update function', () => {
    const update = jest.fn() as jest.Mock<void, [Partial<Settings>]>;
    const result = applyPreset(BUILT_IN_PRESETS[3], DEFAULTS, update);
    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ theme: 'solar-eclipse', accentColor: 'violet' }));
  });

  it('extracts a custom preset from current state', () => {
    const state: Settings = { ...DEFAULTS, theme: 'cyber-neon', accentColor: 'rose' };
    const preset = extractPresetFromState(state, 'Cyber néon', 'Mon look', 'sparkles');
    expect(preset.id.startsWith('custom-')).toBe(true);
    expect(preset.name).toBe('Cyber néon');
    expect(preset.theme).toBe('cyber-neon');
    expect(preset.accent).toBe('rose');
  });

  it('loads and saves custom presets', () => {
    expect(loadCustomPresets()).toEqual([]);
    const next = [BUILT_IN_PRESETS[0], { ...BUILT_IN_PRESETS[1], id: 'custom-2' }];
    saveCustomPresets(next);
    const loaded = loadCustomPresets();
    expect(loaded.length).toBe(2);
    expect(loaded[1].id).toBe('custom-2');
  });

  it('adds and removes custom presets', () => {
    const custom = { ...BUILT_IN_PRESETS[0], id: 'custom-3' };
    const added = addCustomPreset([], custom);
    expect(added.length).toBe(1);
    const removed = removeCustomPreset(added, 'custom-3');
    expect(removed.length).toBe(0);
    expect(loadCustomPresets().length).toBe(0);
  });
});
