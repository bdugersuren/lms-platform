import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload } from '@lms/shared-types';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { MediaService } from './media.service';
import { UpdateMediaDto } from './dto/update-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { PresignUploadDto } from './dto/presign-upload.dto';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

@ApiTags('Media')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presign-upload')
  @ApiOperation({ summary: 'Request a presigned PUT URL for direct browser-to-MinIO upload' })
  async presignUpload(@CurrentUser() user: JwtPayload, @Body() dto: PresignUploadDto) {
    const data = await this.mediaService.createPresignedUpload(user.sub, dto);
    return ApiResponseBuilder.success(data, 'Presigned upload URL generated');
  }

  @Post('finalize/:key(*)')
  @ApiOperation({ summary: 'Finalize a direct upload after browser PUT to MinIO completes' })
  async finalizeUpload(
    @CurrentUser() user: JwtPayload,
    @Param('key') key: string,
  ) {
    const data = await this.mediaService.finalizeUpload(user.sub, key);
    return ApiResponseBuilder.success(data, 'Upload finalized');
  }

  @Post('files')
  @ApiOperation({ summary: 'Upload a file to MinIO and register metadata' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } }))
  async upload(@CurrentUser() user: JwtPayload, @UploadedFile() file: Express.Multer.File) {
    const data = await this.mediaService.upload(user.sub, file);
    return ApiResponseBuilder.success(data, 'File uploaded successfully');
  }

  @Get('files')
  @ApiOperation({ summary: 'List my media files' })
  async findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryMediaDto) {
    const data = await this.mediaService.findAll(user.sub, query);
    return ApiResponseBuilder.success(data);
  }

  @Get('files/:id')
  @ApiOperation({ summary: 'Get media file details' })
  async findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.mediaService.findOne(user.sub, id);
    return ApiResponseBuilder.success(data);
  }

  @Patch('files/:id')
  @ApiOperation({ summary: 'Update media file metadata' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMediaDto,
  ) {
    const data = await this.mediaService.update(user.sub, id, dto);
    return ApiResponseBuilder.success(data, 'Updated');
  }

  @Delete('files/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a media file from MinIO and DB' })
  async remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.mediaService.remove(user.sub, id);
  }

  @Get('presign')
  @ApiOperation({ summary: 'Generate a presigned URL for a private object' })
  @ApiQuery({ name: 'src', description: 'Full MinIO URL or object key' })
  async presign(@Query('src') src: string) {
    const data = await this.mediaService.presign(src);
    return ApiResponseBuilder.success(data, 'Presigned URL generated');
  }
}
