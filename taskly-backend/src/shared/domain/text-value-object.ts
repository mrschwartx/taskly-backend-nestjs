import { ValidationError } from './errors.js';

export interface TextRules {
  label: string;
  minLength: number;
  maxLength: number;
  defaultValue?: string;
  allowedValues?: readonly string[];
}

export const normalizeText = (raw: unknown, rules: TextRules): string => {
  const candidate = raw === undefined ? rules.defaultValue : raw;
  if (typeof candidate !== 'string') {
    throw new ValidationError(`${rules.label} is required`);
  }
  const value = candidate.trim();
  if (value.length < rules.minLength || value.length > rules.maxLength) {
    throw new ValidationError(
      `${rules.label} must be between ${rules.minLength} and ${rules.maxLength} characters`,
    );
  }
  if (rules.allowedValues && !rules.allowedValues.includes(value)) {
    throw new ValidationError(
      `${rules.label} must be one of: ${rules.allowedValues.join(', ')}`,
    );
  }
  return value;
};

export abstract class TextValueObject<TValue extends string = string> {
  protected constructor(readonly value: TValue) {
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return (
      other instanceof this.constructor &&
      (other as TextValueObject).value === this.value
    );
  }
}
