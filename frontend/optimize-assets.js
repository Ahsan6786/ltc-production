import { execSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const PUBLIC_DIR = './public';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') return;

  const outPath = filePath.replace(ext, '.webp');
  
  // Skip if webp already exists and is newer? 
  // Better to overwrite for this optimization task.

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    let pipeline = image.webp({ quality: 80 });

    // Generate responsive sizes or just resize huge images
    // If image is larger than 1920px wide, resize it to 1920px
    if (metadata.width > 1920) {
      pipeline = pipeline.resize(1920);
      console.log(`Resizing ${filePath} from ${metadata.width}px to 1920px`);
    }

    await pipeline.toFile(outPath);
    
    const oldSize = fs.statSync(filePath).size;
    const newSize = fs.statSync(outPath).size;
    
    console.log(`Optimized image: ${filePath} -> ${outPath}`);
    console.log(`Size reduced: ${(oldSize / 1024 / 1024).toFixed(2)}MB -> ${(newSize / 1024 / 1024).toFixed(2)}MB`);
    
    // We keep the original for now, we will update references in code later.
    // If the user wants to remove unused assets, we can do that after updating references.
  } catch (error) {
    console.error(`Error optimizing image ${filePath}:`, error.message);
  }
}

function optimizeVideo(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.mp4') return;

  // Don't optimize already optimized videos
  if (filePath.endsWith('-optimized.mp4')) return;

  const outPath = filePath.replace('.mp4', '-optimized.mp4');

  console.log(`Optimizing video: ${filePath} -> ${outPath}`);
  
  try {
    // Compress video using ffmpeg
    // -crf 28 is a good balance of quality and size for H.264
    // -preset fast for speed
    const command = `"${ffmpegPath}" -i "${filePath}" -vcodec libx264 -crf 28 -preset fast -y "${outPath}"`;
    execSync(command, { stdio: 'inherit' });
    
    const oldSize = fs.statSync(filePath).size;
    const newSize = fs.statSync(outPath).size;
    
    console.log(`Optimized video size: ${(oldSize / 1024 / 1024).toFixed(2)}MB -> ${(newSize / 1024 / 1024).toFixed(2)}MB`);
  } catch (error) {
    console.error(`Error optimizing video ${filePath}:`, error.message);
  }
}

async function main() {
  console.log('Starting asset optimization...');
  
  const files = [];
  walkDir(PUBLIC_DIR, (filePath) => files.push(filePath));
  
  console.log(`Found ${files.length} files in ${PUBLIC_DIR}`);
  
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
      await optimizeImage(file);
    } else if (ext === '.mp4') {
      optimizeVideo(file);
    }
  }
  
  console.log('Asset optimization complete.');
}

main();
