import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from '../external/ai/ai.service';
import { DbService } from '../external/db/db.service';
import { EpssService } from '../external/epss/epss.service';
import { NvdService } from '../external/nvd/nvd.service';
import { LogAnalysisService } from './log-analysis.service';

describe('LogAnalysisService', () => {
  let service: LogAnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogAnalysisService,
        { provide: NvdService, useValue: { getNVD: jest.fn() } },
        { provide: EpssService, useValue: { getEPSS: jest.fn() } },
        { provide: AiService, useValue: { getSuggestion: jest.fn() } },
        { provide: DbService, useValue: { getAssetContext: jest.fn() } },
      ],
    }).compile();

    service = module.get<LogAnalysisService>(LogAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
