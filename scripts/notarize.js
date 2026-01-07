const { notarize } = require('@electron/notarize');
const path = require('path');
require('dotenv').config();

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context;

    if (process.env.SKIP_NOTARIZE === 'true') {
        console.log('Skipping notarization - SKIP_NOTARIZE is set');
        return;
    }

    // 只在 macOS 上公证
    if (electronPlatformName !== 'darwin') {
        console.log('Skipping notarization - not on macOS');
        return;
    }

    const appName = context.packager.appInfo.productFilename;
    const appPath = path.join(appOutDir, `${appName}.app`);

    console.log(`📝 公证应用: ${appPath}`);

    try {
        await notarize({
            tool: 'notarytool',
            appPath: appPath,
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
            teamId: process.env.APPLE_TEAM_ID
        });
        console.log('✅ 公证成功！');
    } catch (error) {
        console.error('❌ 公证失败:', error);
        throw error;
    }
};
