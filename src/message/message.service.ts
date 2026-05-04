import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MessageService {
    constructor(
        private prisma: PrismaService
    ) { }
    async saveMessage(message: string, userId: any, workSpaceId: any) {
        console.log({
            message,
            userId: userId,
            workSpaceId: workSpaceId
        });

        try {
            const messageResponse = await this.prisma.db.chats.create({
                data: {
                    message,
                    userId,
                    workspaceId: workSpaceId
                }
            })
            return messageResponse
        } catch (error) {
            console.log(error)
            throw new BadRequestException('Invalid input');
        }

    }
    async getMessages(workSpaceId: string, skip = "0", limit = "10") {
        return this.prisma.db.chats.findMany({
            where: {
                workspaceId: workSpaceId,
                deletedAt: null,
            },
            // skip: Number(skip),
            // take: Number(limit),
            orderBy: {
                createdAt: 'asc',
            },
            include: {
                user: true,
            },
        });
    }
}
