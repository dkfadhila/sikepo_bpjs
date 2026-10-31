"""Reuse verified four-frame joins, isolated from the first delivery."""
from pathlib import Path
source=Path(__file__).with_name('assemble_presenter.py')
code=source.read_text(encoding='utf8').replace("'artifacts/demo-edit/fabric-production'","'artifacts/demo-edit/fabric-production-v3'").replace("'videos/sikepo-demo/presenter/render-plan.json'","'videos/sikepo-demo/presenter/render-plan-v3.json'").replace("'videos/sikepo-demo/presenter/final'","'videos/sikepo-demo/presenter/final-v3'").replace("'videos/sikepo-demo/narration'","'videos/sikepo-demo/narration-v3'")
exec(compile(code,str(source),'exec'))
