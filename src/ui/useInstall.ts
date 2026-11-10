import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Navigator {
    install?: () => Promise<void>;
  }
}

// Captured globally: the event can fire before Settings is ever mounted.
let deferred: BeforeInstallPromptEvent | undefined;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = undefined;
    listeners.forEach((l) => l());
  });
}

const supportsWebInstall = typeof Navigator !== 'undefined' && typeof (Navigator.prototype as Navigator).install === 'function';

/**
 * Install button support, following the Web Install API with a
 * beforeinstallprompt fallback. `available` is false when the browser offers
 * neither, in which case no button should be shown.
 */
export function useInstall() {
  const [, force] = useState(0);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const available = supportsWebInstall || deferred !== undefined;

  async function install() {
    try {
      if (supportsWebInstall) {
        // Must run directly inside the click handler to keep user activation.
        await navigator.install!();
        setStatus('Installed. Open it from your home screen.');
      } else if (deferred) {
        const ev = deferred;
        deferred = undefined;
        await ev.prompt();
        const { outcome } = await ev.userChoice;
        setStatus(outcome === 'accepted' ? 'Installed. Open it from your home screen.' : 'Install cancelled.');
        force((x) => x + 1);
      }
    } catch (err) {
      setStatus(err instanceof DOMException && err.name === 'AbortError' ? 'Install cancelled.' : 'Install could not start.');
    }
  }

  return { available, install, status };
}
