import { PartialType } from '@nestjs/swagger';
import { CreateInteractiveBlockDto } from './create-interactive-block.dto';

export class UpdateInteractiveBlockDto extends PartialType(CreateInteractiveBlockDto) {}
