"""Reproducible local edit of Decka's OBS recording; no generated UI or results."""
import json, subprocess, shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'artifacts/demo-edit/render'
WORK.mkdir(parents=True, exist_ok=True)
SOURCE = Path(r'C:\Users\Administrator\Videos\2026-10-30 22-21-20.mp4')
OUTPUT = Path(r'C:\Users\Administrator\Videos\SIKEPO-demo-presentasi.mp4')
FONT = r'C:\Windows\Fonts\arial.ttf'
BOLD = r'C:\Windows\Fonts\arialbd.ttf'
# start, end, speed, framing, title, explanation
SCENES = [
 (10,16,1,'wide','Ringkasan pemeriksaan','Antrean klaim dan prioritas risiko dalam satu workspace.'),
 (16,22,1,'wide','Alur pemeriksaan','Aturan, deteksi anomali, lalu penjelasan NALAR.'),
 (22,48,1.2,'form','Masukkan\ndata klaim','Biaya, tarif acuan, durasi rawat, serta bukti layanan.\n\nSeluruh masukan pada rekaman ini adalah data sintetis.'),
 (48,56,1,'form','Kirim dan\nperiksa','Pengajuan tersimpan. Aturan dan ML diperiksa; NALAR diproses melalui antrean.'),
 (60,81,1,'modal','Telusuri\ntemuan NALAR','Rasio biaya 2,50× acuan.\n\nSistem menandai selisih tagihan dan pola anomali untuk diperiksa.'),
 (81,99,1,'modal','Keputusan\nverifikator','Petugas memilih status dan mencatat alasan.\n\nSinyal anomali bukan bukti fraud. NALAR tidak menetapkan penolakan otomatis.'),
 (99,101,1,'wide','Status tersimpan','Hasil review dicatat dan dapat ditelusuri kembali pada antrean klaim.'),
]

def font(size, bold=False): return ImageFont.truetype(BOLD if bold else FONT,size)
def wrapped(draw, text, size, maxwidth, bold=False):
 lines=[]
 for paragraph in text.split('\n'):
  line=''
  for word in paragraph.split():
   candidate=(line+' '+word).strip()
   if draw.textlength(candidate,font=font(size,bold))>maxwidth and line:
    lines.append(line); line=word
   else: line=candidate
  lines.append(line)
 return '\n'.join(lines)

manifest=[]
for i,(start,end,speed,mode,title,body) in enumerate(SCENES):
 duration=(end-start)/speed
 plate=Image.new('RGBA',(1920,1080),(240,240,238,255)); d=ImageDraw.Draw(plate)
 d.text((70,42),'SIKEPO  /  DEMONSTRASI APLIKASI',font=font(27,True),fill='#206b4a')
 d.text((1710,44),f'{i+1:02d} / 07',font=font(25),fill='#65716a')
 if mode=='wide':
  d.text((70,91),title,font=font(34,True),fill='#191b19')
  d.text((70,994),body,font=font(29),fill='#334a3c')
  x,y,w,h=160,150,1600,830; crop='1252:650:28:48'
 else:
  d.line((90,227,710,227),fill='#a7baab',width=2)
  d.multiline_text((90,285),title,font=font(67,True),fill='#191b19',spacing=10)
  d.multiline_text((90,510),wrapped(d,body,33,650),font=font(33),fill='#47594d',spacing=15)
  d.rounded_rectangle((90,905,645,961),radius=16,fill='#dce7dd')
  d.text((110,918),'KLAIM SINTETIS  ·  2019–2025',font=font(23,True),fill='#206b4a')
  if mode=='form': x,y,w,h=825,142,1003,900; crop='680:610:540:60'
  else: x,y,w,h=1080,142,635,900; crop='435:617:435:63'
 # Transparent viewport so the actual OBS footage appears in this slot.
 d.rectangle((x,y,x+w-1,y+h-1),fill=(0,0,0,0))
 platepath=WORK/f'plate-{i}.png'; plate.save(platepath)
 out=WORK/f'scene-{i}.mp4'
 filters=f'[0:v]setpts=(PTS-STARTPTS)/{speed},crop={crop},scale={w}:{h}:flags=lanczos,setsar=1,fps=30[v];[1:v][v]overlay={x}:{y}:shortest=1,format=yuv420p[out]'
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-ss',str(start),'-t',str(end-start),'-i',str(SOURCE),'-loop','1','-i',str(platepath),'-filter_complex',filters,'-map','[out]','-t',str(duration),'-an','-r','30','-video_track_timescale','90000','-c:v','libx264','-preset','fast','-crf','18','-y',str(out)],check=True)
 manifest.append({'sourceStart':start,'sourceEnd':end,'speed':speed,'framing':mode,'duration':duration,'title':title,'caption':body})
 print(f'Scene {i+1} ready',flush=True)

# Designed closing card, with no unrecorded outcome claims.
plate=Image.new('RGB',(1920,1080),'#181c19'); d=ImageDraw.Draw(plate)
d.text((110,180),'SIKEPO',font=font(44,True),fill='#acd0b8')
d.multiline_text((110,330),'Temuan terjelaskan.\nKeputusan oleh verifikator.',font=font(82,True),fill='#ffffff',spacing=22)
d.text((110,720),'Demonstrasi menggunakan data sintetis.',font=font(34),fill='#b9cfc0')
d.text((110,895),'sikepo.tech',font=font(36),fill='#ffffff')
plate.save(WORK/'close.png')
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-loop','1','-i',str(WORK/'close.png'),'-t','4','-r','30','-video_track_timescale','90000','-vf','format=yuv420p','-c:v','libx264','-preset','fast','-crf','18','-y',str(WORK/'scene-7.mp4')],check=True)
(WORK/'concat.txt').write_text(''.join("file '"+str(WORK/f'scene-{i}.mp4').replace('\\','/')+"'\n" for i in range(8)))
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(WORK/'concat.txt'),'-c','copy','-movflags','+faststart','-y',str(OUTPUT)],check=True)
(ROOT/'videos/sikepo-demo/edit-manifest.json').write_text(json.dumps({'source':SOURCE.name,'output':OUTPUT.name,'audio':'Silent; explanatory on-screen captions for live presentation','scenes':manifest,'closingSeconds':4},ensure_ascii=False,indent=2),encoding='utf8')
print(str(OUTPUT),flush=True)
