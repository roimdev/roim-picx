import axios from 'axios'
import { ElNotification as elNotify } from 'element-plus'
import { 
	ImgList, ImgDel, ImgReq, Folder, ImgItem, AuthToken,
	AdminUser, UserStats, SystemStats, AuditLog, 
	AnalyticsOverview, DailyTrend, TopImage, ImageAnalytics, UserAnalytics, CurrentUserInfo
} from "./types"
import storage from "./storage"
const request = axios.create({
	baseURL: import.meta.env.VITE_APP_API_URL || '',
	timeout: 200000
})

request.interceptors.request.use(
	(config) => {
		const local = storage.local.get('auth-token')
		let token = ''
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
			setTimeout(() => {
				storage.local.remove('auth-token')
				window.location.href = '/auth'
			}, 1500)
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
export const checkToken = (data: AuthToken): Promise<boolean> => request.post('/rest/checkToken', data)
export const requestDeleteImage = (data: ImgDel): Promise<string> => request.delete('/rest', { data })
export const requestRenameImage = (data: { oldKey: string, newKey: string }): Promise<string> => request.post('/rest/rename', data)
export const requestDelInfo = (token: string): Promise<ImgItem> => request.get(`/rest/delInfo/${token}`)
export const requestPublicDeleteImage = (token: string): Promise<any> => request.post(`/rest/delImage/${token}`)
export const requestGithubLogin = (code: string): Promise<string> => request.post('/rest/github/login', { code })

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

// ============================================
// 当前用户 API
// ============================================
export const requestCurrentUser = (): Promise<CurrentUserInfo> => request.get('/rest/user/me')
export const requestCurrentUserStats = (): Promise<UserStats> => request.get('/rest/user/me/stats')

// ============================================
// 管理员 API - 用户管理
// ============================================
export const requestAdminUsers = (): Promise<AdminUser[]> => request.get('/rest/admin/users')
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
export const requestAuditLogs = (params?: AuditLogQuery): Promise<{ logs: AuditLog[]; hasMore: boolean }> => {
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

