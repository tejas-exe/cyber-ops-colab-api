import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EpssService {
    async getEPSS(cve: string) {
        try {
            const res = await axios.get(
                `https://api.first.org/data/v1/epss?cve=${cve}`
            );

            return {
                epss: res.data.data?.[0]?.epss || '0',
            };
        } catch {
            return { epss: '0' };
        }
    }
}