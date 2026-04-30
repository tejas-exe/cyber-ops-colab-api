import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

const CSV_FILE_NAME = 'hardware_asset_registry_50000.csv';
const CSV_SPLIT_REGEX = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

interface AssetRecord {
  assetId: string;
  assetTag: string;
  status: string;
  locationCriticality: number;
  riskScore: number;
  lastScanDate: Date | null;
  lastSecurityPatchDate: Date | null;
  cveList: string[];
}

export interface DbAssetContext {
  assetsMatched: number;
  assetCriticalityScore: number;
  averageDbRiskScore: number;
  averagePatchLagDays: number;
  latestScanDate: string | null;
  latestSecurityPatchDate: string | null;
  sampleAssets: {
    assetId: string;
    assetTag: string;
    status: string;
    lastScanDate: string | null;
    lastSecurityPatchDate: string | null;
  }[];
}

@Injectable()
export class DbService {
  private recordsPromise: Promise<AssetRecord[]> | null = null;

  async getAssetContext(cve: string): Promise<DbAssetContext> {
    const normalizedCve = (cve ?? '').trim().toUpperCase();
    if (!normalizedCve) {
      return this.emptyContext();
    }

    const records = await this.getRecords();
    const matchedAssets = records.filter((record) =>
      record.cveList.includes(normalizedCve),
    );

    if (matchedAssets.length === 0) {
      return this.emptyContext();
    }

    const avgLocationCriticality =
      matchedAssets.reduce((sum, record) => sum + record.locationCriticality, 0) /
      matchedAssets.length;

    const avgRiskScore =
      matchedAssets.reduce((sum, record) => sum + record.riskScore, 0) /
      matchedAssets.length;

    const patchLagValues = matchedAssets
      .map((record) =>
        this.daysBetween(record.lastSecurityPatchDate, record.lastScanDate),
      )
      .filter((value): value is number => value !== null);

    const averagePatchLagDays =
      patchLagValues.length > 0
        ? patchLagValues.reduce((sum, value) => sum + value, 0) /
          patchLagValues.length
        : 0;

    const latestScanDate = this.maxDate(
      matchedAssets.map((record) => record.lastScanDate),
    );

    const latestSecurityPatchDate = this.maxDate(
      matchedAssets.map((record) => record.lastSecurityPatchDate),
    );

    return {
      assetsMatched: matchedAssets.length,
      assetCriticalityScore: this.clamp((avgLocationCriticality / 5) * 10, 0, 10),
      averageDbRiskScore: this.clamp(avgRiskScore / 10, 0, 10),
      averagePatchLagDays: Number(averagePatchLagDays.toFixed(2)),
      latestScanDate: this.toIsoDate(latestScanDate),
      latestSecurityPatchDate: this.toIsoDate(latestSecurityPatchDate),
      sampleAssets: matchedAssets.slice(0, 3).map((record) => ({
        assetId: record.assetId,
        assetTag: record.assetTag,
        status: record.status,
        lastScanDate: this.toIsoDate(record.lastScanDate),
        lastSecurityPatchDate: this.toIsoDate(record.lastSecurityPatchDate),
      })),
    };
  }

  private async getRecords(): Promise<AssetRecord[]> {
    if (!this.recordsPromise) {
      this.recordsPromise = this.loadRecords();
    }

    return this.recordsPromise;
  }

  private async loadRecords(): Promise<AssetRecord[]> {
    try {
      const csvPath = this.resolveCsvPath();
      const raw = await readFile(csvPath, 'utf-8');
      const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
      if (lines.length <= 1) {
        return [];
      }

      const headers = this.parseCsvLine(lines[0]);
      const index = this.buildIndex(headers);

      return lines.slice(1).map((line) => {
        const columns = this.parseCsvLine(line);
        const cveListRaw = columns[index.cveList] ?? '';

        return {
          assetId: columns[index.assetId] ?? '',
          assetTag: columns[index.assetTag] ?? '',
          status: columns[index.assetStatus] ?? '',
          locationCriticality: this.toNumber(columns[index.locationCriticality]),
          riskScore: this.toNumber(columns[index.riskScore]),
          lastScanDate: this.parseUsDate(columns[index.lastScanDate] ?? ''),
          lastSecurityPatchDate: this.parseUsDate(
            columns[index.lastSecurityPatch] ?? '',
          ),
          cveList: cveListRaw
            .split(';')
            .map((entry) => entry.trim().toUpperCase())
            .filter(Boolean),
        };
      });
    } catch {
      return [];
    }
  }

  private parseCsvLine(line: string): string[] {
    return line.split(CSV_SPLIT_REGEX).map((value) => {
      const trimmed = value.trim();
      const unquoted = trimmed.replace(/^"(.*)"$/, '$1');
      return unquoted.replace(/""/g, '"');
    });
  }

  private resolveCsvPath(): string {
    const directPath = join(process.cwd(), 'ai_db', CSV_FILE_NAME);
    if (existsSync(directPath)) {
      return directPath;
    }

    return join(process.cwd(), 'backend', 'ai_db', CSV_FILE_NAME);
  }

  private buildIndex(headers: string[]) {
    return {
      assetId: headers.indexOf('asset_id'),
      assetTag: headers.indexOf('asset_tag'),
      assetStatus: headers.indexOf('asset_status'),
      locationCriticality: headers.indexOf('location_criticality'),
      riskScore: headers.indexOf('risk_score'),
      lastScanDate: headers.indexOf('last_scan_date'),
      lastSecurityPatch: headers.indexOf('last_security_patch'),
      cveList: headers.indexOf('cve_list'),
    };
  }

  private toNumber(value: string | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private parseUsDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const [month, day, year] = value.split('/').map(Number);
    if (!month || !day || !year) {
      return null;
    }

    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  private daysBetween(from: Date | null, to: Date | null): number | null {
    if (!from || !to) {
      return null;
    }

    const diff = to.getTime() - from.getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  }

  private maxDate(dates: Array<Date | null>): Date | null {
    const validDates = dates.filter((date): date is Date => !!date);
    if (validDates.length === 0) {
      return null;
    }

    return validDates.reduce((latest, date) =>
      date.getTime() > latest.getTime() ? date : latest,
    );
  }

  private toIsoDate(date: Date | null): string | null {
    return date ? date.toISOString().slice(0, 10) : null;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private emptyContext(): DbAssetContext {
    return {
      assetsMatched: 0,
      assetCriticalityScore: 0,
      averageDbRiskScore: 0,
      averagePatchLagDays: 0,
      latestScanDate: null,
      latestSecurityPatchDate: null,
      sampleAssets: [],
    };
  }
}
