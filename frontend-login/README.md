# Login frontend

Adapted from shadcn/ui's official `login-04` split-card block. Button, Card,
Input, Label and Tabs are copied from the official new-york registry (snapshots
in `registry/`). React + Radix retain accessible form, keyboard and tab behavior.

Build from the repository root: `npm run build:login`.
Generated static files are committed in `spartanai-recreation/dist/login`.
The outer page is viewport-locked; only the form pane scrolls on short displays
and when a mobile keyboard reduces the available viewport. Existing auth API
and demo accounts are unchanged.

Sources: https://ui.shadcn.com/blocks/login and https://github.com/shadcn-ui/ui
License: MIT, copyright shadcn.
