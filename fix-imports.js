import fs from 'fs';
import path from 'path';

const srcDir = './backend/src';

function addJsExtensions(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace relative imports that don't end with .js
  content = content.replace(/from ['"](\.\/.+?)(?<!\.js)['"]/g, "from '$1.js'");
  content = content.replace(/import ['"](\.\/.+?)(?<!\.js)['"]/g, "import '$1.js'");

  fs.writeFileSync(filePath, content);
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.ts')) {
      addJsExtensions(fullPath);
    }
  });
}

processDirectory(srcDir);
console.log('Fixed all imports!');