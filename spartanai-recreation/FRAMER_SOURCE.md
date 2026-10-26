# SIKEPO configuration inside the retained Framer runtime

The landing at `/` uses the original exported Framer motion and interactive
components. `/motion-lab/` remains an isolated experiment.

SIKEPO content is now configured before React renders each component. The main
landing no longer loads `sikepo-branding.js` or `pipeline-mount.js`, and its local
navigation helper no longer observes DOM mutations. Those legacy files remain
available for the older motion experiment.

## Content sources

- `sikepo-copy.json`: exact copy translations, applied to component literals.
- `sikepo-risk-cards.json`: card labels and investigation metadata. A pure props
  adapter ignores old promotional numbers while preserving the original CMS route
  object and the card's Framer hover animation.
- `sikepo-summary.html`: overview content owned by a React view component.
- `dist/pipeline-section.html`: pipeline content owned by a React view component.
- `dist/local.css`: visual overrides, logos, selective green accent and hidden
  template sections.

`patch_framer_export.mjs` parses the exported modules with Acorn and edits known
component nodes and configuration values. It retains transition definitions,
gesture handlers, accordion state and animated button components. Pipeline uses
the existing Catatan navigation slot, including the original mobile close action.
The footer CTA now uses the animated Framer link button rather than a newsletter
form with a hidden input.

The adapted landing explicitly selects Framer's existing client-render entry path
instead of hydrating against the original server component tree. This avoids
hydration recovery rewriting mismatched old SSR nodes. The translated HTML stays
as the initial fallback; Framer then renders from the patched source. It still
performs its normal initial render and subsequent interaction updates. Editing
only arbitrary HTML is therefore not a supported content-editing workflow.

## Apply and verify

```powershell
npm ci
node spartanai-recreation/patch_framer_export.mjs
python spartanai-recreation/sync_framer_html.py
npm test
```

Python authoring requires `beautifulsoup4` and `html5lib`. Generated output is
committed; Render needs only its normal Node build and start commands. Increment
the shared version in both authoring scripts when changing source configuration
to invalidate cached ES modules, including dynamic imports.

Do not rerun `build_snapshot.py` or the legacy `customize_landing.py` on this
adapted tree. A new upstream export can change identifiers and must be reviewed
before applying these patches. The patcher validates JavaScript syntax and the
test suite checks the CMS adapter, source loading, footer uniqueness and module
syntax. Browser checks must exercise capabilities, FAQ, navigation and footer
after the runtime has finished mounting.
