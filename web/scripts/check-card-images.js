#!/usr/bin/env node

/**
 * Card Image Download Helper
 * 
 * This script helps download Swiss Jass card images from jassverzeichnis.ch
 * 
 * NOTE: You'll need to manually download the images from the website
 * and save them with the correct naming convention.
 * 
 * This script generates a checklist and validates downloaded files.
 */

const fs = require('fs');
const path = require('path');

const CARDS_DIR = path.join(__dirname, '..', 'public', 'assets', 'cards');

const suits = ['eicheln', 'rosen', 'schellen', 'schilten'];
const ranks = ['A', 'K', 'O', 'U', '10', '9', '8', '7', '6'];

const expectedFiles = [];
suits.forEach(suit => {
  ranks.forEach(rank => {
    expectedFiles.push(`${suit}_${rank}.png`);
  });
});

console.log('🃏 Swiss Jass Card Image Checker\n');
console.log('═'.repeat(60));
console.log('\n📋 Expected Files (36 total):\n');

let foundCount = 0;
let missingCount = 0;

expectedFiles.forEach((filename, index) => {
  const filePath = path.join(CARDS_DIR, filename);
  const exists = fs.existsSync(filePath);
  
  if (exists) {
    console.log(`✅ ${filename}`);
    foundCount++;
  } else {
    console.log(`❌ ${filename} - MISSING`);
    missingCount++;
  }
});

console.log('\n' + '═'.repeat(60));
console.log(`\n📊 Summary:`);
console.log(`   Found: ${foundCount}/${expectedFiles.length}`);
console.log(`   Missing: ${missingCount}/${expectedFiles.length}`);
console.log(`   Progress: ${Math.round((foundCount / expectedFiles.length) * 100)}%\n`);

if (missingCount > 0) {
  console.log('⚠️  Missing images! Download them from:');
  console.log('   https://jassverzeichnis.ch/deutsche-jasskarten/\n');
  console.log('📝 Naming convention:');
  console.log('   {suit}_{rank}.png');
  console.log('   Example: eicheln_A.png, schellen_10.png\n');
} else {
  console.log('🎉 All card images found! Ready to use!\n');
}

// Check for card back
const cardBackPath = path.join(CARDS_DIR, 'card_back.png');
if (fs.existsSync(cardBackPath)) {
  console.log('✅ Bonus: Card back image found!\n');
} else {
  console.log('💡 Tip: Add card_back.png for face-down cards (optional)\n');
}
