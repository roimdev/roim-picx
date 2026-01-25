import axios from 'axios'
import { ElNotification as elNotify } from 'element-plus'
import {
	ImgList, ImgDel, ImgReq, Folder, ImgItem, AuthToken,
	AdminUser, UserStats, SystemStats, AuditLog,
	AnalyticsOverview, DailyTrend, TopImage, ImageAnalytics, UserAnalytics, CurrentUserInfo, UploadConfigItem
} from "./types"
import storage from "./storage"
const request = axios.create({
	baseURL: import.meta.env.VITE_APP_API_URL || '',
	timeout: 200000
})

request.interceptors.request.use(
	(config) => {
		const local = storage.local.get('auth-token')
		let token = local
		if (local && local.token) {
			token = local.token
		}
		if (token) {
			// Add Bearer prefix for JWTs if not already present
			// @ts-ignore
			config.headers['Authorization'] = (token.includes('.') && !token.startsWith('Bearer ')) ? `Bearer ${token}` : token
		}
		return config
	}
)

request.interceptors.response.use(
	(response) => {
		const data = response.data;
		// console.log(data)
		if (data.code === 401) {
			// Display error message
			elNotify({
				message: data.msg || '登录已过期，请重新登录',
				duration: 3000,
				type: 'error'
			})
			// Delay redirect to allow user to see message
			// setTimeout(() => {
			// 	storage.local.remove('auth-token')
			// 	window.location.href = '/auth'
			// }, 1500)
			return Promise.reject(data.msg)
		}
		if (data.code !== 200) {
			elNotify({
				message: data.msg,
				duration: 0,
				type: 'error'
			})
			return Promise.reject(data.msg)
		}
		return data.data
	},
	(error) => {
		elNotify({
			message: error?.response?.data || String(error),
			duration: 0,
			type: 'error'
		})
		return Promise.reject(error)
	}
)

export const requestListImages = (data: ImgReq): Promise<ImgList> => request.post('/rest/list', data)
export const requestUploadImages = (data: FormData): Promise<ImgItem[]> => request.post('/rest/upload', data)
export const createFolder = (data: Folder): Promise<any> => request.post('/rest/folder', data)
// checkToken 返回类型：布尔值（JWT验证）或对象（Token登录成功）
export interface TokenLoginResult {
	token: string
	user: {
		id: number
		name: string
		login: string
		avatar_url: string
		role?: string
		canViewAll?: boolean
	}
}
export const checkToken = (data: AuthToken): Promise<boolean | TokenLoginResult> => request.post('/rest/checkToken', data)
export const requestDeleteImage = (data: ImgDel): Promise<string> => request.delete('/rest', { data })
export const requestRenameImage = (data: { oldKey: string, newKey: string }): Promise<string> => request.post('/rest/rename', data)
export const requestUpdateImageTags = (data: { key: string, tags: string[] }): Promise<{ key: string, tags: string[] }> => request.post('/rest/updateTags', data)
export const requestDelInfo = (token: string): Promise<ImgItem> => request.get(`/rest/delInfo/${token}`)
export const requestPublicDeleteImage = (token: string): Promise<any> => request.post(`/rest/delImage/${token}`)
export const requestGithubLogin = (code: string): Promise<string> => request.post('/rest/github/login', { code })

// Auth Config
export interface StorageProvider {
	type: 'R2' | 'HF'
	name: string
	enabled: boolean
}
export interface AuthConfig {
	allowTokenLogin: boolean
	githubLoginEnabled: boolean
	steamLoginEnabled: boolean
	googleLoginEnabled: boolean
	storageProviders: StorageProvider[]
	defaultStorage: 'R2' | 'HF'
}
export const requestAuthConfig = (): Promise<AuthConfig> => request.get('/rest/auth/config')

// Steam Login
export const requestSteamLogin = (): Promise<{ authUrl: string }> => request.get('/rest/steam/login')

// Share API
export interface CreateShareRequest {
	imageKey: string
	imageUrl: string
	password?: string
	expireAt?: number
	maxViews?: number
}

export interface ShareInfo {
	id: string
	url: string
	hasPassword: boolean
	expireAt?: number
	maxViews?: number
}

export interface ShareDetail {
	id: string
	hasPassword: boolean
	expireAt?: number
	maxViews?: number
	views: number
	createdAt: number
}

export interface ShareImageResult {
	imageUrl: string
	imageKey: string
	views: number
	maxViews?: number
}

export const requestCreateShare = (data: CreateShareRequest): Promise<ShareInfo> => request.post('/rest/share', data)
export const requestGetShareInfo = (id: string): Promise<ShareDetail> => request.get(`/rest/share/${id}`)
export const requestVerifyShare = (id: string, password?: string): Promise<ShareImageResult> => request.post(`/rest/share/${id}/verify`, { password })
export const requestDeleteShare = (id: string): Promise<any> => request.delete(`/rest/share/${id}`)

// My Shares
export interface MyShare {
	id: string
	imageKey: string
	imageUrl: string
	hasPassword: boolean
	expireAt?: number
	maxViews?: number
	views: number
	createdAt: number
	isExpired: boolean
	isMaxedOut: boolean
	url: string
}
export const requestMyShares = (): Promise<MyShare[]> => request.get('/rest/share/my')

// ============================================
// 当前用户 API
// ============================================
export const requestCurrentUser = (): Promise<CurrentUserInfo> => request.get('/rest/user/me')
export const requestCurrentUserStats = (): Promise<UserStats> => request.get('/rest/user/me/stats')

