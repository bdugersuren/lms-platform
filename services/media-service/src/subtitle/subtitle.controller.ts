import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SubtitleService } from './subtitle.service';

@ApiTags('Subtitles')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('media')
export class SubtitleController {
  constructor(private readonly subtitleService: SubtitleService) {}

  @Post('files/:id/subtitles')
  @ApiOperation({ summary: 'Upload a subtitle file (VTT or SRT) for a media file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        language: { type: 'string', example: 'mn' },
        label: { type: 'string', example: 'Монгол' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async upload(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('language') language = 'en',
    @Query('label') label = 'English',
  ) {
    const data = await this.subtitleService.upload(user.sub, id, file, language, label);
    return ApiResponseBuilder.success(data, 'Subtitle uploaded');
  }

  @Get('files/:id/subtitles')
  @ApiOperation({ summary: 'List subtitles for a media file' })
  async list(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.subtitleService.list(user.sub, id);
    return ApiResponseBuilder.success(data);
  }

  @Delete('subtitles/:subtitleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a subtitle' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('subtitleId', ParseUUIDPipe) subtitleId: string,
  ): Promise<void> {
    await this.subtitleService.remove(user.sub, subtitleId);
  }
}
