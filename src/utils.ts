import {BinaryLike, createHash} from "crypto";
import * as fs from 'fs'
import axios from 'axios'

export const toObject = <T = any>(data: any) => {
    if (Buffer.isBuffer(data)) return JSON.parse(data.toString()) as T;
    if (typeof data === 'object') return data as T;
    if (typeof data === 'string') return JSON.parse(data) as T;
    // return String(data);
};
/** md5 hash */
export const md5 = (data: BinaryLike) => createHash("md5").update(data).digest().toString('hex');
export function isEmpty<T>(data: T) {
    if (!data) return true;
    if (typeof data !== "object") return false
    return Reflect.ownKeys(data).length === 0;
}

export function remove<T>(list: T[], item: T) {
    const index = list.indexOf(item);
    if (index !== -1) list.splice(index, 1);
}
export async function getBase64FromLocal(filepath:string){
    return (await fs.readFileSync(filepath.replace("file://", ""))).toString('base64')
}
export async function getBase64FromWeb(url:string){
    const res = await axios.get(url,{
        responseType:'arraybuffer'
    })
    return Buffer.from(res.data).toString('base64')
}
export function getFileBase64(file:string|Buffer){
    if(Buffer.isBuffer(file)) return file.toString('base64')
    if(file.startsWith('http')) return getBase64FromWeb(file)
    try { return getBase64FromLocal(file) } catch {}
    return file
}
export function deepClone<T extends object>(obj: T) {
    if (typeof obj !== "object") return obj
    if (Array.isArray(obj)) return obj.map(deepClone)
    const Constructor = obj.constructor;

    let newObj: T = Constructor()
    for (let key in obj) {
        newObj[key] = deepClone(obj[key as any])
    }
    return newObj;

}

/**
 * 寻找数组中最后一个符合条件的元素下标
 * @param list 数组
 * @param predicate 条件
 * @returns {number} 元素下标，未找到返回-1
 */
export function findLastIndex<T>(list: T[], predicate: (item: T, index: number) => boolean) {
    for (let i = list.length - 1; i >= 0; i--) {
        if (predicate(list[i], i)) return i;
    }
    return -1;
}

export function trimQuote(str: string) {
    const quotes: string[][] = [
        [
            '"',
            '"',
        ],
        [
            "'",
            "'",
        ],
        [
            '`',
            '`',
        ],
        [
            '“',
            '”',
        ],
        [
            '‘',
            '’',
        ]
    ]
    for (let i = 0; i < quotes.length; i++) {
        const [start, end] = quotes[i];
        if (str.startsWith(start) && str.endsWith(end)) {
            return str.slice(1, -1);
        }
    }
    return str;
}
