#!/usr/bin/env node

/**
 * macOS 图标生成脚本
 * 将正方形 PNG 转换为带 macOS 圆角（Squircle）的图标
 * 
 * 使用方法：
 *   npm install sharp
 *   node scripts/generate-icon.js
 */

const sharp = require('sharp');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const SOURCE_IMAGE = path.join(__dirname, '../src/pic/logo/苹果商店/智简icon-方形.jpg');
const OUTPUT_DIR_DMG = path.join(__dirname, '../build/dmg-icon');
const OUTPUT_DIR_MAS = path.join(__dirname, '../build/mas-icon');

// macOS 圆角半径比例（基于图标大小的百分比）
// macOS 使用的是 super-ellipse，这里用近似值
const CORNER_RADIUS_RATIO = 0.2237; // 约 22.37% 的圆角

// 图标尺寸定义
const ICON_SIZES = [
    { size: 16, scale: 1 },
    { size: 16, scale: 2 },
    { size: 32, scale: 1 },
    { size: 32, scale: 2 },
    { size: 128, scale: 1 },
    { size: 128, scale: 2 },
    { size: 256, scale: 1 },
    { size: 256, scale: 2 },
    { size: 512, scale: 1 },
    { size: 512, scale: 2 }
];

/**
 * 生成圆角矩形 SVG mask
 */
function generateSquircleMask(size) {
    const radius = size * CORNER_RADIUS_RATIO;

    // 使用 SVG path 创建 super-ellipse 近似
    // 这是一个简化版本，使用贝塞尔曲线模拟 squircle
    const c = 0.55228475; // 圆角的贝塞尔曲线控制点常数
    const r = radius;

    return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="squircle">
          <path d="
            M ${r},0
            L ${size - r},0
            C ${size - r * (1 - c)},0 ${size},${r * (1 - c)} ${size},${r}
            L ${size},${size - r}
            C ${size},${size - r * (1 - c)} ${size - r * (1 - c)},${size} ${size - r},${size}
            L ${r},${size}
            C ${r * (1 - c)},${size} 0,${size - r * (1 - c)} 0,${size - r}
            L 0,${r}
            C 0,${r * (1 - c)} ${r * (1 - c)},0 ${r},0
            Z
          " fill="white"/>
        </clipPath>
      </defs>
      <rect width="${size}" height="${size}" fill="white" clip-path="url(#squircle)"/>
    </svg>
  `;
}

/**
 * 应用圆角遮罩到图片
 */
async function applySquircle(inputPath, outputPath, size) {
    const mask = Buffer.from(generateSquircleMask(size));

    await sharp(inputPath)
        .resize(size, size, {
            fit: 'cover',
            position: 'center'
        })
        .composite([{
            input: mask,
            blend: 'dest-in'
        }])
        .png()
        .toFile(outputPath);
}

/**
 * 生成 iconset 的所有尺寸
 */
async function generateIconset(sourceImage, iconsetDir) {
    console.log(`📦 生成 iconset: ${iconsetDir}`);

    // 创建 iconset 目录
    if (!fs.existsSync(iconsetDir)) {
        fs.mkdirSync(iconsetDir, { recursive: true });
    }

    // 生成所有尺寸
    for (const { size, scale } of ICON_SIZES) {
        const actualSize = size * scale;
        const filename = scale === 1
            ? `icon_${size}x${size}.png`
            : `icon_${size}x${size}@${scale}x.png`;

        const outputPath = path.join(iconsetDir, filename);

        console.log(`  ✓ ${filename} (${actualSize}x${actualSize})`);
        await applySquircle(sourceImage, outputPath, actualSize);
    }

    console.log(`✅ iconset 生成完成\n`);
}

/**
 * 转换 iconset 为 .icns
 */
function convertToIcns(iconsetDir, outputIcnsPath) {
    console.log(`🔨 转换为 .icns: ${outputIcnsPath}`);

    try {
        execSync(`iconutil -c icns "${iconsetDir}" -o "${outputIcnsPath}"`, {
            stdio: 'inherit'
        });
        console.log(`✅ .icns 生成成功\n`);
    } catch (error) {
        console.error(`❌ iconutil 转换失败:`, error.message);
        throw error;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('🎨 macOS 圆角图标生成器\n');

    // 检查源文件
    if (!fs.existsSync(SOURCE_IMAGE)) {
        console.error(`❌ 源图片不存在: ${SOURCE_IMAGE}`);
        process.exit(1);
    }

    console.log(`📸 源图片: ${SOURCE_IMAGE}\n`);

    // 1. 生成 DMG 版本图标
    console.log('--- DMG 版本 (带圆角) ---\n');
    const dmgIconsetDir = path.join(OUTPUT_DIR_DMG, 'icon.iconset');
    const dmgIconPath = path.join(OUTPUT_DIR_DMG, 'icon.icns');

    await generateIconset(SOURCE_IMAGE, dmgIconsetDir);
    convertToIcns(dmgIconsetDir, dmgIconPath);

    // 2. 生成 MAS 版本图标（使用直角，因为 MAS 会自动处理圆角）
    console.log('--- MAS 版本 (直角，系统自动圆角) ---\n');
    const masIconsetDir = path.join(OUTPUT_DIR_MAS, 'icon.iconset');
    const masIconPath = path.join(OUTPUT_DIR_MAS, 'icon.icns');

    // MAS 版本直接生成不带圆角的图标
    if (!fs.existsSync(masIconsetDir)) {
        fs.mkdirSync(masIconsetDir, { recursive: true });
    }

    for (const { size, scale } of ICON_SIZES) {
        const actualSize = size * scale;
        const filename = scale === 1
            ? `icon_${size}x${size}.png`
            : `icon_${size}x${size}@${scale}x.png`;

        const outputPath = path.join(masIconsetDir, filename);

        console.log(`  ✓ ${filename} (${actualSize}x${actualSize})`);
        await sharp(SOURCE_IMAGE)
            .resize(actualSize, actualSize, {
                fit: 'cover',
                position: 'center'
            })
            .png()
            .toFile(outputPath);
    }

    console.log(`✅ iconset 生成完成\n`);
    convertToIcns(masIconsetDir, masIconPath);

    // 显示结果
    console.log('🎉 所有图标生成完成！\n');
    console.log('📁 生成的文件：');
    console.log(`   DMG 图标: ${dmgIconPath}`);
    console.log(`   MAS 图标: ${masIconPath}`);
    console.log('\n💡 使用说明：');
    console.log('   - DMG 发布使用: build/dmg-icon/icon.icns');
    console.log('   - MAS 发布使用: build/mas-icon/icon.icns (或继续使用 build/icon.icns)');
}

// 运行
main().catch(error => {
    console.error('❌ 错误:', error);
    process.exit(1);
});
