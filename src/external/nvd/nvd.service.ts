import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NvdService {
    async getNVD(cve: string) {
        try {
            const res = await axios.get(
                `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cve}`
            );

            const vuln = res.data.vulnerabilities?.[0]?.cve;

            return {
                description:
                    vuln?.descriptions?.[0]?.value || 'No description available.',
                cvss:
                    vuln?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || '0',
            };
        } catch (error) {
            return { description: 'Error fetching data', cvss: '0' };
        }
    }
}