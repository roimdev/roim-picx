export interface Result {
    code: number
    msg: string
    data?: any
}

export interface ImgItem {
    key : string
    url : string
    size: number
    filename ?: string
}

export interface ImgList {
    next: boolean
    cursor ?: string
    list : Array<ImgItem>
    prefixes ?: Array<String>
}

export interface ImgReq {
    limit: number,
    cursor ?: string
    delimiter ?: string
}

// 文件夹名称
export interface Folder {
    name: string
}

export function Fail(msg : string) : Result {
    return <Result> {
        code: StatusCode.ERROR,
        msg: msg,
        data: null
    }
}
export function Ok(data : any) : Result {
    return <Result> {
        code: StatusCode.OK,
        msg: "ok",
        data: data
    }
}
export function Build(data : any, msg: string) : Result {
    return <Result> {
        code: StatusCode.OK,
        msg: msg,
        data: data
    }
}
const StatusCode = {
    OK: 200,
    ERROR: 500
}
export default StatusCode
