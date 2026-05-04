import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule { }
