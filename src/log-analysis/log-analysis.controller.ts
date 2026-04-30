import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { LogAnalysisService } from './log-analysis.service';

@Controller('log-analysis')
export class LogAnalysisController {
    constructor(private service: LogAnalysisService) { }
    @Post()
    async uploadLogs(@Body() body: { logs: string }) {
        if (!body.logs) {
            throw new BadRequestException('log is required')
        }
        return this.service.analyze(body.logs)
    }
}
