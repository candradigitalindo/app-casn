import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// Update tidak memerlukan password — ada endpoint tersendiri untuk ganti password (Phase selanjutnya)
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {}
