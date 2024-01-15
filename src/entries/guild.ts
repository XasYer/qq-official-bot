export namespace Guild {
    export interface Info {
        id: string
        name: string
        icon: string
        owner_id: string
        owner: boolean
        join_time: number
        member_count: number
        max_members: number
        description: string
    }

    export type ApiInfo = Omit<Info, 'id' | 'name'> & {
        guild_id: string
        guild_name: string
    }

    export interface Role {
        id: string
        name: string
        color: string
        hoist: boolean
        number: number
        member_limit: number
    }
}
