import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { v4 as uuid } from 'uuid';
import { MinioService } from '../minio/minio.service';

@Injectable()
export class GeneratorService {
  private readonly logger = new Logger(GeneratorService.name);
  private readonly appPublicUrl: string;

  constructor(
    private readonly minio: MinioService,
    private readonly config: ConfigService,
  ) {
    this.appPublicUrl = config.get<string>('APP_PUBLIC_URL', 'http://localhost:3002');
  }

  async generateQrCode(verifyCode: string): Promise<string> {
    const verifyUrl = `${this.appPublicUrl}/certificates/verify/${verifyCode}`;
    try {
      const pngBuffer = await QRCode.toBuffer(verifyUrl, {
        type: 'png',
        width: 300,
        margin: 2,
        color: { dark: '#1e3a5f', light: '#ffffff' },
      });
      const key = `certificates/qr/${uuid()}.png`;
      const url = await this.minio.upload(pngBuffer, key, 'image/png');
      return url;
    } catch (err) {
      this.logger.warn('QR code generation failed, using fallback data URL', err);
      const dataUrl = await QRCode.toDataURL(verifyUrl, { width: 300, margin: 2 });
      return dataUrl;
    }
  }
}
