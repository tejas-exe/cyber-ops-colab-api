import { Module } from '@nestjs/common';
import { ExternalModule } from '../external/external.module';
import { LogAnalysisController } from './log-analysis.controller';
import { LogAnalysisService } from './log-analysis.service';

@Module({
  imports: [ExternalModule],
  controllers: [LogAnalysisController],
  providers: [LogAnalysisService],
})
export class LogAnalysisModule {}
