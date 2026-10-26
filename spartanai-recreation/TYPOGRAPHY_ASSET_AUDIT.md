# Landing typography and asset audit

Reference: https://spartanai.framer.website/

- Reference typefaces and responsive type presets retained: Inter Display headings, Inter body, Geist Mono technical labels.
- Desktop hero measured at 70px, same as reference. Template CSS retains 56px tablet and 45px mobile presets. Hero text area widened for Indonesian copy; no character-by-character breaking.
- Shortened translated marquee labels while retaining the reference's 200px desktop type scale.
- Replaced ticker capsules, section-header capsules, testimonial marks, process marks, navbar mark, and footer mark with supplied SIKEPO symbols.
- Reference project photographs were opacity:0 in the resting variant; now visible without hover. Original image files retained.
- All local bitmap files decode successfully; HTML local asset references resolve on disk.
- Browser desktop checks found no failed loaded images, JavaScript errors, or horizontal document overflow, including after scrolling lower sections.
- After the browser viewport settled, the narrow layout at 759px measured the expected 45px hero preset, with no horizontal document overflow and no failed loaded images. A 390px phone-specific visual check remains incomplete.
