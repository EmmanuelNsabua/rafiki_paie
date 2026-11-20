export class ErreurMetier extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ErreurMetier';
    this.code = code;
    Object.setPrototypeOf(this, ErreurMetier.prototype);
  }
}
