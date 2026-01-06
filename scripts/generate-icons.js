// Script simple pour générer des icônes PWA
// Ce script crée des icônes PNG basiques à partir d'un SVG

const fs = require('fs');
const path = require('path');

// SVG template pour les icônes
const iconSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="64" fill="#10B981"/>
  <path d="M180 140 L180 380 L200 380 L200 200 L280 200 L280 180 L200 180 L200 140 Z" fill="white"/>
  <circle cx="320" cy="180" r="20" fill="white" opacity="0.8"/>
  <circle cx="340" cy="220" r="15" fill="white" opacity="0.6"/>
  <circle cx="300" cy="320" r="25" fill="white" opacity="0.7"/>
</svg>`;

// Tailles d'icônes nécessaires
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Créer le dossier icons s'il n'existe pas
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Générer les fichiers SVG (qui seront convertis en PNG plus tard)
sizes.forEach(size => {
  const svgContent = iconSvg(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svgContent);
  console.log(`Généré: ${filename}`);
});

console.log('Icônes SVG générées. Pour les convertir en PNG, utilisez un outil comme ImageMagick ou un service en ligne.');
