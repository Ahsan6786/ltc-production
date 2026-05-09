import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';

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

function updateFileContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.jsx' && ext !== '.js' && ext !== '.css') return;

  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Replace image extensions in strings
  // Matches paths like "/newimages/image.png" or "image.jpg"
  const regex = /(["'])([^"']+\.(?:png|jpg|jpeg))\1/g;
  
  const newContent = content.replace(regex, (match, quote, p2) => {
    // Check if the path points to an asset in public (starts with / or /newimages)
    // Or if it's a relative path to an asset
    if (p2.startsWith('/') || p2.startsWith('./') || p2.startsWith('../')) {
      updated = true;
      const newPath = p2.replace(/\.(png|jpg|jpeg)$/i, '.webp');
      console.log(`Updating reference in ${filePath}: ${p2} -> ${newPath}`);
      return `${quote}${newPath}${quote}`;
    }
    return match;
  });

  if (updated) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated file: ${filePath}`);
  }
}

function main() {
  console.log('Starting reference updates...');
  walkDir(SRC_DIR, updateFileContent);
  console.log('Reference updates complete.');
}

main();
