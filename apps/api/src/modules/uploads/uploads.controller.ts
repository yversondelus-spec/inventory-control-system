import {
  BadRequestException, Controller, Get, Post,
  Request, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${unique}-${file.originalname.replace(/\s/g, '_')}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (/\.(xlsx|xls|csv)$/i.test(file.originalname)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se aceptan .xlsx, .xls o .csv') as any, false);
        }
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async upload(@UploadedFile() file: any, @Request() req: any) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.uploadsService.processUpload(file, userId);
  }

  @Get()
  async list() {
    return this.uploadsService.getUploads();
  }
}