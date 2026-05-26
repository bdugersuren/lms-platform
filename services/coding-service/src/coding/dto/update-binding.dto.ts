import { PartialType } from '@nestjs/swagger';
import { CreateBindingDto } from './create-binding.dto';

export class UpdateBindingDto extends PartialType(CreateBindingDto) {}
