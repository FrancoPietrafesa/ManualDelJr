const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'styles.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Extract CSS variables
const varRe = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
const vars = {};
let m;
while((m = varRe.exec(css))){
  vars['--'+m[1]] = m[2].trim();
}

function parseColor(val){
  val = val.trim();
  if(val.startsWith('#')) return hexToRgb(val);
  if(val.startsWith('rgb')){
    const nums = val.replace(/rgba?|\(|\)|\s/g,'').split(',').map(Number);
    return {r:nums[0], g:nums[1], b:nums[2], a: nums[3]===undefined?1:nums[3]};
  }
  return null;
}

function hexToRgb(hex){
  hex = hex.replace('#','');
  if(hex.length===3) hex = hex.split('').map(c=>c+c).join('');
  const bigint = parseInt(hex,16);
  return {r:(bigint>>16)&255, g:(bigint>>8)&255, b:bigint&255, a:1};
}

function rgbToHex({r,g,b}){
  return '#'+[r,g,b].map(v=>{
    const s = Math.round(v).toString(16);
    return s.length===1? '0'+s: s;
  }).join('');
}

function lum(c){
  const RsRGB = c.r/255; const GsRGB = c.g/255; const BsRGB = c.b/255;
  const R = RsRGB <= 0.03928 ? RsRGB/12.92 : Math.pow((RsRGB+0.055)/1.055,2.4);
  const G = GsRGB <= 0.03928 ? GsRGB/12.92 : Math.pow((GsRGB+0.055)/1.055,2.4);
  const B = BsRGB <= 0.03928 ? BsRGB/12.92 : Math.pow((BsRGB+0.055)/1.055,2.4);
  return 0.2126*R + 0.7152*G + 0.0722*B;
}

function contrast(a,b){
  const L1 = lum(a); const L2 = lum(b);
  const light = Math.max(L1,L2); const dark = Math.min(L1,L2);
  return +( (light+0.05) / (dark+0.05) ).toFixed(2);
}

function rgbToHsl({r,g,b}){
  r/=255; g/=255; b/=255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h=0,s=0,l=(max+min)/2;
  if(max!==min){
    const d = max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h = (g-b)/d + (g<b?6:0); break;
      case g: h = (b-r)/d + 2; break;
      case b: h = (r-g)/d + 4; break;
    }
    h /= 6;
  }
  return {h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100)};
}

function hslToRgb(h,s,l){
  h/=360; s/=100; l/=100;
  if(s===0){
    const v = Math.round(l*255);
    return {r:v,g:v,b:v};
  }
  const q = l<0.5 ? l*(1+s) : l + s - l*s;
  const p = 2*l - q;
  function hue2rgb(p,q,t){
    if(t<0) t+=1; if(t>1) t-=1;
    if(t<1/6) return p + (q-p)*6*t;
    if(t<1/2) return q;
    if(t<2/3) return p + (q-p)*(2/3 - t)*6;
    return p;
  }
  const r = hue2rgb(p,q,h+1/3);
  const g = hue2rgb(p,q,h);
  const b = hue2rgb(p,q,h-1/3);
  return {r: Math.round(r*255), g: Math.round(g*255), b: Math.round(b*255)};
}

// Pairs to check: foreground var vs background var
const checks = [
  ['--text','--panel'],
  ['--text','--bg'],
  ['--muted','--panel'],
  ['--accent','--text']
];

const failures = [];

for(const [fgVar,bgVar] of checks){
  if(!vars[fgVar] || !vars[bgVar]) continue;
  const fg = parseColor(vars[fgVar]);
  const bg = parseColor(vars[bgVar]);
  if(!fg || !bg) continue;
  const ratio = contrast(fg,bg);
  console.log(`Contrast ${fgVar} vs ${bgVar}: ${ratio}`);
  if(ratio < 4.5){
    failures.push({fgVar,bgVar,ratio});
  }
}

if(failures.length===0){
  console.log('All checked contrasts meet WCAG AA (>=4.5).');
  process.exit(0);
}

console.log('\nFailures detected:');
failures.forEach(f=>console.log(` - ${f.fgVar} vs ${f.bgVar}: ${f.ratio}`));

// Attempt to auto-correct by adjusting the foreground variable lightness away from background
let updated = 0;
for(const f of failures){
  const fgRaw = vars[f.fgVar];
  const bgRaw = vars[f.bgVar];
  const fg = parseColor(fgRaw); const bg = parseColor(bgRaw);
  if(!fg || !bg) continue;
  const bgLum = lum(bg);
  const fgHsl = rgbToHsl(fg);
  let attempt = 0; let newHsl = {...fgHsl};
  // decide direction: if bg is dark (lum<0.5) we lighten fg, else darken fg
  const lighten = bgLum < 0.5;
  const step = 6; // percent lightness change per iteration
  while(attempt < 20){
    newHsl.l = Math.min(100, Math.max(0, newHsl.l + (lighten? step : -step)));
    const candRgb = hslToRgb(newHsl.h,newHsl.s,newHsl.l);
    const candRatio = contrast(candRgb, bg);
    attempt++;
    if(candRatio >= 4.5){
      // replace variable in css
      const newHex = rgbToHex(candRgb);
      css = css.replace(fgRaw, newHex);
      vars[f.fgVar] = newHex;
      console.log(`Updated ${f.fgVar}: ${fgRaw} -> ${newHex} (contrast ${candRatio})`);
      updated++;
      break;
    }
  }
  if(attempt>=20) console.log(`Could not auto-fix ${f.fgVar} vs ${f.bgVar}`);
}

if(updated>0){
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log(`\nApplied ${updated} fixes to ${cssPath}`);
} else {
  console.log('\nNo automatic fixes applied.');
}

function escapeRegExp(string){
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
