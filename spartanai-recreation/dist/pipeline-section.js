/* No runtime dependencies. Native details remains keyboard accessible after insertion. */
(() => {
  'use strict';
  window.mountSikepoPipeline = function mountSikepoPipeline(root = document) {
    const section = root.querySelector ? root.querySelector('#pipeline') : null;
    if (!section || section.dataset.pipelineMounted) return;
    section.dataset.pipelineMounted = 'true';
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.mountSikepoPipeline(), { once: true });
  } else window.mountSikepoPipeline();
})();
