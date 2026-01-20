import type { User } from "./types"

export const parseUserFromToken = (token: string): User | null => {
    try {
        if (!token) return null
        const parts = token.split('.')
        if (parts.length !== 3) return null

        // Base64Url decode
        const base64Url = parts[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))

        return JSON.parse(jsonPayload)
    } catch (e) {
        console.error('Failed to parse user from token', e)
        return null
    }
}
