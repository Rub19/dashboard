import { describe, expect, it } from '@jest/globals';
import { CATALOG, t } from './i18n';

describe('i18n', () => {
  it('returns the requested language translation', () => {
    expect(t('fr', 'home')).toBe('Accueil');
    expect(t('en', 'home')).toBe('Home');
    expect(t('es', 'home')).toBe('Inicio');
    expect(t('de', 'home')).toBe('Startseite');
  });

  it('falls back to French when the language is unknown', () => {
    expect(t('zz', 'home')).toBe(CATALOG.fr.home);
    expect(t('zz', 'save')).toBe(CATALOG.fr.save);
  });

  it('falls back to the key when the key is missing from all catalogs', () => {
    expect(t('fr', 'missingKey123')).toBe('missingKey123');
  });

  it('has a complete French catalog used as the default reference', () => {
    expect(CATALOG.fr).toBeDefined();
    expect(CATALOG.fr.home).toBe('Accueil');
    expect(CATALOG.fr.save).toBe('Enregistrer');
    expect(CATALOG.fr.language).toBe('Langue');
  });
});
