import { jest, describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import OfflineIndicator from './OfflineIndicator';

describe('OfflineIndicator', () => {
  let onLineSpy: jest.SpiedGetter<boolean>;

  beforeEach(() => {
    onLineSpy = jest.spyOn(window.navigator, 'onLine', 'get');
    onLineSpy.mockReturnValue(true);
  });

  afterEach(() => {
    onLineSpy.mockRestore();
  });

  it('renders nothing when the browser is online', () => {
    onLineSpy.mockReturnValue(true);
    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the offline banner when navigator is offline', async () => {
    onLineSpy.mockReturnValue(false);
    render(<OfflineIndicator />);

    const banner = await screen.findByText(/hors ligne/i);
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Vous êtes hors ligne');
  });

  it('reacts to online and offline window events', async () => {
    onLineSpy.mockReturnValue(true);
    render(<OfflineIndicator />);

    // Simulate going offline.
    onLineSpy.mockReturnValue(false);
    fireEvent(window, new Event('offline'));
    const banner = await screen.findByText(/hors ligne/i);
    expect(banner).toBeTruthy();

    // Simulate going back online.
    onLineSpy.mockReturnValue(true);
    fireEvent(window, new Event('online'));
    expect(screen.queryByText(/hors ligne/i)).toBeNull();
  });
});
