import { SessionsModule } from '../sessions/sessions.module';
import { Module, Global } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [JwtModule.register({}), SessionsModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
