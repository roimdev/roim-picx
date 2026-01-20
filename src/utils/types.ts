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
}

export interface ImgList {
	next: boolean
	cursor?: string
	list: Array<ImgItem>

	prefixes?: Array<String>
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
