"""Export latest twelve-slide composition using the original delivery layout."""
from pathlib import Path
source=Path(__file__).with_name('render_presentation_local.py')
code=source.read_text(encoding='utf8')
code=code.replace("'artifacts/demo-edit/presentation-final-v3'","'artifacts/demo-edit/presentation-final-v4'")
code=code.replace("'Videos/SIKEPO-Presenter'","'Videos/SIKEPO-Presenter-v3'")
code=code.replace("timing=json.loads((ROOT/'videos/sikepo-demo/narration/timing.json').read_text())","timing=json.loads((ROOT/'videos/sikepo-demo/narration-v3/slide-timing.json').read_text());timing['slides']=[dict(x,page=x['slide'],startSeconds=x['start'],endSeconds=x['end']) for x in timing['slides']]")
code=code.replace("titles=['Perkenalan','Ide & tujuan','Latar belakang','Pipeline A1 / A2 / A3','Demo aplikasi','Fitur aplikasi','ML & NALAR','Hasil pengujian','Studi kasus','Penutup']","titles=['Perkenalan','Ide & tujuan','Latar belakang','Pipeline A1 & A2','Pipeline A3 / NALAR','Demo aplikasi','Fitur aplikasi','Pelatihan ML','Pelatihan NALAR','Hasil pengujian','Studi kasus','Penutup']")
code=code.replace('n!=5','n!=6').replace('n==5','n==6').replace('/10','/12').replace('/ 10','/ 12')
code=code.replace("PROJECT/'assets'/f'slide-","PROJECT/'assets-v2'/f'slide-")
code=code.replace("ROOT/'artifacts/demo-edit/fabric-production/continuous-narration.m4a'","ROOT/'videos/sikepo-demo/narration-v3/SIKEPO-narasi-lengkap.mp3'")
code=code.replace("'SIKEPO-presentasi-lengkap-720p.mp4'","'SIKEPO-presentasi-final-720p.mp4'")
code=code.replace("'-c','copy'","'-c:v','copy','-c:a','aac','-b:a','192k'")
exec(compile(code,str(source),'exec'))
