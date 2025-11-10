import EventEmitter from 'events';
import { env } from '../config/environment';
import { logger } from '../observability/logger';

export type SecretKey = 'ADMIN_JWT_SECRET' | 'ADMIN_PASSWORD';

type SecretState = Record<SecretKey, string>;

class SecretManager extends EventEmitter {
  private secrets: SecretState;

  private timer?: NodeJS.Timeout;

  constructor() {
    super();
    this.secrets = this.readSecrets();
    this.scheduleRotation();
  }

  private readSecrets(): SecretState {
    return {
      ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET ?? env.ADMIN_JWT_SECRET,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? env.ADMIN_PASSWORD,
    } satisfies SecretState;
  }

  private scheduleRotation(): void {
    if (env.SECRET_ROTATION_INTERVAL_MS <= 0) {
      logger.warn({ event: 'secret-manager:rotation-disabled' }, 'Rotação de segredos desativada');
      return;
    }

    this.timer = setInterval(() => {
      this.rotate();
    }, env.SECRET_ROTATION_INTERVAL_MS).unref();
  }

  rotate(): void {
    this.secrets = this.readSecrets();
    logger.info({ event: 'secret-manager:rotated' }, 'Segredos sensíveis foram recarregados');
    this.emit('rotated', this.secrets);
  }

  getSecret(key: SecretKey): string {
    return this.secrets[key];
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}

export const secretManager = new SecretManager();
