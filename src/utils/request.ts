import axios from 'axios'
import { ElNotification as elNotify } from 'element-plus'
import {ImgList, ImgDel, ImgReq, Folder, ImgItem, AuthToken} from "./types"
import storage from "./storage"
const request = axios.create({
	baseURL: import.meta.env.VITE_APP_API_URL,
	timeout: 200000
})

request.interceptors.request.use(
	(config) => {
		const token = storage.local.get('auth-token')
		if (token) {
			// @ts-ignore
			config.headers['Authorization'] = token
		}
		return config
	}
)

request.interceptors.response.use(
	(response) => {
		const data = response.data;
		// console.log(data)
		if (data.code === 401) {
			// 跳转到登陆页面
			// 移除token
			storage.local.remove('auth-token')
			window.location.href = '/auth'
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

export const requestListImages = (data : ImgReq): Promise<ImgList> => request.post('/rest/list', data)
export const requestUploadImages = (data: FormData) : Promise<ImgItem[]> => request.post('/rest/upload', data)
export const createFolder = (data: Folder) => request.post('/rest/folder', data)
export const checkToken = (data: AuthToken) => request.post('/rest/checkToken', data)
export const requestDeleteImage = (data: ImgDel) => request.delete('/rest', { data })
