"""Apply the existing decoder, audio-continuity and chapter audit to delivery v3."""
from pathlib import Path
source=Path(__file__).with_name('audit_presentation_film.py')
code=source.read_text(encoding='utf8')
code=code.replace("'Videos/SIKEPO-Presenter'","'Videos/SIKEPO-Presenter-v3'")
code=code.replace("'SIKEPO-presentasi-lengkap-720p.mp4'","'SIKEPO-presentasi-final-720p.mp4'")
code=code.replace("'artifacts/demo-edit/presentation-film-audit'","'artifacts/demo-edit/presentation-film-audit-v3'")
code=code.replace("timing=json.loads((ROOT/'videos/sikepo-demo/narration/timing.json').read_text())","timing=json.loads((ROOT/'videos/sikepo-demo/narration-v3/slide-timing.json').read_text());timing['slides']=[dict(x,page=x['slide'],startSeconds=x['start'],endSeconds=x['end']) for x in timing['slides']]")
code=code.replace("ROOT/'videos/sikepo-demo/narration'","ROOT/'videos/sikepo-demo/narration-v3'")
code=code.replace("titles=['Perkenalan','Ide dan tujuan','Latar belakang','Pipeline A1 A2 A3','Demo aplikasi','Fitur aplikasi','ML dan NALAR','Hasil pengujian','Studi kasus','Penutup']","titles=['Perkenalan','Ide dan tujuan','Latar belakang','Pipeline A1 dan A2','Pipeline A3 NALAR','Demo aplikasi','Fitur aplikasi','Pelatihan ML','Pelatihan NALAR','Hasil pengujian','Studi kasus','Penutup']")
code=code.replace('(1280,1950)','(1280,2340)').replace("'chapters':10","'chapters':12").replace("'delivery-audit.json'","'delivery-audit-v3.json'")
exec(compile(code,str(source),'exec'))
