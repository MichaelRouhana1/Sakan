// Rebuild with Node and sharp available via NODE_PATH. No app files are touched.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const ROOT = __dirname;
const RED = '#EA3F4A', DARK = '#942A38', WHITE = '#FFFFFF';
const sizes = [16, 32, 64, 512];
const smallOnly = process.argv.includes('--small-only');
const marks = [];
const shape = (d, fill) => `<path fill="${fill}" d="${d}"/>`;
const svg = (body, title, size=256) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="${size}" height="${size}" role="img" aria-labelledby="title"><title id="title">Studently — ${title}</title>${body}</svg>\n`;
const atScale = (body, scale) => `<g transform="translate(128 128) scale(${scale}) translate(-128 -128)">${body}</g>`;

async function save(name, body, title, group='mark', tinyBody=null) {
  if(smallOnly && !name.startsWith('studently-small-')) {
    const source=await fs.readFile(path.join(ROOT,`${name}.svg`),'utf8');
    const raster={};
    for(const size of group==='app'?[...sizes,1024]:sizes)raster[size]=await fs.readFile(path.join(ROOT,'png',`${name}-${size}.png`));
    marks.push({name,title,source,raster,body,group});
    return;
  }
  const source = svg(body,title,group==='app'?1024:256);
  await fs.writeFile(path.join(ROOT, `${name}.svg`), source);
  const tinySource=tinyBody?svg(tinyBody,title+' — single window for 16px',16):null;
  if(tinySource)await fs.writeFile(path.join(ROOT,`${name}-16.svg`),tinySource);
  const raster = {};
  for (const size of group==='app' ? [...sizes,1024] : sizes) {
    let image = sharp(Buffer.from(size===16&&tinySource?tinySource:source),{density:Math.max(96,size/256*72)}).resize(size,size);
    if(name.includes('app-icon')||name.includes('android-background')) image=image.removeAlpha();
    const buffer = await image.png().toBuffer();
    await fs.writeFile(path.join(ROOT,'png',`${name}-${size}.png`),buffer);
    raster[size]=buffer;
  }
  marks.push({ name, title, source, raster, body, group });
}

async function main() {
  await fs.mkdir(path.join(ROOT,'png'),{recursive:true});
  await fs.mkdir(path.join(ROOT,'preview'),{recursive:true});
  const master = await fs.readFile(path.join(ROOT,'../student-home-pin/student-home-pin-red.svg'),'utf8');
  await fs.mkdir(path.join(ROOT,'source'),{recursive:true});
  if(!smallOnly)await fs.writeFile(path.join(ROOT,'source/master-original.svg'),master);
  const defs = master.match(/<defs>[\s\S]*?<\/defs>/)[0];
  const artwork = master.slice(master.indexOf('    <!-- Opaque'), master.lastIndexOf('  </g>')).replace(/<!--[\s\S]*?-->/g,'');
  // Uniform framing only: all full-mark contours and gradient coordinates are unchanged.
  const wrap = b => `<g transform="matrix(0.24 0 0 0.24 -27.52 -21.04)">${b}</g>`;
  const full = defs + wrap(artwork);
  // The existing pin and roof already describe their transparent openings. Omit only
  // the white backing and the duplicate swoosh; keep the four solid window panes.
  const paths = [...artwork.matchAll(/<path\s+fill="([^"]+)"\s+d="([^"]+)"\s*\/>/g)];
  const pin = paths.find(p=>p[1]==='url(#pin-red)')[2];
  const roof = paths.find(p=>p[1]==='url(#roof-red)')[2];
  const capGroup = artwork.match(/<g fill="#942A38">([\s\S]*?)<\/g>/)[1];
  const mono = color => wrap(shape(pin,color)+shape(roof,color)+`<g fill="${color}">${capGroup}</g>`);
  await save('studently-full-color',full,'full color, opaque white interior');
  await save('studently-full-color-tile-square',shape('M48 8H208Q248 8 248 48V208Q248 248 208 248H48Q8 248 8 208V48Q8 8 48 8Z',WHITE)+atScale(full,.76),'full color on white rounded square');
  await save('studently-full-color-tile-circle','<circle cx="128" cy="128" r="120" fill="#FFFFFF"/>'+atScale(full,.76),'full color on white circle');
  await save('studently-knockout-red',mono(RED),'red knockout, transparent interior and solid window panes');
  await save('studently-knockout-white',mono(WHITE),'white knockout, transparent interior and solid window panes');

  // Small-size cut derived from the same roof slopes, rounded roof ends and pointed pin.
  // Compact 50-unit window: about 43% of the circular interior width.
  const smallPin='M77 91L49 111C37 130 42 159 55 181C74 211 104 239 128 256C152 239 182 211 201 181C214 159 219 130 207 111L179 91C193 122 186 153 165 169C144 186 112 186 91 169C70 153 63 122 77 91Z';
  const smallRoof='M17 86L113 19Q128 8 143 19L239 86Q251 95 241 108Q233 118 222 110L138 52Q128 45 118 52L34 110Q23 118 15 108Q5 95 17 86Z';
  const smallWhite='M128 44L208 99L179 91C193 122 186 153 165 169C144 186 112 186 91 169C70 153 63 122 77 91L48 99Z';
  const panes = color=>`<g fill="${color}"><rect x="103" y="93" width="22" height="22" rx="2"/><rect x="131" y="93" width="22" height="22" rx="2"/><rect x="103" y="121" width="22" height="22" rx="2"/><rect x="131" y="121" width="22" height="22" rx="2"/></g>`;
  const tinyWindow = color=>`<rect x="103" y="93" width="50" height="50" rx="7" fill="${color}"/>`;
  const smallWrap = b=>`<g transform="matrix(0.92 0 0 0.92 10.24 0)">${b}</g>`;
  const colorBase=smallWrap(shape(smallWhite,WHITE)+shape(smallPin,RED)+shape(smallRoof,RED));
  const monoBase=color=>smallWrap(shape(smallPin,color)+shape(smallRoof,color));
  await save('studently-small-color',colorBase+panes(DARK),'small flat color, opaque white interior','mark',colorBase+tinyWindow(DARK));
  await save('studently-small-knockout-red',monoBase(RED)+panes(RED),'small red knockout','mark',monoBase(RED)+tinyWindow(RED));
  await save('studently-small-knockout-white',monoBase(WHITE)+panes(WHITE),'small white knockout','mark',monoBase(WHITE)+tinyWindow(WHITE));
  const bg=color=>`<path fill="${color}" d="M0 0H256V256H0Z"/>`;
  await save('studently-app-icon-white',bg(WHITE)+atScale(full,.82),'app icon, full color on white','app');
  await save('studently-app-icon-red',bg(RED)+atScale(mono(WHITE),.82),'app icon, white on brand red','app');
  await save('studently-android-foreground-color',atScale(full,.63),'Android adaptive foreground, full color','app');
  await save('studently-android-foreground-white',atScale(mono(WHITE),.63),'Android adaptive foreground, white','app');
  await save('studently-android-background-white',bg(WHITE),'Android adaptive background, white','app');
  await save('studently-android-background-red',bg(RED),'Android adaptive background, brand red','app');
  await previews();
  await pixelCheck();
  await validate();
  console.log(`Built ${marks.length} SVGs and PNG exports with background/size preview sheets.`);
}

async function previews() {
  const photoPath=path.join(ROOT,'preview/housing-photo.jpg');
  const photo=await sharp(photoPath).resize(1200,800,{fit:'cover'}).jpeg().toBuffer();
  const backgrounds=[['white','#FFFFFF'],['brand-red',RED],['near-black','#17171C'],['busy-photo',null]];
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Studently logo system</title><style>body{font:15px system-ui;margin:24px;background:#f3f3f3;color:#222}h1{font-size:26px}header{position:sticky;top:0;background:#f3f3f3;padding:12px 0;z-index:1}button{padding:8px 14px;margin-right:8px}table{border-collapse:collapse}th,td{padding:10px;border:1px solid #ddd;text-align:center}th:first-child,td:first-child{width:220px;text-align:left;background:#fff}img.logo{width:64px;height:64px;object-fit:contain}td.sample{min-width:180px;min-height:100px;background-size:cover;background-position:center}small{display:block;margin-top:6px;color:#666}</style><header><h1>Studently / logo system</h1><p>Full color = solid white interior. Knockout = transparent interior + solid window panes.</p><div>Actual output size: ${sizes.map(s=>`<button onclick="setSize(${s})">${s}px</button>`).join('')}</div><p>Use tiles on variable backgrounds; use the small mark below 64px. White-on-white and red-on-red are intentionally invalid combinations.</p></header><table><thead><tr><th>Variant</th>${backgrounds.map(([n])=>`<th>${n}</th>`).join('')}</tr></thead><tbody>${marks.map(m=>`<tr><td>${m.name}<small>${m.title}</small><a href="../${m.name}.svg">SVG</a></td>${backgrounds.map(([name,color])=>`<td class="sample" style="background:${color||`url(housing-photo.jpg)`}"><img class="logo" data-name="${m.name}" src="../png/${m.name}-64.png" alt="${m.title}"></td>`).join('')}</tr>`).join('')}</tbody></table><script>function setSize(s){document.querySelectorAll('img.logo').forEach(i=>{i.width=s;i.height=s;i.style.width=s+'px';i.style.height=s+'px';i.src='../png/'+i.dataset.name+'-'+s+'.png'})}</script></html>`;
  await fs.writeFile(path.join(ROOT,'preview/index.html'),html);
  // Raster overview: all variants × all four backgrounds; every small sample is actual size.
  const cellW=225,cellH=220,labelW=330,top=105,W=labelW+cellW*4,H=top+marks.length*cellH;
  const overlays=[];
  let labels=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#F3F3F3"/><g font-family="Arial" fill="#222"><text x="20" y="33" font-size="25" font-weight="bold">Studently — logo system</text><text x="20" y="58" font-size="14">All versions / four backgrounds · main samples 128px · size ladder 16 / 32 / 64px</text>`;
  backgrounds.forEach(([n],i)=>labels+=`<text x="${labelW+i*cellW+16}" y="90" font-size="16">${n}</text>`);
  for(let row=0;row<marks.length;row++) {
    const m=marks[row],y=top+row*cellH;
    const lines=m.name.replace('studently-','').split('-');
    labels+=`<text x="18" y="${y+38}" font-size="16" font-weight="bold">${lines.slice(0,3).join(' ')}</text><text x="18" y="${y+60}" font-size="14">${lines.slice(3).join(' ')}</text><text x="18" y="${y+90}" font-size="12">SVG + PNG: 16 / 32 / 64 / 512${m.group==='app'?' / 1024':''}</text>`;
    for(let col=0;col<4;col++) {
      const [_,color]=backgrounds[col],x=labelW+col*cellW;
      const tile=color?await sharp({create:{width:cellW-4,height:cellH-4,channels:3,background:color}}).png().toBuffer():await sharp(photo).resize(cellW-4,cellH-4,{fit:'cover'}).png().toBuffer();
      overlays.push({input:tile,left:x,top:y});
      const large=await sharp(Buffer.from(m.source),{density:144}).resize(128,128).png().toBuffer();
      overlays.push({input:large,left:x+48,top:y+8});
      let px=x+25;for(const s of [16,32,64]){overlays.push({input:m.raster[s],left:px,top:y+153+Math.round((64-s)/2)});px+=s+24;}
    }
  }
  labels+='</g></svg>';
  await sharp(Buffer.from(labels)).composite(overlays).png().toFile(path.join(ROOT,'preview/overview.png'));
  // Complete 512px inspections on every background, one standalone sheet per variant.
  for(const m of marks) {
    if(smallOnly&&!m.name.startsWith('studently-small-'))continue;
    const composites=[];
    for(let col=0;col<4;col++) {
      const color=backgrounds[col][1];
      const base=color?await sharp({create:{width:544,height:544,channels:3,background:color}}).png().toBuffer():await sharp(photo).resize(544,544,{fit:'cover'}).png().toBuffer();
      composites.push({input:base,left:col*544,top:48},{input:m.raster[512],left:col*544+16,top:64});
    }
    const head=`<svg xmlns="http://www.w3.org/2000/svg" width="2176" height="592"><rect width="100%" height="100%" fill="#F3F3F3"/><g font-family="Arial" font-size="18" fill="#222">${backgrounds.map(([n],i)=>`<text x="${i*544+16}" y="30">${m.name} / ${n} / 512px</text>`).join('')}</g></svg>`;
    await sharp(Buffer.from(head)).composite(composites).png().toFile(path.join(ROOT,'preview',`${m.name}-512-backgrounds.png`));
  }
  if(!smallOnly)await fs.writeFile(path.join(ROOT,'preview/PHOTO-SOURCE.txt'),'Housing photo for QA only: https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=85\nNot a shipped brand asset.\n');
}

