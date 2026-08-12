import type { Settings } from "./settings";
import {
  BUILT_IN_PRESETS,
  PRESET_FIELDS,
  PRESET_IDS,
  type Preset,
  addCustomPreset,
  applyPreset,
  builtInPresetById,
  extractPresetFromState,
  findPreset,
  loadCustomPresets,
  presetToSettings,
  removeCustomPreset,
  sanitizePreset,
  saveCustomPresets,
  settingsToPresetFields,
} from "./preset-engine";

export type { Preset };

export type ViewPreset = {
  id: string;
  name: string;
  description: string;
  icon: string;
  settings: Partial<Settings>;
};

export { BUILT_IN_PRESETS, PRESET_FIELDS, PRESET_IDS };
export {
  addCustomPreset,
  applyPreset,
  builtInPresetById,
  extractPresetFromState,
  findPreset,
  loadCustomPresets,
  presetToSettings,
  removeCustomPreset,
  sanitizePreset,
  saveCustomPresets,
  settingsToPresetFields,
};

export const PRESETS: ViewPreset[] = BUILT_IN_PRESETS.map((preset) => ({
  ...preset,
  settings: presetToSettings(preset),
}));
