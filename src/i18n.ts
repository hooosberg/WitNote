/**
 * i18n 国际化配置
 * 支持中文和英文，自动检测系统语言
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import es from './locales/es.json';
import zhTW from './locales/zh-TW.json';

// 语言资源
const resources = {
    en: { translation: en },
    zh: { translation: zh },
    ja: { translation: ja },
    ko: { translation: ko },
    fr: { translation: fr },
    de: { translation: de },
    es: { translation: es },
    'zh-TW': { translation: zhTW }
};

export type LanguageCode = 'en' | 'zh' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'zh-TW';

i18n
    // 检测用户语言
    .use(LanguageDetector)
    // 将 i18n 传递给 react-i18next
    .use(initReactI18next)
    // 初始化 i18next
    .init({
        resources,
        fallbackLng: 'en', // 默认语言为英文
        supportedLngs: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'zh-TW'],

        // 智能检测配置
        load: 'currentOnly', // 支持 zh-TW

        detection: {
            // 语言检测顺序
            order: ['localStorage', 'navigator'],
            // 缓存用户语言选择
            caches: ['localStorage'],
            lookupLocalStorage: 'witnote-language',
        },

        interpolation: {
            escapeValue: false // React 已经安全处理了
        }
    });

export default i18n;

// 切换语言的工具函数
export const changeLanguage = (lang: LanguageCode) => {
    i18n.changeLanguage(lang);
};

// 获取当前语言
export const getCurrentLanguage = (): string => {
    return i18n.language || 'en';
};
