export class RemnawaveContractDriftError extends Error {
  public readonly path: string;

  public constructor(message: string, path: string) {
    super(message);
    this.name = 'RemnawaveContractDriftError';
    this.path = path;
  }
}

export class RemnawaveApiError extends Error {
  public readonly statusCode: number;
  public readonly details: unknown;

  public constructor(statusCode: number, message: string, details: unknown) {
    super(message);
    this.name = 'RemnawaveApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}
