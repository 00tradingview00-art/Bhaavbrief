#!/usr/bin/env node
/** Generate the next demand-led V3 explainer and expose its path to Actions. */
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
const queue = JSON.parse(readFileSync(join(ROOT, 'data/reel-v3-evergreen-queue.json'), 'utf8')).reels
const statePath = join(ROOT, 'data/reel-v3-evergreen-state.json')
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { next: 0, published: [] }
const reel = queue[state.next % queue.length]
const W = 1080, H = 1920, FPS = 24, DURATION = 15
const outDir = join(ROOT, 'public/reels/v3'); mkdirSync(outDir, { recursive: true })
const out = join(outDir, `${reel.id}.mp4`); const caption = out.replace(/\.mp4$/, '.txt')
const asset = join(outDir, 'assets/bhaavbrief-presenter-v1.png')
if (!existsSync(asset)) throw new Error('V3 presenter asset missing')
const frames = mkdtempSync(join(tmpdir(), 'bb-v3-evergreen-')); const voice = join(frames, 'voice.mp3'); const image = await loadImage(asset)
const ease = t => { t = Math.max(0, Math.min(1, t)); return t*t*(3-2*t) }
const show = (t, start, end) => ease(Math.min((t-start)/.25, (end-t)/.25, 1))
function box(c,x,y,w,h,fill,stroke='#ffffff2e') { c.beginPath(); c.roundRect(x,y,w,h,28); c.fillStyle=fill; c.fill(); c.strokeStyle=stroke; c.lineWidth=2; c.stroke() }
function txt(c,s,x,y,size,color='#F8F5EE',weight=700,align='center') { c.font=`${weight} ${size}px Inter, Arial`; c.fillStyle=color; c.textAlign=align; c.fillText(s,x,y) }
function arrow(c,x1,y1,x2,y2) { c.strokeStyle='#EAB64E'; c.lineWidth=7; c.lineCap='round'; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke(); c.fillStyle='#EAB64E'; c.beginPath(); c.moveTo(x2,y2); c.lineTo(x2-15,y2-23); c.lineTo(x2+15,y2-23); c.closePath(); c.fill() }
try {
  for (let i=0;i<FPS*DURATION;i++) {
    const t=i/FPS, c=createCanvas(W,H), x=c.getContext('2d'); x.drawImage(image,0,0,W,H)
    x.fillStyle='rgba(5,8,12,.65)'; x.fillRect(0,760,W,1160); txt(x,'BHAAVBRIEF',72,94,26,'#F8F5EE',800,'left'); x.fillStyle='#D79A35'; x.fillRect(72,112,124,5)
    box(x,710,58,300,52,'rgba(10,13,17,.64)'); txt(x,'MARKETS, EXPLAINED',860,92,17,'#F8F5EE',700)
    if (t<3.4) { x.globalAlpha=show(t,0,3.4); box(x,70,920,940,285,'rgba(8,11,15,.92)'); txt(x,reel.hook,540,1032,48,'#F0B44C',800); txt(x,reel.hook_detail,540,1100,25,'#D7D1C7',500); x.globalAlpha=1 }
    if (t>=3 && t<11) { x.globalAlpha=show(t,3,11); txt(x,'THE MISSING MECHANISM',540,925,28,'#F8F5EE',800); reel.steps.forEach((s,n)=>{ const px=75+n*330; box(x,px,1010,270,110,n===1?'#F2CA67':'#F8F5EE'); txt(x,s,px+135,1075,24,n===1?'#29251D':'#29251D',800); if(n<2) arrow(x,px+276,1065,px+319,1065) }); box(x,90,1240,900,130,'rgba(8,11,15,.92)','#EAB64E88'); txt(x,reel.mechanism,540,1317,24,'#F8F5EE',600); x.globalAlpha=1 }
    if (t>=10.5) { x.globalAlpha=show(t,10.5,15); box(x,70,1450,940,210,'rgba(8,11,15,.94)','#EAB64E88'); txt(x,reel.conclusion.toUpperCase(),540,1535,37,'#F0B44C',800); txt(x,'Save this before the next price comparison.',540,1590,20,'#D7D1C7',500); x.globalAlpha=1 }
    box(x,72,1812,500,42,'rgba(8,11,15,.82)'); txt(x,`SOURCE: ${reel.source}`,94,1840,16,'#D7D1C7',700,'left'); txt(x,'Educational, not investment advice.',1008,1840,16,'#D7D1C7',500,'right')
    writeFileSync(join(frames,`f-${String(i).padStart(4,'0')}.jpg`),c.toBuffer('image/jpeg',88))
  }
  execFileSync('python3',['-m','edge_tts','--voice','en-IN-NeerjaNeural','--text',reel.voiceover,'--write-media',voice])
  execFileSync('ffmpeg',['-y','-loglevel','error','-framerate',String(FPS),'-i',join(frames,'f-%04d.jpg'),'-stream_loop','-1','-i',join(ROOT,'public/reels/music/calm.mp3'),'-i',voice,'-filter_complex',`[1:a]atrim=0:${DURATION},volume=.10,afade=t=out:st=12.5:d=2.5[bed];[2:a]volume=1[narration];[bed][narration]amix=inputs=2:duration=first:normalize=0[a]`,'-map','0:v:0','-map','[a]','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest','-movflags','+faststart',out])
  writeFileSync(caption,`${reel.caption}\n\nSource: ${reel.source}. Educational content only, not investment advice.`, 'utf8')
  state.next += 1; state.published = [...state.published, { id: reel.id, generated_at: new Date().toISOString() }].slice(-30); writeFileSync(statePath,JSON.stringify(state,null,2))
  if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT,`reel_file=public/reels/v3/${reel.id}.mp4\n`,{flag:'a'})
  console.log(`Generated V3 evergreen reel: ${out}`)
} finally { rmSync(frames,{recursive:true,force:true}) }
