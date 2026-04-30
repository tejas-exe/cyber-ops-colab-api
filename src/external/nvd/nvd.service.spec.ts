import { Test, TestingModule } from '@nestjs/testing';
import { NvdService } from './nvd.service';

describe('NvdService', () => {
  let service: NvdService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NvdService],
    }).compile();

    service = module.get<NvdService>(NvdService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
