import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

// 导入翻译文件
const zh = require('./translations/zh.json');
const en = require('./translations/en.json');

// 创建 i18n 实例
const i18n = new I18n({
    en,
    zh,
});

// 设置默认语言为英语
i18n.defaultLocale = 'zh';
i18n.enableFallback = true;

// 获取设备语言设置
const locales = getLocales();
if (locales.length > 0) {
    // 获取首选语言的简写代码（如 'zh' 或 'en'）
    const languageCode = locales[0].languageTag.split('-')[0];
    i18n.locale = languageCode;
    // i18n.locale = 'zh';
}

export default i18n; 