import { Test, TestingModule } from '@nestjs/testing';
import { EpssService } from './epss.service';

describe('EpssService', () => {
  let service: EpssService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EpssService],
    }).compile();

    service = module.get<EpssService>(EpssService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
