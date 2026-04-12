const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const macrosDir = path.join(root, 'macros');
const dataPath = path.join(root, 'data', 'posts.json');

function buildPath(parts) {
  const pathParts = Array.isArray(parts) ? parts : parts.split(path.sep);
  return pathParts.join('/');
}

function normalizeTitle(value) {
  return (value || '').toString().trim().toLowerCase();
}

function readExistingPosts() {
  if (!fs.existsSync(dataPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch {
    return [];
  }
}

function generatePosts() {
  const existing = readExistingPosts();
  const existingMap = new Map(existing.map(post => [normalizeTitle(post.title), post]));

  if (!fs.existsSync(macrosDir)) {
    console.warn('No macros directory found. Skipping post generation.');
    return;
  }

  const folders = fs.readdirSync(macrosDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const posts = folders.map(folderName => {
    const folderPath = path.join(macrosDir, folderName);
    const macroPath = path.join(folderPath, 'macro.json');
    if (!fs.existsSync(macroPath)) return null;

    const existingPost = existingMap.get(normalizeTitle(folderName));
    const descriptionPath = path.join(folderPath, 'description.txt');
    const files = fs.readdirSync(folderPath);
    const mp4File = files.find(file => path.extname(file).toLowerCase() === '.mp4');
    const mp4Url = mp4File ? buildPath(['macros', folderName, mp4File]) : '';

    let message = existingPost?.message || '';
    if (!message && fs.existsSync(descriptionPath)) {
      const descriptionText = fs.readFileSync(descriptionPath, 'utf8').trim();
      const firstLine = descriptionText.split(/\r?\n/).find(line => line.trim().length > 0);
      message = firstLine ? firstLine.trim().slice(0, 120) : '';
    }

    return {
      title: existingPost?.title || folderName,
      author: existingPost?.author || 'Unknown',
      message: message || `Folder package for ${folderName}`,
      fileUrl: buildPath(['macros', folderName, 'macro.json']),
      folder: `macros/${folderName}`,
      thumbnail: existingPost?.thumbnail || '',
      videoUrl: existingPost?.videoUrl || '',
      mp4Url,
    };
  }).filter(Boolean);

  fs.writeFileSync(dataPath, JSON.stringify(posts, null, 2) + '\n');
  console.log(`Generated ${posts.length} posts in ${dataPath}`);
}

if (require.main === module) {
  generatePosts();
}

module.exports = { generatePosts };
