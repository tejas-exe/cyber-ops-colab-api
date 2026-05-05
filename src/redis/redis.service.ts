import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
    private client: Redis;
    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
        });
    }

    async setUserOnline(userId: string, socketId: string) {
        await this.client.hset('online_users', userId, socketId);
    }

    async setIsUserTyping(userId: string, socketId: string, status: string) {
        await this.client.hset(`typing_status-${userId}-${socketId}`, status)
    }
}
