import { BadRequestException, Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);
  private readonly client: Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endPoint = this.configService.get<string>('MINIO_ENDPOINT');
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY');

    if (!endPoint || !accessKey || !secretKey) {
      throw new Error('Missing MinIO configuration');
    }

    const port = this.configService.get<number>('MINIO_PORT', 9000);
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';

    this.client = new Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'dishes');
    const configuredPublicUrl = this.configService.get<string>('MINIO_PUBLIC_URL');
    const protocol = useSSL ? 'https' : 'http';
    const portPart = port === 80 || port === 443 ? '' : `:${port}`;
    this.publicUrl = (configuredPublicUrl || `${protocol}://${endPoint}${portPart}/${this.bucket}`).replace(/\/+$/, '');
  }

  async onModuleInit() {
    await this.ensureBucketExists();
    this.logger.log(`MinIO upload ready. bucket=${this.bucket}, publicUrl=${this.publicUrl}`);
  }

  private async ensureBucketExists() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`Created bucket: ${this.bucket}`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure MinIO bucket "${this.bucket}" exists`, error?.stack || error);
      throw new InternalServerErrorException('MinIO bucket initialization failed');
    }
  }

  async uploadImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const ext = path.extname(file.originalname || '') || '';
    const date = new Date();
    const objectKey = `images/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${uuidv4()}${ext}`;

    try {
      await this.client.putObject(this.bucket, objectKey, file.buffer, file.size, {
        'Content-Type': file.mimetype,
      });
    } catch (error) {
      this.logger.error(`Failed to upload file to MinIO: ${objectKey}`, error?.stack || error);
      throw new InternalServerErrorException('Image upload failed');
    }

    return {
      bucket: this.bucket,
      objectKey,
      url: `${this.publicUrl}/${objectKey}`,
    };
  }
}
