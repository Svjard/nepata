export interface Logger {
  debug(msg: string, ...data: any[]): void
  info(msg: string, ...data: any[]): void
  warn(msg: string, ...data: any[]): void
  error(msg: string, ...data: any[]): void
}

export class NepataLog implements Logger {
  public debug(msg: string, ...data: any[]): void {
    this.emitLogMessage('debug', msg, data);
  }

  public info(msg: string, ...data: any[]): void {
    this.emitLogMessage('info', msg, data);
  }

  public warn(msg: string, ...data: any[]): void {
    this.emitLogMessage('warn', msg, data);
  }

  public error(msg: string, ...data: any[]): void {
    this.emitLogMessage('error', msg, data);
  }

  private emitLogMessage(type: 'debug' | 'warn' | 'info' | 'error', msg: string, data: any[]): void {
    if (data && data.length > 0) {
      console[type](msg, data)
    } else {
      console[type](msg)
    }
  }
}

export const logger = new NepataLog()
