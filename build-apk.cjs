const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDir = path.join(__dirname, 'android', 'app', 'build', 'intermediates', 'incremental', 'packageDebug');

// Force delete the directory
function deleteDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      deleteDir(filePath);
    } else {
      try { fs.unlinkSync(filePath); } catch (e) { console.log('Skip:', filePath); }
    }
  }
  try { fs.rmdirSync(dir); } catch (e) { console.log('Skip rmdir:', dir); }
}

deleteDir(targetDir);
console.log('Cleaned packageDebug dir');

// Now build
try {
  execSync('.\\gradlew.bat assembleDebug', { cwd: path.join(__dirname, 'android'), stdio: 'inherit' });
} catch (e) {
  process.exit(1);
}
