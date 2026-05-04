import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LogAnalysisModule } from './log-analysis/log-analysis.module';
import { ExternalModule } from './external/external.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { UserModule } from './user/user.module';
import { ChatGateway } from './chat/chat.gateway';
import { RedisModule } from './redis/redis.module';
import { MessageModule } from './message/message.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    LogAnalysisModule,
    ExternalModule,
    AuthModule,
    WorkspaceModule,
    UserModule,
    RedisModule,
    MessageModule,
  ],
  controllers: [AppController],
  providers: [AppService, ChatGateway],
})
export class AppModule { }