# Dashboard frontend

React shell using official shadcn/ui Button, Card, Input, Label, Badge and Table
components, shared with the login frontend. `dashboard-01` registry snapshot
records the source reference for the sidebar/header/card-grid composition.

`src/shell.json` preserves IDs and empty data slots consumed by the existing
`dist/dashboard/dashboard.js` audit controller and `auth.js` session/Gemma adapter.
React does not rerender those DOM-owned slots. This keeps search, filters,
CSV export, detail dialogs, roles, logout and AI requests on their existing paths.

Build: `npm run build:dashboard`. Generated bundles are committed. The viewport
is locked; main content and sidebar have independent internal scroll. Tables
scroll horizontally inside their container on narrow screens.

Sources: https://ui.shadcn.com/blocks/dashboard and https://github.com/shadcn-ui/ui
License: MIT, copyright shadcn.
