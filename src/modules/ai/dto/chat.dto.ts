import { IsString, IsOptional, IsUUID } from 'class-validator';

export class ChatDto {
  @IsOptional()
  @IsUUID()
  session_id?: string;

  @IsString()
  content: string;
}

export class CreateSessionDto {
  @IsOptional()
  @IsString()
  title?: string;
}
