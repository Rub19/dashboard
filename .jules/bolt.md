## 2024-05-24 - Throttle DOM Updates on Scroll

**Learning:** Event listeners attached to high-frequency events like `scroll` can cause significant layout thrashing if they trigger synchronous DOM reads/writes (like measuring `scrollHeight` and setting `style.width`). While `{ passive: true }` prevents the browser from waiting for the handler to finish before scrolling, it does not prevent the handler from overloading the main thread with DOM operations.

**Action:** Always wrap high-frequency event handlers (scroll, pointermove, resize) that read/write to the DOM in `throttleFrame` (or similar `requestAnimationFrame` wrappers) to ensure updates are batched to the display refresh rate.
