import { useEffect, type RefObject } from 'react';

interface RobustShellOptions {
  /** Whether the piano game is actively playing (enables in-game guards). */
  playing: boolean;
  /** Bring the AudioContext back to life after focus/visibility returns. */
  audioResume: () => void;
  /** Clear any "stuck" key state when the window/tab loses focus. */
  onBlurClear: () => void;
  /** Root element used as a focus-trap target so keystrokes stay inside the app. */
  rootRef: RefObject<HTMLElement | null>;
}

/**
 * Installs the cross-cutting robustness guards that keep a kids' piano game
 * from being broken by stray key presses, focus loss or accidental gestures.
 *
 * What this reliably prevents (handled at the page level):
 *  - Right-click / long-press context menu popping up mid-mash
 *  - Accidental text/image drag-selection
 *  - Pinch / ctrl+wheel zoom on trackpads
 *  - Safari gesture-zoom
 *  - Audio going silent forever after the tab is backgrounded
 *  - "Stuck" notes when the window loses focus
 *  - Keyboard focus escaping to the browser chrome (focus trap)
 *
 * What it can only mitigate (browser security — NOT blockable by JS):
 *  - Ctrl+W / Ctrl+T / Ctrl+N / Ctrl+R, F5, Alt+Tab, Win key, browser F11.
 *  For those we add a best-effort beforeunload confirmation prompt so an
 *  accidental reload/close at least asks first.
 */
export function useRobustShell({ playing, audioResume, onBlurClear, rootRef }: RobustShellOptions) {
  useEffect(() => {
    // --- Best-effort guard against accidental reload / tab close -------------
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    // --- Block the context menu while playing (right-click / long-press) -----
    const onContextMenu = (e: MouseEvent) => {
      if (playing) e.preventDefault();
    };

    // --- Block accidental drag of text / images ------------------------------
    const onDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    // --- Keep audio alive when the tab becomes visible / focused again -------
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') audioResume();
    };
    const onWindowFocus = () => audioResume();

    // --- Clear stuck notes when the window loses focus -----------------------
    const onWindowBlur = () => onBlurClear();

    // --- Focus trap: keep keyboard focus inside the app ----------------------
    // When focus leaves the document (e.g. Alt-Tab released focus to the
    // browser chrome) relatedTarget is null. If the document is still focused
    // we gently pull focus back so subsequent keystrokes stay in the game.
    const onFocusOut = (e: FocusEvent) => {
      if (e.relatedTarget === null && document.hasFocus()) {
        requestAnimationFrame(() => rootRef.current?.focus());
      }
    };

    // --- Block pinch / ctrl+wheel zoom ---------------------------------------
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };

    // --- Block Safari gesture zoom -------------------------------------------
    const onGesture = (e: Event) => e.preventDefault();

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('dragstart', onDragStart);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('focusout', onFocusOut);
    window.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('gesturestart', onGesture);
    document.addEventListener('gesturechange', onGesture);
    document.addEventListener('gestureend', onGesture);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('wheel', onWheel);
      document.removeEventListener('gesturestart', onGesture);
      document.removeEventListener('gesturechange', onGesture);
      document.removeEventListener('gestureend', onGesture);
    };
  }, [playing, audioResume, onBlurClear, rootRef]);
}
