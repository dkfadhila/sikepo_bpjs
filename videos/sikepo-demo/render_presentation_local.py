"""Resumable FFmpeg export of the reviewed HyperFrames layout."""
from pathlib import Path
import subprocess,json
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[2]
PROJECT=ROOT/'videos/sikepo-demo/presentation-film'
WORK=ROOT/'artifacts/demo-edit/presentation-local'
WORK.mkdir(exist_ok=True)
DEST=Path.home()/'Videos/SIKEPO-Presenter'
timing=json.loads((ROOT/'videos/sikepo-demo/narration/timing.json').read_text())
titles=['Perkenalan','Ide & tujuan','Latar belakang','Pipeline A1 / A2 / A3','Demo aplikasi','Fitur aplikasi','ML & NALAR','Hasil pengujian','Studi kasus','Penutup']
font=lambda n:ImageFont.truetype('C:/Windows/Fonts/arial.ttf',n)
mask=Image.new('L',(192,108),0);ImageDraw.Draw(mask).rounded_rectangle((0,0,191,107),radius=10,fill=255);mask.save(WORK/'mask.png')
border=Image.new('RGBA',(192,108),(0,0,0,0));ImageDraw.Draw(border).rounded_rectangle((1,1,190,106),radius=10,outline='#f3f4ef',width=2);border.save(WORK/'border.png')
files=[]
for item,title in zip(timing['slides'],titles):
 n=item['page'];start=item['startSeconds'];dur=item['endSeconds']-start
 out=WORK/f'{n:02}.mp4';files.append(out)
 if out.exists() and out.stat().st_size>10000:continue
 bg=Image.new('RGB',(1280,720),'#141b16');d=ImageDraw.Draw(bg)
 if n!=5:
  slide=Image.open(PROJECT/'assets'/f'slide-{n:02}.png').convert('RGB').resize((1040,585),Image.Resampling.LANCZOS)
  sm=Image.new('L',slide.size,0);ImageDraw.Draw(sm).rounded_rectangle((0,0,1039,584),radius=12,fill=255)
  bg.paste(slide,(16,42),sm)
 logo=Image.open(PROJECT/'assets/logo.png').convert('RGBA').resize((28,28))
 bg.paste(logo,(1072,44),logo);d.text((1109,45),'SIKEPO',font=font(23),fill='#f0f0ee')
 d.text((1072,123),f'{n:02} / 10',font=font(13),fill='#adc5b5')
 words=title.split();lines=[];line=''
 for word in words:
  test=(line+' '+word).strip()
  if d.textlength(test,font=font(19))>184:lines.append(line);line=word
  else:line=test
 lines.append(line)
 d.multiline_text((1072,157),'\n'.join(lines),font=font(19),fill='#f0f0ee',spacing=7)
 d.text((1072,652),'Decka Fadhila Tirta',font=font(13),fill='#d3dfd6')
 d.text((16,668),'Coba namanya ini aja · SiKePo: investigasi kelayakan klaim dan pola overbilling berbasis AI',font=font(12),fill='#a9bdb0')
 d.line((16,648,1056,648),fill='#3d5445',width=2)
 bg.save(WORK/f'{n:02}.png')
 cmd=['ffmpeg','-hide_banner','-loglevel','error','-threads','2','-loop','1','-framerate','30','-i',str(WORK/f'{n:02}.png'),'-ss',str(start),'-i',str(DEST/'SIKEPO-presenter-full-720p.mp4'),'-loop','1','-i',str(WORK/'mask.png'),'-loop','1','-i',str(WORK/'border.png')]
 chain='[1:v]scale=192:108,setsar=1,format=rgba[face];[face][2:v]alphamerge[rounded];[0:v][rounded]overlay=1072:529:shortest=1[base];[base][3:v]overlay=1072:529:shortest=1[framed]'
 last='framed'
 if n==5:
  cmd+=['-i',str(PROJECT/'assets/demo.mp4')]
  chain+=';[4:v]scale=1040:585,setsar=1[demo];[framed][demo]overlay=16:42:shortest=1[withdemo]';last='withdemo'
 chain+=f';[{last}]drawbox=x=16:y=647:w=1040:h=2:color=0x87b99a:t=fill:enable=0[out]'
 cmd+=['-filter_complex_threads','1','-filter_complex',chain,'-map','[out]','-an','-t',str(dur),'-r','30','-c:v','libx264','-preset','veryfast','-crf','19','-threads','2','-pix_fmt','yuv420p','-y',str(out)]
 print(f'Rendering slide {n}/10 ({dur:.1f}s)',flush=True)
 subprocess.run(cmd,check=True)
concat=WORK/'concat.txt';concat.write_text(''.join("file '"+f.as_posix()+"'\n" for f in files))
out=DEST/'SIKEPO-presentasi-lengkap-720p.mp4'
subprocess.run(['ffmpeg','-v','error','-f','concat','-safe','0','-i',str(concat),'-i',str(ROOT/'artifacts/demo-edit/fabric-production/continuous-narration.m4a'),'-map','0:v','-map','1:a','-c','copy','-t',str(timing['totalSeconds']),'-movflags','+faststart','-y',str(out)],check=True)
print(out,flush=True)
