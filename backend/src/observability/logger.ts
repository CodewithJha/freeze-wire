const SECRET_KEY = /private|secret|mnemonic|authorization|api[_-]?key|relay_private|deployer_private/i;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<string, unknown>;

function redact(fields?: LogFields): LogFields | undefined {
  if (!fields) {
    return undefined;
  }
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = SECRET_KEY.test(key) ? '[redacted]' : value;
  }
  return out;
}

export function createLogger(level: LogLevel = 'info') {
  return {
    debug(msg: string, fields?: LogFields): void {
      if (level === 'debug') {
        write('debug', msg, fields);
      }
    },
    info(msg: string, fields?: LogFields): void {
      write('info', msg, fields);
    },
    warn(msg: string, fields?: LogFields): void {
      write('warn', msg, fields);
    },
    error(msg: string, fields?: LogFields): void {
      write('error', msg, fields);
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;

function write(level: LogLevel, msg: string, fields?: LogFields): void {
  const line = JSON.stringify({
    level,
    msg,
    service: 'freeze-wire-backend',
    ...redact(fields),
  });
  if (level === 'error' || level === 'warn') {
    process.stderr.write(`${line}\n`);
    return;
  }
  process.stdout.write(`${line}\n`);
}
