import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GineeClient as GineeClientType } from '@yaotoshi/ginee-sdk';

@Injectable()
export class GineeService implements OnModuleInit {
  private _client: GineeClientType | null = null;

  constructor(private readonly config: ConfigService) {}

  get client(): GineeClientType {
    if (!this._client) {
      throw new Error('GineeService not initialized yet');
    }
    return this._client;
  }

  async onModuleInit(): Promise<void> {
    // ✅ ESM-safe dynamic import
    const mod = await import('@yaotoshi/ginee-sdk');
    const GineeClient = mod.GineeClient as unknown as new (args: {
      accessKey: string;
      secretKey: string;
    }) => GineeClientType;

    const accessKey = this.mustGet('GINEE_ACCESS_KEY');
    const secretKey = this.mustGet('GINEE_SECRET_KEY');

    this._client = new GineeClient({ accessKey, secretKey });
  }

  private mustGet(key: string): string {
    const v = this.config.get<string>(key);
    if (!v?.trim()) throw new Error(`Missing env: ${key}`);
    return v;
  }
}
