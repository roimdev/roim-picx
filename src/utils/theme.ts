
export type Theme = 'light' | 'dark'

const THEME_KEY = 'picx-theme'

export const getTheme = (): Theme => {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme
    if (savedTheme) return savedTheme

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const setTheme = (theme: Theme) => {
    localStorage.setItem(THEME_KEY, theme)
    if (theme === 'dark') {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }
}

export const toggleTheme = (): Theme => {
    const currentTheme = getTheme()
    const newTheme = currentTheme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    return newTheme
}

export const initTheme = () => {
    const theme = getTheme()
    setTheme(theme)
}
