const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const INPUT_IMAGE = '/Users/maohuhu/.gemini/antigravity/brain/0104856a-6342-4869-aadb-1067cea51f35/dmg_background_raw_1766590222844.png';
const OUTPUT_DIR = '/Users/maohuhu/Desktop/编程项目/智简witnote笔记本/build/dmg-background';

async function processImage() {
    try {
        console.log(`Processing image: ${INPUT_IMAGE}`);
        
        // 1. Create Retina version (1080x760)
        // We crop the center to fit aspect ratio
        await sharp(INPUT_IMAGE)
            .resize(1080, 760, {
                fit: 'cover',
                position: 'center'
            })
            .toFile(path.join(OUTPUT_DIR, 'background@2x.png')); // Save as @2x for Retina
            
        console.log('✅ Created background@2x.png (1080x760)');

        // 2. Create Standard version (540x380)
        await sharp(INPUT_IMAGE)
            .resize(540, 380, {
                fit: 'cover',
                position: 'center'
            })
            .toFile(path.join(OUTPUT_DIR, 'background.png'));
            
        console.log('✅ Created background.png (540x380)');
        
    } catch (error) {
        console.error('Error processing image:', error);
        process.exit(1);
    }
}

processImage();
