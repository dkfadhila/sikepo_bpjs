import fs from 'node:fs/promises';
import {finalizePresentation} from 'file:///C:/Users/Administrator/.codex/plugins/cache/openai-primary-runtime/presentations/26.1026.10807/skills/presentations/container_tools/artifact_tool_utils.mjs';
const root='C:/Users/Administrator/Documents/ChatGPT/Sikepo';
const skill='C:/Users/Administrator/.codex/plugins/cache/openai-primary-runtime/presentations/26.1026.10807/skills/presentations';
const result=await finalizePresentation({
 workspaceDir:root,candidatePath:root+'/artifacts/pptx-build/candidate-v2.pptx',finalPath:root+'/deliverables/SIKEPO-presentasi-demo-fullscreen.pptx',
 pythonExecutable:'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
 integrityValidatorPath:skill+'/container_tools/inspect_presentation_package_integrity.py',
 layoutValidatorPath:skill+'/container_tools/inspect_presentation_layout_geometry.py',
 layoutArgs:['--expected-slide-size-emu','18288000,10287000'],
 explicitTotalSlideCount:12,requiredNativeTableOwnerSlides:[],verifyArtifactToolImport:true,
 receiptPath:root+'/artifacts/pptx-build/validation-v4.json'
});
console.log(JSON.stringify(result));

