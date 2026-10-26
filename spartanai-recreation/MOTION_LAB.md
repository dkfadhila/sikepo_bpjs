# SIKEPO motion experiment

Preview: `/motion-lab/`. The homepage remains the Framer version.

The experiment retains the landing's exported CSS, fonts and existing artwork,
but does not load Framer, React, hydration code or the Framer module graph.
The replacement behavior lives in `dist/motion-lab/motion.js` and `motion.css`.
The page is excluded from search indexing.

## Implemented

- Hero and navigation entrances using the original exported delays and transforms.
- Sampled spring curves using the exported stiffness, damping and mass where given.
- Letter opacity tied to scroll from 75% to 15% of the viewport, with the original
  first 13 characters already revealed.
- Continuous duplicated ticker tracks at 25 px/s for hero logos and 30 px/s for
  the other tickers, matching the original configuration.
- Button/icon hover, image hover, three expanding capability panels, FAQ,
  process accordion, mobile menu and section navigation.
- Reduced motion support, native keyboard button activation and expanded states.
- One footer, without a second hydration mount.

## Fidelity limits

This is a reviewable prototype, not a claim of 100% animation equivalence.
Duration/bounce-only springs use an approximation; Framer's layout projection,
pixel icon effects and some card hover choreography have not been duplicated
frame by frame. Capability and process panels use explicit HTML and CSS layout
transitions. Shared exported styles and hashed class names remain an interim
dependency even though the Framer runtime is absent.

Desktop hero, expanded capability and FAQ states were inspected in the Codex
browser. Mobile menu, panel state changes and horizontal dimensions were checked
at a reported 390 CSS px. Deep-scroll mobile screenshots in the browser viewport
override intermittently return blank while the DOM still reports visible content;
full mobile visual equivalence is not confirmed.

## Rebuild

From the repository root, with `beautifulsoup4` and `html5lib` installed locally:

```powershell
python spartanai-recreation/build_motion_lab.py
node --check spartanai-recreation/dist/motion-lab/motion.js
```

The generator reads `dist/index.html`, preserves its media paths and writes only
the motion-lab directory. CSS/JS content hashes invalidate cached preview assets.
The generated files are committed so Render requires no Python build step.

Technical references consulted:

- https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API
- https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
- https://gsap.com/docs/v3/Plugins/ScrollTrigger/

GSAP informed the scroll-animation research; the prototype itself uses native
Web Animations API, IntersectionObserver and CSS transitions with no new npm dependency.
