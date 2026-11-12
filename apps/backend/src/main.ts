import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: (process.env.WEB_APP_ORIGIN ?? "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  app.setGlobalPrefix(process.env.API_PREFIX ?? "api/v1");
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const swaggerConfig = new DocumentBuilder()
    .setTitle("DASHIFY API")
    .setDescription("Multi-tenant School ERP + LMS API")
    .setVersion("1.0.0")
    .addBearerAuth()
    .addApiKey(
      { type: "apiKey", in: "cookie", name: "dashify_access" },
      "accessCookie",
    )
    .addApiKey(
      { type: "apiKey", in: "cookie", name: "dashify_refresh" },
      "refreshCookie",
    )
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, openApiDocument, {
    jsonDocumentUrl: "docs-json",
  });
  await app.listen(Number(process.env.PORT ?? 3001));
}
void bootstrap();
