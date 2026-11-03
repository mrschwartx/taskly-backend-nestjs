import 'dotenv/config';
import { createApplication } from './bootstrap/create-application.js';
import { loadConfig, type Config } from './config/env.js';
import { AppLogger } from './shared/infrastructure/logging/app-logger.js';

const SHUTDOWN_SIGNALS: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

const bootstrap = async (): Promise<void> => {
  let config: Config;
  try {
    config = loadConfig();
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  const logger = new AppLogger(config);

  let app: Awaited<ReturnType<typeof createApplication>>;
  try {
    app = await createApplication(config);
    await app.listen(config.app.port, config.app.host);
  } catch (error) {
    const failure = error as Error;
    logger.error('Failed to start server', {
      message: failure.message,
      stack: failure.stack,
    });
    process.exit(1);
  }

  logger.info(
    `Server is running on http://${config.app.host}:${config.app.port}`,
  );

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down gracefully`);
    try {
      app.getHttpServer().closeIdleConnections();
      await app.close();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {
        message: (error as Error).message,
      });
      process.exit(1);
    }
  };

  for (const signal of SHUTDOWN_SIGNALS) {
    process.on(signal, () => void shutdown(signal));
  }
};

await bootstrap();
