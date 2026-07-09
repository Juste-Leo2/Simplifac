const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO_URL = 'https://huggingface.co/JusteLeo/ALBERT-base-v2-french-ner/resolve/main/onnx';
const TARGET_DIR = path.join(__dirname, '..', 'src', 'assets', 'models', 'albert-wikiner-fr-onnx');
const ONNX_DIR = path.join(TARGET_DIR, 'onnx');

const FILES_TO_DOWNLOAD = [
  'config.json',
  'special_tokens_map.json',
  'spiece.model',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/model.onnx'
];

// Création des dossiers
if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });
if (!fs.existsSync(ONNX_DIR)) fs.mkdirSync(ONNX_DIR, { recursive: true });

const downloadFile = (fileUrl, destPath) => {
  return new Promise((resolve, reject) => {
    console.log(`Téléchargement de ${fileUrl} ...`);
    const file = fs.createWriteStream(destPath);
    https.get(fileUrl, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Redirection HuggingFace
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Erreur HTTP ${response.statusCode} pour ${fileUrl}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => reject(err));
    });
  });
};

const run = async () => {
  console.log('Démarrage du téléchargement du modèle NER...');
  try {
    for (const file of FILES_TO_DOWNLOAD) {
      const fileUrl = `${REPO_URL}/${file}`;
      const destPath = path.join(TARGET_DIR, file);
      
      // Ne retélécharge pas si déjà présent pour gagner du temps
      if (!fs.existsSync(destPath)) {
        await downloadFile(fileUrl, destPath);
        console.log(`✓ ${file} téléchargé avec succès.`);
      } else {
        console.log(`- ${file} est déjà présent.`);
      }
    }
    console.log('🎉 Téléchargement terminé avec succès !');
  } catch (e) {
    console.error('❌ Erreur lors du téléchargement :', e);
    process.exit(1);
  }
};

run();
