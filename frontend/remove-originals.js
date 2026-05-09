import fs from 'fs';
import path from 'path';

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

function removeOriginal(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') return;

  const webpPath = filePath.replace(ext, '.webp');
  
  if (fs.existsSync(webpPath)) {
    const size = fs.statSync(filePath).size;
    console.log(`Removing original file: ${filePath} (${(size / 1024 / 1024).toFixed(2)}MB)`);
    fs.unlinkSync(filePath);
  }
}

function main() {
  console.log('Starting removal of original assets...');
  walkDir(PUBLIC_DIR, removeOriginal);
  console.log('Removal complete.');
}

main();
