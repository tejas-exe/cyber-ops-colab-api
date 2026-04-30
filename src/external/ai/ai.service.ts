import { Injectable } from '@nestjs/common';
import { HfInference } from '@huggingface/inference';

@Injectable()
export class AiService {
    private hf: HfInference | null = null;

    constructor() {
        if (process.env.HF_API_KEY) {
            this.hf = new HfInference(process.env.HF_API_KEY);
        }
    }

    async getSuggestion(description: string): Promise<string[]> {
        if (!this.hf) {
            return [
                'Add HF_API_KEY in .env',
                'Check vendor patches',
                'Apply mitigation controls',
            ];
        }

        try {
            const response = await this.hf.chatCompletion({
                model: 'mistralai/Mistral-7B-Instruct-v0.2',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a cybersecurity expert giving short fixes.',
                    },
                    {
                        role: 'user',
                        content: `Suggest fixes:\n${description}`,
                    },
                ],
                max_tokens: 150,
                temperature: 0.1,
            });

            const text = response.choices?.[0]?.message?.content ?? '';
            if (text) {
                return text
                    .split('\n')
                    .map((l) => l.replace(/^[-*•]\s*/, '').trim())
                    .filter((l) => l.length > 5);
            }
        } catch {
            return ['AI suggestion failed'];
        }

        // Ensure a value is always returned
        return ['AI suggestion failed'];
    }
}