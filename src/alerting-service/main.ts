import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AlertingAppModule } from './alerting-app.module';

async function bootstrap() {
  const app = await NestFactory.create(AlertingAppModule);
  const port = process.env.PORT || 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Vantra alerting service listening on port ${port}`);
}
bootstrap();
