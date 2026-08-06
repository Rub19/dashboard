## 2024-05-18 - Missing aria-label for non icon buttons
**Learning:** Found multiple instances where non-icon buttons lacked `aria-label` attributes in a custom workspace application, primarily within UI components like `panel.mjs` and `toast.mjs`.
**Action:** Always check action buttons, especially ones with dynamic states (e.g. Focus Timer buttons), to ensure they have descriptive `aria-label` attributes to aid screen reader navigation.
