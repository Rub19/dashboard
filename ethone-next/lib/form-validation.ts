"use client";

import { useCallback, useMemo, useState } from "react";

export type Validator = (value: unknown) => string | null;
export type FieldValidator = (message?: string) => Validator;
export type FormSchema<T extends Record<string, string>> = {
  [K in keyof T]: Validator[];
};
export type FormErrors<T extends Record<string, string>> = Partial<Record<keyof T, string>>;
export type FormTouched<T extends Record<string, string>> = Partial<Record<keyof T, boolean>>;

export function required(message = "Ce champ est requis."): Validator {
  return (value) => {
    const v = value === null || value === undefined ? "" : String(value);
    return v.trim() === "" ? message : null;
  };
}

export function minLength(min: number, message?: string): Validator {
  const defaultMessage = `Saisissez au moins ${min} caractères.`;
  return (value) => {
    const v = value === null || value === undefined ? "" : String(value);
    return v.length < min ? (message ?? defaultMessage) : null;
  };
}

export function maxLength(max: number, message?: string): Validator {
  const defaultMessage = `Limitez ce champ à ${max} caractères.`;
  return (value) => {
    const v = value === null || value === undefined ? "" : String(value);
    return v.length > max ? (message ?? defaultMessage) : null;
  };
}

export function pattern(regex: RegExp, message = "Cette valeur ne respecte pas le format attendu."): Validator {
  return (value) => {
    const v = value === null || value === undefined ? "" : String(value);
    return v && !regex.test(v) ? message : null;
  };
}

export function email(message = "Saisissez une adresse e-mail valide."): Validator {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern(regex, message);
}

export function oneOf(values: unknown[], message = "Cette valeur n'est pas autorisée."): Validator {
  return (value) => (values.includes(value) ? null : message);
}

export function match(otherValue: string | (() => string), message = "Les valeurs ne correspondent pas."): Validator {
  return (value) => {
    const expected = typeof otherValue === "function" ? otherValue() : otherValue;
    return String(value ?? "") !== expected ? message : null;
  };
}

export function passwordStrength(
  message = "12 caractères minimum, avec majuscule, minuscule, chiffre et symbole."
): Validator {
  return (value) => {
    const v = String(value ?? "");
    const strong =
      v.length >= 12 &&
      /[A-Z]/.test(v) &&
      /[a-z]/.test(v) &&
      /\d/.test(v) &&
      /[^A-Za-z0-9]/.test(v);
    return strong ? null : message;
  };
}

export function validate(value: unknown, validators: Validator[]): string | null {
  for (const validator of validators) {
    const error = validator(value);
    if (error) return error;
  }
  return null;
}

export function validateForm<T extends Record<string, string>>(
  values: T,
  schema: FormSchema<T>
): { valid: boolean; errors: FormErrors<T> } {
  const errors = {} as FormErrors<T>;
  let valid = true;

  for (const key of Object.keys(schema) as (keyof T)[]) {
    const error = validate(values[key], schema[key]);
    if (error) {
      errors[key] = error;
      valid = false;
    }
  }

  return { valid, errors };
}

export function useForm<T extends Record<string, string>>(
  schema: FormSchema<T>,
  initialValues: T
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<FormTouched<T>>({});

  const validateField = useCallback(
    (name: keyof T, nextValue = values[name]) => {
      const validators = schema[name];
      if (!validators) return null;
      const error = validate(nextValue, validators);
      setErrors((prev) => ({ ...prev, [name]: error }));
      return error;
    },
    [schema, values]
  );

  const validateAll = useCallback(() => {
    const result = validateForm(values, schema);
    setErrors(result.errors);
    return result.valid;
  }, [values, schema]);

  const setValue = useCallback(
    (name: keyof T, value: string) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      if (touched[name]) {
        validateField(name, value as T[keyof T]);
      }
    },
    [touched, validateField]
  );

  const handleBlur = useCallback(
    (name: keyof T) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      validateField(name);
    },
    [validateField]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const isValid = useMemo(() => {
    const result = validateForm(values, schema);
    return result.valid;
  }, [values, schema]);

  return {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setValues,
    setErrors,
    setTouched,
    handleBlur,
    validateAll,
    validateField,
    reset,
  };
}
