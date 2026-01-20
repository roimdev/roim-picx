export interface Result {
    code: number
    msg: string
    data?: any
}

export interface ImgItem {
    key: string
    url: string
    size: number
    filename?: string
    delToken?: string
    originalName?: string
    uploaderName?: string
    uploadedBy?: string
    uploadedAt?: number
}

export interface ImgList {
    next: boolean
    cursor?: string
    list: Array<ImgItem>
    prefixes?: Array<String>
    canViewAll?: boolean  // 当前用户是否可以查看所有图片
}

export interface ImgReq {
    limit: number,
    cursor?: string
    delimiter?: string
    keyword?: string
}

// 文件夹名称
export interface Folder {
    name: string
}

export function NotAuth(): Result {
    return <Result>{
        code: StatusCode.NotAuth,
        msg: "Not Authorization",
        data: null
    }
}

export function FailCode(msg: string, code: number): Result {
    return <Result>{
        code: code,
        msg: msg,
        data: null
    }
}

export function Fail(msg: string): Result {
    return <Result>{
        code: StatusCode.ERROR,
        msg: msg,
        data: null
    }
}
export function Ok(data: any): Result {
    return <Result>{
        code: StatusCode.OK,
        msg: "ok",
        data: data
    }
}
export function Build(data: any, msg: string): Result {
    return <Result>{
        code: StatusCode.OK,
        msg: msg,
        data: data
    }
}
const StatusCode = {
    OK: 200,
    ERROR: 500,
    NotAuth: 401
}

export interface AuthToken {
    token: string
}

export interface User {
    id: number
    name: string
    login: string
    avatar_url: string
    role?: 'admin' | 'user'
    canViewAll?: boolean
    storageQuota?: number
    storageUsed?: number
    uploadCount?: number
}

// D1 数据库用户记录
export interface DbUser {
    id: number
    github_id: number
    login: string
    name: string | null
    avatar_url: string | null
    role: 'admin' | 'user'
    can_view_all: number  // 0 or 1
    storage_quota: number
    storage_used: number
    upload_count: number
    created_at: string
    last_login_at: string | null
}

// D1 图片记录
export interface DbImage {
    id: number
    key: string
    user_id: number | null
    user_login: string
    original_name: string | null
    size: number
    mime_type: string | null
    folder: string
    tags: string | null
    is_public: number
    view_count: number
    download_count: number
    expires_at: string | null
    created_at: string
}

// 用户统计信息
export interface UserStats {
    totalImages: number
    totalSize: number
    totalViews: number
    recentUploads: number  // 最近7天
}

export default StatusCode
