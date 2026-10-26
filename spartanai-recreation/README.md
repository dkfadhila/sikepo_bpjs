# Spartan AI — local HTML recreation

Reference: https://spartanai.framer.website/

## Current SIKEPO source workflow

The production landing retains Framer motion and renders SIKEPO content from
patched component configuration. See [FRAMER_SOURCE.md](FRAMER_SOURCE.md) for
the current authoring and verification workflow. The older snapshot and
`customize_landing.py` commands below are historical and must not overwrite the
adapted landing. `/motion-lab/` is an isolated native-motion experiment.

## Run

Double-click `start.bat`, then open http://127.0.0.1:7730.
Requires Python 3. No npm install or build step is needed.
Serve `dist/` as the web root. Opening index.html directly with file:// does not support the ES modules.

## Files

- `dist/index.html`: complete homepage HTML with original responsive styles.
- `dist/assets/`: locally saved images, video, fonts, and interactive JavaScript modules.
- `dist/local.css`: removes the floating Made in Framer badge.
- `dist/local.js`: sends links to other pages to their original website.
- `build_snapshot.py`: reproducible local snapshot builder.
- `reference.html`: original public HTML for comparison.
- `asset-report.json`: asset download results.

## Implementation and scope

This is a faithful local adaptation of the public rendered homepage, retaining its exported Framer HTML/CSS and JavaScript runtime for its layout, motion, pricing controls, and FAQ interactions. It is not a hand-written replacement for the Framer runtime.

The Framer badge DOM and badge mount were removed; CSS also suppresses any late badge mount. The additional floating template-author promotional link and page-level analytics script were removed.

Only the homepage is saved. Other-page navigation and third-party links lead to the original online destinations. Dynamic CMS requests and external services can still require an internet connection. Newsletter submission uses the reference site's form integration; no replacement backend is provided.

## Verification

- Homepage served successfully via the local HTTP server.
- Hero visually compared with the reference at desktop width.
- Badge absent in the local rendering.
- FAQ deployment-timeline accordion opened successfully.
- All 679 discovered asset downloads completed without errors.

The source includes the original responsive breakpoints; mobile was not separately visually tested.

## SiKePO content update

The homepage copy now follows HANDOVER_CODEX.md: BPJS/JKN claims, financial/clinical/administrative signals, the A1–A2–A3 pipeline, and SA/VK/ST/AU roles. Commercial pricing and template testimonials were rewritten as product and role information. Narrative brand spelling is SiKePO; the brand in headlines is SIKEPO.

The large white SPARTAN footer wordmark is hidden by local.css. No image or video asset files were changed in this update. The two requested Downloads images are deferred at the user's request.

Local calls to action now lead to /dashboard/. Section navigation remains on the landing page.

customize_landing.py and sikepo-copy.json retain the copy adaptation. build_snapshot.py is the original reference downloader and overwrites homepage customizations; do not rerun it to launch the site. Use start.bat instead.

Further auditing and bug checks are deferred until the user explicitly requests them.

The two supplied images are now applied: assets/sikepo-hero-meadow.png and assets/sikepo-footer-forest.png. All other image/video assets remain unchanged.
