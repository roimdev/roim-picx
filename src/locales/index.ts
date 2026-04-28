import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import enUS from './en-US'

// Get saved locale from localStorage or use browser language
function getDefaultLocale(): string {
    const saved = localStorage.getItem('locale')
    if (saved) return saved

    // Detect browser language
    const browserLang = navigator.language
    if (browserLang.startsWith('zh')) return 'zh-CN'
    return 'en-US'
}

const i18n = createI18n({
    legacy: false, // Use Composition API mode
    locale: getDefaultLocale(),
    fallbackLocale: 'en-US',
    messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
    },
})

export default i18n

// Helper to change locale and persist
export function setLocale(locale: string) {
    // @ts-ignore
    i18n.global.locale.value = locale
    localStorage.setItem('locale', locale)
    document.documentElement.lang = locale
}

// Export available locales
export const availableLocales = [
    { code: 'zh-CN', name: '简体中文' },
    { code: 'en-US', name: 'English' },
]
