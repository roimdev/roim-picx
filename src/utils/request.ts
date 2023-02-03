import axios from 'axios'
import { ElNotification as elNotify } from 'element-plus'
import {ImgList, ImgDel, ImgReq, Folder, ImgItem} from "./types";

const request = axios.create({
	baseURL: import.meta.env.VITE_APP_API_URL,
	timeout: 200000
})

request.interceptors.response.use(
	(response) => response.data.data,
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
export const requestDeleteImage = (data: ImgDel) => request.delete('/rest', { data })
