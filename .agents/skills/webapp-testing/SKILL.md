---
name: webapp-testing
description: Test local or preview web applications with Playwright-style browser automation. Use for frontend regression checks, functional flows, responsive validation, screenshots, runtime errors, hydration issues, and interactive UI debugging.
metadata:
  short-description: Browser-test web application flows
---

# Web Application Testing

## Goal

Validate real rendered behavior instead of relying only on static code review, typecheck, or production build success.

## Testing sequence

1. Identify the exact route and user journey under test.
2. Start from the current validated candidate SHA and avoid changing source while collecting baseline evidence.
3. Navigate to the app and wait for dynamic rendering/network activity to settle before inspecting the DOM.
4. Inspect the rendered UI before acting. Prefer semantic selectors (`role`, labels, visible text, stable IDs) over brittle DOM paths.
5. Exercise the target interaction and capture:
   - final visible state
   - console errors/warnings relevant to the flow
   - request/runtime failures when available
   - screenshots for visual regressions
6. Repeat at the smallest meaningful viewport matrix for the task.
7. Check reduced-motion behavior when motion/3D/scroll transitions are involved.
8. Re-run only the flows affected by a fix, then run broader regressions required by the repository release gate.

## USS Running minimum UI matrix

When applicable, verify:
- 320px mobile
- 375–430px mobile
- tablet
- normal desktop
- 200% browser zoom

Check for:
- accidental horizontal overflow
- clipped text or controls
- unstable form error layout
- inaccessible modal/drawer positioning
- loading/disabled/success/error feedback
- hydration/runtime errors
- keyboard focus visibility
- `prefers-reduced-motion` fallback

## Playwright pattern

Use a real browser automation runner already available in the environment. A minimal Python example:

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 375, "height": 812})
    page.goto("http://localhost:3000")
    page.wait_for_load_state("networkidle")
    # Inspect, interact, assert, screenshot.
    browser.close()
```

## Safety rules

- Do not treat screenshots alone as functional validation.
- Do not call build/typecheck success a browser pass.
- Do not use destructive admin mutations against production unless explicitly approved.
- Keep authenticated staging/provider QA separate from mocked/local checks.
- Do not hide service failures with fake domain data during browser tests.
- If a protected deployment cannot be reached, report the access blocker and test locally/preview only when that environment is authoritative enough for the requested check.

## Completion report

Report exact route, viewport(s), test cases/assertions, runtime/hydration findings, screenshots collected, limitations, and which behavior remains unvalidated.

Adapted from: https://github.com/composio-community/awesome-codex-skills/tree/master/webapp-testing
