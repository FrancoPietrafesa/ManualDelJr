const fs = require('fs');
const path = require('path');
try{
  const sharp = require('sharp');
  const assetsDir = path.join(__dirname,'..','assets');
  if(!fs.existsSync(assetsDir)){
    console.error('No assets folder found at', assetsDir);
    process.exit(1);
  }
  const files = fs.readdirSync(assetsDir);
  files.forEach(file=>{
    const ext = path.extname(file).toLowerCase();
    const name = path.basename(file,ext);
    const full = path.join(assetsDir,file);
    if(ext === '.svg' || ext === '.png' || ext === '.jpg' || ext === '.jpeg'){
      const outWebp = path.join(assetsDir, `${name}.webp`);
      const outPng = path.join(assetsDir, `${name}.png`);
      sharp(full)
        .resize({width: 1200, withoutEnlargement: true})
        .webp({quality: 80})
        .toFile(outWebp)
        .then(()=>console.log('Created', outWebp))
        .catch(err=>console.error('webp error',err));
      // Also create a PNG rasterized version for older browsers
      sharp(full)
        .resize({width: 1200, withoutEnlargement: true})
        .png({quality: 90})
        .toFile(outPng)
        .then(()=>console.log('Created', outPng))
        .catch(err=>console.error('png error',err));
    }
  });
}catch(e){
  console.error('Missing dependency "sharp". Install with: npm install sharp');
  console.error(e.message);
  process.exit(1);
}
