export type ConvertedImage = {
	file: File
	tmpSrc: string
}

export type UploadedImage = {
	src: string
	size: number
	name: string
	uploadedAt: number
	expiresAt: number
}

export interface AuthToken {
	token: string
}
export interface ImgItem {
	key: string
	url: string
	size: number

	filename?: string
	uploadedAt?: number
	delToken?: string
	originalName?: string
	uploaderName?: string
	uploadedBy?: string
	storageType?: 'R2' | 'HF'
}

export interface ImgList {
	next: boolean
	cursor?: string
	list: Array<ImgItem>

	prefixes?: Array<String>
	canViewAll?: boolean
	total?: number
}

export interface ImgDel {
	keys: string
}

export interface ImgReq {
	cursor?: string
	delimiter?: string
	limit: Number
	keyword?: string
}
export interface Folder {
	name: string
}

export interface User {
	id: number
	name: string
	login: string
	avatar_url: string
	role?: 'admin' | 'user'
	canViewAll?: boolean
}

// ============================================
// 管理员相关类型
// ============================================

export interface AdminUser {
	id: number
	githubId: number
	login: string
	name: string | null
	avatarUrl: string | null
	role: 'admin' | 'user'
	canViewAll: boolean
	storageQuota: number
	storageUsed: number
	uploadCount: number
	createdAt: string
	lastLoginAt: string | null
}

export interface UserStats {
	totalImages: number
	totalSize: number
	totalViews: number
	recentUploads: number
}

export interface SystemStats {
	userCount: number
	imageCount: number
	totalSize: number
	recentUploads: number
}

export interface AuditLog {
	id: number
	user_id: number | null
	user_login: string
	action: string
	target_key: string | null
	details: string | null
	ip_address: string | null
	created_at: string
}

export interface AnalyticsOverview {
	todayViews: number
	weekViews: number
	monthViews: number
	topCountries: Array<{ country: string; count: number }>
	topReferers: Array<{ referer: string; count: number }>
}

export interface DailyTrend {
	date: string
	count: number
}

export interface TopImage {
	key: string
	original_name: string | null
	user_login: string
	size: number
	view_count: number
	recent_views: number
}

export interface ImageAnalytics {
	image: any
	recentAccess: Array<{
		accessed_at: string
		referer: string | null
		country: string | null
		city: string | null
		user_agent: string | null
	}>
	dailyTrend: DailyTrend[]
}

export interface UserAnalytics {
	totalViews: number
	topImages: Array<{ key: string; original_name: string | null; view_count: number }>
	recentActivity: DailyTrend[]
}

export interface CurrentUserInfo {
	id?: number
	login?: string
	name?: string
	avatarUrl?: string
	role: 'admin' | 'user'
	canViewAll: boolean
	isAdmin?: boolean
	storageQuota?: number
	storageUsed?: number
	uploadCount?: number
}
