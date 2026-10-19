import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SessionsService } from './sessions.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
