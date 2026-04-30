import { Module } from '@nestjs/common';
import { AiService } from './ai/ai.service';
import { DbService } from './db/db.service';
import { EpssService } from './epss/epss.service';
import { NvdService } from './nvd/nvd.service';

@Module({
  providers: [AiService, DbService, EpssService, NvdService],
  exports: [AiService, DbService, EpssService, NvdService],
})
export class ExternalModule {}
