"""Local, offline speech transcription for narration QA; never sends audio externally."""
import json,sys,time
from pathlib import Path
from faster_whisper import WhisperModel

folder=Path(__file__).parent
report=folder.parents[2]/'artifacts/demo-edit/narration-audit'
report.mkdir(parents=True,exist_ok=True)
model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=8,local_files_only=True)
for name in sys.argv[1:] or ['01-pre-demo.mp3','02-demo-source.mp3','03-after-demo.mp3']:
 path=folder/name
 if not path.exists(): continue
 started=time.time()
 segments,info=model.transcribe(str(path),language='id',beam_size=3,word_timestamps=True,vad_filter=True)
 rows=[]
 for seg in segments:
  rows.append({'start':seg.start,'end':seg.end,'text':seg.text,'words':[{'word':w.word,'start':w.start,'end':w.end} for w in seg.words or []]})
 output={'file':name,'duration':info.duration,'language':info.language,'segments':rows,'elapsedSeconds':round(time.time()-started,2),'note':'Automatic transcript for content/timing QA; does not establish naturalness by listening.'}
 (report/(path.stem+'.json')).write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf8')
 print(name,'transcribed',len(rows),'segments',flush=True)
