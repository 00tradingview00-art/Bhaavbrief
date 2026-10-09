#!/usr/bin/env node
/** Generate the next demand-led V3 explainer and expose its path to Actions. */
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { validateReelV3 } from './lib/reelV3Compliance.mjs'
import { visualPlanFor } from './lib/reelV3VisualPlan.mjs'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
const queue = JSON.parse(readFileSync(join(ROOT, 'data/reel-v3-editorial-slate.json'), 'utf8')).reels
const statePath = process.env.V3_STATE_PATH ? resolve(process.env.V3_STATE_PATH) : join(ROOT, 'data/reel-v3-evergreen-state.json')
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { next: 0, published: [] }
const reel = queue[state.next % queue.length]
const plan = visualPlanFor(reel)
const issues = validateReelV3(reel)
if (issues.length) throw new Error(`V3 release blocked for ${reel.id}:\n${issues.map(issue => `- ${issue}`).join('\n')}`)
const W = 1080, H = 1920, FPS = 24, DURATION = 15
// Review renders can be isolated from the publishing directory and queue state.
const outDir = process.env.V3_OUTPUT_DIR ? resolve(process.env.V3_OUTPUT_DIR) : join(ROOT, 'public/reels/v3'); mkdirSync(outDir, { recursive: true })
const out = join(outDir, `${reel.id}.mp4`); const caption = out.replace(/\.mp4$/, '.txt')
const asset = join(ROOT, 'public/reels/v3/assets/bhaavbrief-presenter-v1.png')
if (!existsSync(asset)) throw new Error('V3 presenter asset missing')
const frames = mkdtempSync(join(tmpdir(), 'bb-v3-evergreen-')); const voice = join(frames, 'voice.mp3'); const image = await loadImage(asset)
const ease = t => { t = Math.max(0, Math.min(1, t)); return t*t*(3-2*t) }
const show = (t, start, end) => ease(Math.min((t-start)/.25, (end-t)/.25, 1))
function box(c,x,y,w,h,fill,stroke='#ffffff2e') { c.beginPath(); c.roundRect(x,y,w,h,28); c.fillStyle=fill; c.fill(); c.strokeStyle=stroke; c.lineWidth=2; c.stroke() }
function txt(c,s,x,y,size,color='#F8F5EE',weight=700,align='center') { c.font=`${weight} ${size}px Inter, Arial`; c.fillStyle=color; c.textAlign=align; c.fillText(s,x,y) }
function wrapTxt(c,s,x,y,maxWidth,size,color='#F8F5EE',weight=700,lineHeight=Math.round(size*1.2)) { c.font=`${weight} ${size}px Inter, Arial`; const lines=[]; let line=''; for (const word of s.split(/\s+/)) { const candidate=line?`${line} ${word}`:word; if (c.measureText(candidate).width>maxWidth && line) { lines.push(line); line=word } else line=candidate } if(line) lines.push(line); const first=y-(lines.length-1)*lineHeight/2; lines.forEach((line,index)=>txt(c,line,x,first+index*lineHeight,size,color,weight)); return lines.length }
function arrow(c,x1,y1,x2,y2) { c.strokeStyle='#EAB64E'; c.lineWidth=7; c.lineCap='round'; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke(); c.fillStyle='#EAB64E'; c.beginPath(); c.moveTo(x2,y2); c.lineTo(x2-15,y2-23); c.lineTo(x2+15,y2-23); c.closePath(); c.fill() }
function label(c, value, x, y, w=230, active=false) { box(c,x,y,w,72,active?'#EAB64E':'#F8F5EE'); txt(c,value,x+w/2,y+46,20,active?'#29251D':'#29251D',800) }
function drawVisual(c, plan, reel, t) {
  const [a,b,d] = plan.labels
  const progress = Math.max(0, Math.min(1, (t-3)/7.5))
  txt(c, plan.mode.toUpperCase(), 540, 905, 22, '#F0B44C', 800)
  if (plan.mode === 'comparison') {
    label(c,a,105,1010,360); label(c,d,615,1010,360); arrow(c,485,1046,595,1046); box(c,240,1165,600,104,'rgba(8,11,15,.92)','#EAB64E88'); txt(c,b,540,1228,27,'#F8F5EE',800)
  } else if (plan.mode === 'contract') {
    box(c,150,990,780,350,'rgba(8,11,15,.92)','#EAB64E'); txt(c,'CONTRACT CARD',540,1050,22,'#F0B44C',800); [a,b,d].forEach((v,n)=>{ txt(c,`${String(n+1).padStart(2,'0')}  ${v}`,225,1135+n*66,28,'#F8F5EE',700,'left'); if(n<2){ c.strokeStyle='#ffffff35'; c.lineWidth=2; c.beginPath(); c.moveTo(220,1160+n*66); c.lineTo(860,1160+n*66); c.stroke() } })
  } else if (plan.mode === 'options') {
    [a,b,d].forEach((v,n)=>{ const cx=250+n*290, cy=1145, r=94; c.strokeStyle=n===1?'#EAB64E':'#F8F5EE'; c.lineWidth=12; c.beginPath(); c.arc(cx,cy,r,-Math.PI*.75,Math.PI*(.15+.35*progress)); c.stroke(); txt(c,v,cx,1300,19,'#F8F5EE',800) }); txt(c,'ONE PREMIUM • MULTIPLE DRIVERS',540,1420,22,'#D7D1C7',600)
  } else if (plan.mode === 'session') {
    c.strokeStyle='#F8F5EE'; c.lineWidth=5; c.beginPath(); c.moveTo(130,1160); c.lineTo(950,1160); c.stroke(); [a,b,d].forEach((v,n)=>{ const px=190+n*340; c.fillStyle=n===1?'#EAB64E':'#F8F5EE'; c.beginPath(); c.arc(px,1160,19,0,Math.PI*2); c.fill(); txt(c,v,px,1240,20,'#F8F5EE',800) }); txt(c,'THE MARKET CLOCK CHANGES THE INPUTS',540,1365,21,'#D7D1C7',600)
  } else if (plan.mode === 'transmission') {
    [a,b,d].forEach((v,n)=>{ const y=990+n*135; label(c,v,310,y,460,n===1); if(n<2) arrow(c,540,y+75,540,y+118) })
  } else {
    [[a,195],[b,540],[d,885]].forEach(([v,cx],n)=>{ box(c,cx-120,1060,240,120,n===1?'#EAB64E':'#F8F5EE'); txt(c,v,cx,1133,22,'#29251D',800); if(n<2) arrow(c,cx+130,1120,cx+205,1120) })
  }
  // Mechanism sentences run 14–20 words, so this must wrap — a single-line
  // txt() ran off both edges of the frame. Only visible once drawVisual was
  // reachable again, which is why it survived unnoticed.
  box(c,90,1468,900,152,'rgba(8,11,15,.92)','#EAB64E88'); wrapTxt(c,reel.mechanism,540,1544,830,22,'#F8F5EE',600,29)
}
try {
  for (let i=0;i<FPS*DURATION;i++) {
    const t=i/FPS, c=createCanvas(W,H), x=c.getContext('2d'); x.fillStyle='#080B10'; x.fillRect(0,0,W,H)
    // A presenter anchors the opening only. The explanation itself takes over
    // as a full-screen motion graphic instead of leaving a talking head behind.
    if (t < 3.2) { x.drawImage(image,-18,0,W+36,940); const shade=x.createLinearGradient(0,0,0,1000); shade.addColorStop(0,'rgba(5,8,12,.12)'); shade.addColorStop(1,'rgba(5,8,12,.9)'); x.fillStyle=shade; x.fillRect(0,0,W,1040) }
    else { const g=x.createLinearGradient(0,0,W,H); g.addColorStop(0,'#111a27'); g.addColorStop(.55,'#080B10'); g.addColorStop(1,'#17120a'); x.fillStyle=g; x.fillRect(0,0,W,H); x.strokeStyle='rgba(234,182,78,.10)'; x.lineWidth=2; for(let y=220;y<1650;y+=112){x.beginPath();x.moveTo(70,y);x.lineTo(1010,y-55);x.stroke()} }
    txt(x,'BHAAVBRIEF',72,94,26,'#F8F5EE',800,'left'); x.fillStyle='#D79A35'; x.fillRect(72,112,124,5)
    box(x,710,58,300,52,'rgba(10,13,17,.64)'); txt(x,'MARKETS, EXPLAINED',860,92,17,'#F8F5EE',700)
    // THE TENSION — the only stage that gets a text panel, because the hook is
    // a claim rather than a mechanism. Everything after it is explained by the
    // mode-specific motion graphic, not by another card.
    if (t<3.2) { x.globalAlpha=show(t,0,3.2); box(x,70,920,940,285,'rgba(8,11,15,.92)','#ffffff38'); x.fillStyle='#F0B44C22'; x.fillRect(70,920,10,285); txt(x,'THE TENSION',540,975,18,'#F0B44C',800); wrapTxt(x,reel.hook,540,1065,820,44,'#F8F5EE',800,52); txt(x,reel.hook_detail,540,1160,24,'#D7D1C7',500); x.globalAlpha=1 }
    // THE MECHANISM — drawVisual picks the grammar from reel.visual_mode, so a
    // comparison, a contract card, an options driver, a session clock and a
    // transmission chain each move differently. Its internal easing is keyed to
    // a start at t=3, so this window must not move without updating it.
    if (t>=3 && t<10.8) { x.globalAlpha=show(t,3,10.8); drawVisual(x,plan,reel,t); x.globalAlpha=1 }
    // WHO IS EXPOSED — one line riding above the visual, so the stakes arrive
    // with the explanation instead of interrupting it with a card of their own.
    if (t>=3.6 && t<10.8) { x.globalAlpha=show(t,3.6,10.8)*.95; wrapTxt(x,reel.stakes,540,700,860,25,'#D7D1C7',500,33); x.globalAlpha=1 }
    // CHECK THIS NEXT — conclusion, the decision-check, and the boundary, which
    // the compliance module requires on every entry but nothing used to render.
    if (t>=10.4) { x.globalAlpha=show(t,10.4,15); box(x,70,1398,940,232,'rgba(8,11,15,.94)','#EAB64E88'); wrapTxt(x,reel.conclusion.toUpperCase(),540,1462,820,29,'#F0B44C',800,37); wrapTxt(x,reel.decision_check,540,1545,820,19,'#F8F5EE',500,25); txt(x,reel.boundary,540,1606,16,'#D7D1C7',500); x.globalAlpha=1 }
    box(x,72,1710,500,42,'rgba(8,11,15,.82)'); txt(x,`SOURCE: ${reel.source}`,94,1738,16,'#D7D1C7',700,'left'); txt(x,'Educational, not investment advice.',1008,1738,16,'#D7D1C7',500,'right')
    writeFileSync(join(frames,`f-${String(i).padStart(4,'0')}.jpg`),c.toBuffer('image/jpeg',88))
  }
  execFileSync('python3',['-m','edge_tts','--voice','en-IN-NeerjaNeural','--text',reel.voiceover,'--write-media',voice])
  execFileSync('ffmpeg',['-y','-loglevel','error','-framerate',String(FPS),'-i',join(frames,'f-%04d.jpg'),'-stream_loop','-1','-i',join(ROOT,'public/reels/music/calm.mp3'),'-i',voice,'-filter_complex',`[1:a]atrim=0:${DURATION},volume=.10,afade=t=out:st=12.5:d=2.5[bed];[2:a]volume=1[narration];[bed][narration]amix=inputs=2:duration=first:normalize=0[a]`,'-map','0:v:0','-map','[a]','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest','-movflags','+faststart',out])
  writeFileSync(caption,`${reel.caption}\n\nSource: ${reel.source}: ${reel.source_url}\nEducational content only, not investment advice.`, 'utf8')
  if (process.env.V3_DRY_RUN !== '1') {
    state.next += 1; state.published = [...state.published, { id: reel.id, generated_at: new Date().toISOString() }].slice(-30); writeFileSync(statePath,JSON.stringify(state,null,2))
  }
  if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT,`reel_file=public/reels/v3/${reel.id}.mp4\nreel_caption=public/reels/v3/${reel.id}.txt\n`,{flag:'a'})
  console.log(`Generated V3 evergreen reel: ${out}`)
} finally { rmSync(frames,{recursive:true,force:true}) }
