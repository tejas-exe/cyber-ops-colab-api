import { Injectable } from '@nestjs/common';
import { extractCVEs } from '../common/utils/cve.utils';
import { AiService } from '../external/ai/ai.service';
import { DbService } from '../external/db/db.service';
import { EpssService } from '../external/epss/epss.service';
import { NvdService } from '../external/nvd/nvd.service';

// OPTIONAL (recommended for 429 issues)
// npm install p-limit
import pLimit from 'p-limit';

@Injectable()
export class LogAnalysisService {
  constructor(
    private readonly nvdService: NvdService,
    private readonly epssService: EpssService,
    private readonly aiService: AiService,
    private readonly dbService: DbService,
  ) { }

  async analyze(logs: string) {
    if (!logs) {
      return { message: 'Logs required', data: [] };
    }

    let cves = extractCVEs(logs);

    if (cves.length === 0) {
      return { message: 'No CVEs found', data: [] };
    }

 
    cves = cves.slice(0, 10);

    const limit = pLimit(3); 

    const results = await Promise.all(
      cves.map((cve) =>
        limit(async () => {
          try {
            const [nvd, epss, assetContext] = await Promise.all([
              this.nvdService.getNVD(cve),
              this.epssService.getEPSS(cve),
              this.dbService.getAssetContext(cve),
            ]);

            const fix = await this.aiService.getSuggestion(
              nvd.description,
            );

            const cvssVal = Number(nvd.cvss) || 0;
            const epssVal = Number(epss.epss) || 0;

            const epssNormalized = this.clamp(epssVal * 10, 0, 10);
            const dateRiskBoost = this.clamp(
              assetContext.averagePatchLagDays / 30,
              0,
              10,
            );

            const riskScore =
              0.3 * cvssVal +
              0.2 * epssNormalized +
              0.2 * assetContext.assetCriticalityScore +
              0.15 * assetContext.averageDbRiskScore +
              0.15 * dateRiskBoost;

            return {
              cve,
              cvss: cvssVal,
              epss: epssVal,
              risk: parseFloat(riskScore.toFixed(2)),
              description: nvd.description,
              dates: {
                latestScanDate: assetContext.latestScanDate,
                latestSecurityPatchDate:
                  assetContext.latestSecurityPatchDate,
                averagePatchLagDays:
                  assetContext.averagePatchLagDays,
              },
              assetContext,
              fix,
            };
          } catch (error) {
            // ✅ Fail-safe (so one CVE doesn't break all)
            return {
              cve,
              error: 'Failed to process CVE',
            };
          }
        }),
      ),
    );

    return { data: results };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}