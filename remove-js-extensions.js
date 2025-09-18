const fs = require('fs');
const path = require('path');

const srcDir = './backend/src';

function removeJsExtensions(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove .js extensions from relative imports
  content = content.replace(/from ['"](\.\/.+?)\.js['"]/g, "from '$1'");
  content = content.replace(/import ['"](\.\/.+?)\.js['"]/g, "import '$1'");
  // Also handle ../path patterns
  content = content.replace(/from ['"](\.\.\/.+?)\.js['"]/g, "from '$1'");
  content = content.replace(/import ['"](\.\.\/.+?)\.js['"]/g, "import '$1'");

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
      removeJsExtensions(fullPath);
    }
  });
}

processDirectory(srcDir);
console.log('Removed .js extensions from all imports!');