import axios, {AxiosInstance} from "axios";
import {WebSocket} from "ws";
import * as log4js from 'log4js'
import {EventEmitter} from "events";
import {SessionManager} from "./sessionManager";
import {Dict, LogLevel} from "@/types";
import {GroupMessageEvent, GuildMessageEvent, PrivateMessageEvent} from "@/event";
import {EventMap, EventParserMap, QQEvent} from "@/event";
import {Bot} from "./bot";
import {Intent} from "@/constans";

export class QQBot extends EventEmitter {
    request: AxiosInstance
    self_id: string
    nickname: string
    status: number
    logger: log4js.Logger
    ws: WebSocket
    sessionManager: SessionManager

    constructor(public config: QQBot.Config) {
        super()
        this.sessionManager = new SessionManager(this)
        this.request = axios.create({
            baseURL: this.config.sandbox ? 'https://sandbox.api.sgroup.qq.com' : `https://api.sgroup.qq.com`,
            timeout: config.timeout || 5000,
            headers: {
                'User-Agent': `BotNodeSDK/0.0.1`
            }
        })
        this.request.interceptors.request.use((config) => {
            config.headers['Authorization'] = `QQBot ${this.sessionManager.access_token}`
            config.headers['X-Union-Appid'] = this.config.appid
            if (config['rest']) {
                const restObj = config['rest']
                delete config['rest']
                for (const key in restObj) {
                    config.url = config.url.replace(':' + key, restObj[key])
                }
            }
            return config
        })
        this.logger = log4js.getLogger(`[QQBot:${this.config.appid}]`)
        this.logger.level = this.config.logLevel ||= 'info'
    }

    removeAt(payload: Dict) {
        if (this.config.removeAt === false) return;
        const reg = new RegExp(`<@!${this.self_id}>`)
        const isAtMe = reg.test(payload.content) && payload.mentions.some((mention: Dict) => mention.id === this.self_id)
        if (!isAtMe) return
        payload.content = payload.content.replace(reg, '').trimStart()
    }

    processPayload(event_id: string, event: string, payload: Dict) {
        let [post_type, ...sub_type] = event.split('.')
        const result: Dict = {
            event_id,
            post_type,
            [`${post_type}_type`]: sub_type.join('.'),
            ...payload
        }
        const parser = EventParserMap.get(event)
        if (!parser) return result
        return parser.apply(this as unknown as Bot, [event, result])
    }


    dispatchEvent(event: string, wsRes: any) {
        this.logger.debug(event, wsRes)
        const payload = wsRes.d;
        const event_id = wsRes.id || '';
        if (!payload || !event) return;
        const transformEvent = QQEvent[event] || 'system'
        this.em(transformEvent, this.processPayload(event_id, transformEvent, payload));
    }

    em(event: string, payload: Dict) {
        const eventNames = event.split('.')
        const [post_type, detail_type, ...sub_type] = eventNames
        Object.assign(payload, {
            post_type,
            [`${post_type}_type`]: detail_type,
            sub_type: sub_type.join('.'),
            ...payload
        })
        let prefix = ''
        while (eventNames.length) {
            let fullEventName = `${prefix}.${eventNames.shift()}`
            if (fullEventName.startsWith('.')) fullEventName = fullEventName.slice(1)
            this.emit(fullEventName, payload)
            prefix = fullEventName
        }
    }

}

export interface QQBot {
    on<T extends keyof EventMap>(event: T, callback: EventMap[T]): this

    on<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>, callback: (...args: any[]) => void): this

    once<T extends keyof EventMap>(event: T, callback: EventMap[T]): this

    once<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>, callback: (...args: any[]) => void): this

    off<T extends keyof EventMap>(event: T, callback?: EventMap[T]): this

    off<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>, callback?: (...args: any[]) => void): this

    emit<T extends keyof EventMap>(event: T, ...args: Parameters<EventMap[T]>): boolean

    emit<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>, ...args: any[]): boolean

    addListener<T extends keyof EventMap>(event: T, callback: EventMap[T]): this

    addListener<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>, callback: (...args: any[]) => void): this

    addListenerOnce<T extends keyof EventMap>(event: T, callback: EventMap[T]): this

    addListenerOnce<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>, callback: (...args: any[]) => void): this

    removeListener<T extends keyof EventMap>(event: T, callback?: EventMap[T]): this

    removeListener<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>, callback?: (...args: any[]) => void): this

    removeAllListeners<T extends keyof EventMap>(event: T): this

    removeAllListeners<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>): this

}

export namespace QQBot {

    export interface Token {
        access_token: string
        expires_in: number
        cache: string
    }

    export interface Config {
        appid: string
        secret: string
        token?: string
        sandbox?: boolean
        timeout?: number
        maxRetry?: number
        /**
         * 是否移除第一个@
         */
        removeAt?: boolean
        delay?: Dict<number>
        intents?: Intent[]
        logLevel?: LogLevel
    }

    export function getFullTargetId(message: GuildMessageEvent | GroupMessageEvent | PrivateMessageEvent) {
        switch (message.message_type) {
            case "direct":
                return `direct-${message.guild_id}`
            case "private":
                return `private-${message.user_id}`
            case "group":
                return `group-${(message as GroupMessageEvent).group_id}:${message.user_id}`
            case "guild":
                return `guild-${(message as GuildMessageEvent).channel_id}:${message.user_id}`
        }
    }
}