async function pixelCheck() {
  const small=marks.filter(m=>m.name.startsWith('studently-small-'));
  const layers=[];
  for(let row=0;row<small.length;row++)for(let col=0;col<3;col++) {
    const size=sizes[col],buffer=await sharp(small[row].raster[size]).resize(160,160,{kernel:'nearest'}).png().toBuffer();
    layers.push({input:buffer,left:245+col*200,top:55+row*200});
  }
  const labels=`<svg xmlns="http://www.w3.org/2000/svg" width="865" height="660"><rect width="100%" height="100%" fill="#17171C"/><g fill="#fff" font-family="Arial" font-size="16">${[16,32,64].map((s,i)=>`<text x="${245+i*200}" y="27">${s}px / enlarged</text>`).join('')}${small.map((m,i)=>`<text x="16" y="${135+i*200}">${m.name.replace('studently-','')}</text>`).join('')}<text x="245" y="649">16px: one window · 32/64px: tight four-pane window</text></g></svg>`;
  await sharp(Buffer.from(labels)).composite(layers).png().toFile(path.join(ROOT,'preview/small-pixel-check.png'));
}

async function validate() {
  const report=[];
  for(const m of marks) {
    if(/<(text|image|mask|filter|clipPath)\b/.test(m.source))throw Error(`${m.name}: prohibited SVG element`);
    if(m.name.includes('knockout')&&(/linearGradient|#942A38/i.test(m.source)))throw Error(`${m.name}: not one color`);
    for(const size of sizes){const meta=await sharp(m.raster[size]).metadata();if(meta.width!==size||meta.height!==size)throw Error('Incorrect size');}
    report.push(`${m.name}: SVG structure and 16/32/64/512px exports OK`);
  }
  const sample=async(name,x,y)=>{const {data,info}=await sharp(marks.find(m=>m.name===name).raster[512]).ensureAlpha().raw().toBuffer({resolveWithObject:true});return [...data.subarray((y*info.width+x)*4,(y*info.width+x)*4+4)];};
  const white=await sample('studently-full-color',250,270);
  const clear=await sample('studently-knockout-red',250,270);
  if(white.some(v=>v!==255)||clear[3]!==0)throw Error('Interior filled/knockout invariant failed');
  report.push('Sampled interior: color RGBA '+white.join(',')+'; knockout RGBA '+clear.join(','));
  for(const n of ['studently-app-icon-white','studently-app-icon-red']){const stats=await sharp(marks.find(m=>m.name===n).raster[1024]).stats();if(!stats.isOpaque)throw Error('App icon must be opaque');}
  for(const n of ['studently-android-foreground-color','studently-android-foreground-white']){
    const {data,info}=await sharp(marks.find(m=>m.name===n).raster[1024]).ensureAlpha().raw().toBuffer({resolveWithObject:true});let outside=0;
    for(let y=0;y<1024;y++)for(let x=0;x<1024;x++)if(data[(y*info.width+x)*4+3]>10&&Math.hypot(x-511.5,y-511.5)>1024*33/108)outside++;
    if(outside)throw Error(`${n}: ${outside} pixels outside Android 66/108 safe-zone circle`);
  }
  report.push('1024px store icons opaque; both Android foregrounds fit the central 66/108 safe circle.');
  const masterHex=[...new Set([...((await fs.readFile(path.join(ROOT,'source/master-original.svg'),'utf8')).matchAll(/#[a-f\d]{6}/ig))].map(m=>m[0].toUpperCase()))];
  for(const m of marks)for(const hex of m.source.match(/#[a-f\d]{6}/ig)||[])if(!masterHex.includes(hex.toUpperCase()))throw Error('Unapproved logo color '+hex);
  report.push('All exported SVG colors belong to the original master palette.');
  const tiny=await sharp(marks.find(m=>m.name==='studently-small-knockout-white').raster[16]).ensureAlpha().raw().toBuffer();
  if(tiny[(7*16+8)*4+3]<240)throw Error('16px single window is not solid');
  report.push('Small window occupies about 43% of interior width; 6-unit pane gaps. 16px uses one solid rounded window; 32/64/512px retain four panes.');
  const original=await fs.readFile(path.join(ROOT,'source/master-original.svg'),'utf8');
  const originalPaths=[...original.matchAll(/ d="([^"]+)"/g)].map(m=>m[1]);
  const fullSource=marks.find(m=>m.name==='studently-full-color').source;
  for(const d of originalPaths)if(!fullSource.includes(`d="${d}"`))throw Error('Master path altered');
  report.push('Full-color master: every original path preserved verbatim; only overall framing changed.');
  await fs.writeFile(path.join(ROOT,'preview/validation.txt'),report.join('\n')+'\n');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
