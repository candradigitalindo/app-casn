import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DecimalTransformInterceptor } from './common/interceptors/decimal-transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global prefix
  app.setGlobalPrefix('api');

  // Cookie parser (untuk refresh token via httpOnly cookie)
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: config.get<string>('frontendUrl'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // false: field tak dikenal dari frontend di-strip diam-diam, bukan 400.
      // Frontend lama mengirim field ekstra (createdBy, id, timestamps) pada beberapa request.
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Konversi Prisma Decimal → number (latitude/longitude untuk peta frontend)
  app.useGlobalInterceptors(new DecimalTransformInterceptor());

  // Swagger — hanya di development
  if (config.get<string>('nodeEnv') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CASN Selection Management API')
      .setDescription('API untuk Sistem Pengelolaan Pelaksanaan Seleksi CASN')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Auth', 'Login, logout, refresh token')
      .addTag('Users', 'Manajemen pengguna')
      .addTag('Locations', 'Manajemen titik lokasi')
      .addTag('Logistics', 'Logistik dan inventaris')
      .addTag('Installations', 'Progress instalasi')
      .addTag('Incidents', 'Tiket insiden dan SLA')
      .addTag('Attendance', 'Absensi peserta')
      .addTag('Stages', 'Tahapan pekerjaan')
      .addTag('Personnel', 'SDM lapangan')
      .addTag('Documents', 'Dokumen lokasi')
      .addTag('Berita Acara', 'Berita acara digital')
      .addTag('Reports', 'Laporan dan audit trail')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get<number>('port') ?? 4000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}/api`);
  logger.log(`Swagger docs: http://localhost:${port}/api-docs`);
}

bootstrap();