// ============================================
// 管理员 API - 用户管理
// ============================================
export interface AdminUserQuery {
	page?: number
	limit?: number
	keyword?: string
}
export interface PaginatedResponse<T> {
	list: T[]
	total: number
	hasMore?: boolean // For compatibility if needed
}

export const requestAdminUsers = (params?: AdminUserQuery): Promise<PaginatedResponse<AdminUser>> => {
	const query = new URLSearchParams()
	if (params?.page) query.set('page', String(params.page))
	if (params?.limit) query.set('limit', String(params.limit))
	if (params?.keyword) query.set('q', params.keyword)
	return request.get(`/rest/admin/users?${query.toString()}`)
}
export const requestAdminUser = (login: string): Promise<AdminUser> => request.get(`/rest/admin/users/${login}`)
export const requestAdminUserStats = (login: string): Promise<UserStats> => request.get(`/rest/admin/users/${login}/stats`)
export const requestSetUserViewAll = (login: string, grant: boolean): Promise<{ login: string; canViewAll: boolean }> =>
	request.post(`/rest/admin/users/${login}/view-all`, { grant })
export const requestSetUserRole = (login: string, role: 'admin' | 'user'): Promise<{ login: string; role: string }> =>
	request.post(`/rest/admin/users/${login}/role`, { role })
export const requestSetUserQuota = (login: string, quota: number): Promise<{ login: string; storageQuota: number }> =>
	request.post(`/rest/admin/users/${login}/quota`, { quota })

// ============================================
// 管理员 API - 系统统计
// ============================================
export const requestAdminStats = (): Promise<SystemStats> => request.get('/rest/admin/stats')

// ============================================
// 管理员 API - 审计日志
// ============================================
export interface AuditLogQuery {
	limit?: number
	offset?: number
	action?: string
	user?: string
}
export const requestAuditLogs = (params?: AuditLogQuery): Promise<{ logs: AuditLog[]; total: number; hasMore?: boolean }> => {
	const query = new URLSearchParams()
	if (params?.limit) query.set('limit', String(params.limit))
	if (params?.offset) query.set('offset', String(params.offset))
	if (params?.action) query.set('action', params.action)
	if (params?.user) query.set('user', params.user)
	return request.get(`/rest/admin/audit-logs?${query.toString()}`)
}

// ============================================
// 管理员 API - 访问分析
// ============================================
export const requestAnalyticsOverview = (): Promise<AnalyticsOverview> => request.get('/rest/admin/analytics/overview')
export const requestAnalyticsTrend = (): Promise<DailyTrend[]> => request.get('/rest/admin/analytics/trend')
export const requestTopImages = (limit?: number, days?: number): Promise<TopImage[]> => {
	const query = new URLSearchParams()
	if (limit) query.set('limit', String(limit))
	if (days) query.set('days', String(days))
	return request.get(`/rest/admin/analytics/top-images?${query.toString()}`)
}
export const requestImageAnalytics = (key: string): Promise<ImageAnalytics> =>
	request.get(`/rest/admin/analytics/image/${key}`)
export const requestUserAnalytics = (login: string): Promise<UserAnalytics> =>
	request.get(`/rest/admin/analytics/user/${login}`)


// ============================================
// 管理员 API - 系统设置
// ============================================

export const requestGetUploadConfig = (): Promise<UploadConfigItem[]> => request.get('/rest/settings/upload')
export const requestUpdateUploadConfig = (config: UploadConfigItem[]): Promise<UploadConfigItem[]> => request.post('/rest/settings/upload', config)

// ============================================
// 相册 API
// ============================================
import { Album, AlbumImage, AlbumShareInfo } from './types'

export const requestListAlbums = (keyword?: string): Promise<Album[]> => {
	const query = new URLSearchParams()
	if (keyword) query.set('keyword', keyword)
	return request.get(`/rest/albums?${query.toString()}`)
}
export const requestCreateAlbum = (data: { name: string, description?: string, coverImage?: string }): Promise<Album> => request.post('/rest/albums', data)
export const requestUpdateAlbum = (id: number, data: { name: string, description?: string, coverImage?: string }): Promise<Album> => request.put(`/rest/albums/${id}`, data)
export const requestDeleteAlbum = (id: number): Promise<any> => request.delete(`/rest/albums/${id}`)
export const requestGetAlbum = (id: number, params?: { page?: number, limit?: number }): Promise<{ album: Album, images: AlbumImage[], total: number }> => {
	const query = new URLSearchParams()
	if (params?.page) query.set('page', String(params.page))
	if (params?.limit) query.set('limit', String(params.limit))
	return request.get(`/rest/albums/${id}?${query.toString()}`)
}
export const requestAddImagesToAlbum = (id: number, images: { key: string, url: string }[]): Promise<any> => request.post(`/rest/albums/${id}/add`, { images })
export const requestRemoveImagesFromAlbum = (id: number, keys: string[]): Promise<any> => request.post(`/rest/albums/${id}/remove`, { keys })
export const requestSetAlbumCover = (id: number, coverImage: string): Promise<any> => request.post(`/rest/albums/${id}/cover`, { coverImage })

// 相册分享
export const requestShareAlbum = (id: number, data: { password?: string, expireAt?: number, maxViews?: number }): Promise<AlbumShareInfo> => request.post(`/rest/albums/${id}/share`, data)
export const requestGetAlbumShareInfo = (token: string): Promise<AlbumShareInfo> => request.get(`/rest/share/album/${token}`)
export const requestVerifyAlbumShare = (token: string, password?: string): Promise<{ images: AlbumImage[] }> => request.post(`/rest/share/album/${token}/verify`, { password })


