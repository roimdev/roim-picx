import axios from 'axios'
import { ElNotification as elNotify } from 'element-plus'
import { ImgList, ImgDel, ImgReq, Folder, ImgItem, AuthToken } from "./types"
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

