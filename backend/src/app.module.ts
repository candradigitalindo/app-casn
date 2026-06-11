import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'fs';
import { join } from 'path';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import configuration from './config/configuration';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LocationsModule } from './modules/locations/locations.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { InstallationsModule } from './modules/installations/installations.module';
import { StagesModule } from './modules/stages/stages.module';
import { BeritaAcaraModule } from './modules/berita-acara/berita-acara.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PersonnelModule } from './modules/personnel/personnel.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { EventsModule } from './modules/events/events.module';
import { ReportsModule } from './modules/reports/reports.module';
import { JobsModule } from './jobs/jobs.module';

const FRONTEND_DIST =
  process.env.FRONTEND_DIST || join(__dirname, '..', '..', 'frontend', 'out');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),

    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Deployment monolith: sajikan hasil `next build` (static export) dari
    // frontend/out. Hanya aktif di production — di dev frontend dilayani
    // `next dev` di port 3000.
    ...(process.env.NODE_ENV === 'production' && existsSync(FRONTEND_DIST)
      ? [
          ServeStaticModule.forRoot({
            rootPath: FRONTEND_DIST,
            exclude: ['/api/(.*)', '/api-docs/(.*)'],
            serveStaticOptions: {
              // Next.js di-export dengan trailingSlash: setiap route berupa
              // folder/index.html, jadi /locations → 301 /locations/ → index.html.
              extensions: ['html'],
            },
          }),
        ]
      : []),

    // BullMQ global connection (semua queue pakai ini jika tidak override)
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host') ?? 'localhost',
          port: config.get<number>('redis.port') ?? 6379,
        },
      }),
      inject: [ConfigService],
    }),

    PrismaModule,

    // WebSocket gateway — global, harus sebelum modul yang inject EventsGateway
    EventsModule,

    // Phase 1
    AuthModule,
    UsersModule,

    // Phase 2
    LocationsModule,
    LogisticsModule,

    // Phase 3
    IncidentsModule,
    InstallationsModule,
    StagesModule,
    BeritaAcaraModule,

    // Phase 4
    AttendanceModule,
    PersonnelModule,
    DocumentsModule,

    // Phase 5
    ReportsModule,
    JobsModule,
  ],
  providers: [
    // Audit trail otomatis untuk semua operasi tulis (POST/PUT/PATCH/DELETE)
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
