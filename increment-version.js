/**
 * utiltiy to increment the version in package.json just convenient
 * 
 */
const fs = require('fs');
const path = require('path');
const packagePath = path.join(__dirname, 'package.json');

try {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const version = packageJson.version.split('.');
  const major = parseInt(version[0], 10);
  const minor = parseInt(version[1], 10);
  const patch = parseInt(version[2]);

  packageJson.version = `${major}.${minor}.${patch + 1}`;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2)); 

  console.log(`Version incremented to ${packageJson.version}`);
} catch (error) {
  console.error('Failed to increment version:', error);
  process.exit(1);
}
