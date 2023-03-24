const globalObj = {}
const KEY_PEX = 'ROIM-'
class WebStorage {
    storage: Storage;
    constructor(storage: Storage) {
        this.storage = storage
    }
    get(key : string) {
        const valueStr = this.storage.getItem(KEY_PEX + key)
        if (!valueStr) {
            return ''
        }
        if (!valueStr) {
            return ''
        }
        try {
            return JSON.parse(valueStr)
        } catch (e) {
            return valueStr
        }
    }
    set(key : string, value : any) {
        const valueStr = JSON.stringify(value)
        return this.storage.setItem(KEY_PEX + key, valueStr)
    }
    remove(key : string) {
        this.storage.removeItem(KEY_PEX + key)
    }
    removeAll() {
        this.storage.clear()
    }
}
const storage = {
    local: new WebStorage(window.localStorage),
    session: new WebStorage(window.sessionStorage)
}
export default storage
