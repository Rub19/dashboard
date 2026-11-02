import { z } from 'zod';

function stripDefault(field: z.ZodType): z.ZodType {
  return field instanceof z.ZodDefault || field instanceof z.ZodPrefault
    ? stripDefault(field.unwrap() as z.ZodType)
    : field;
}

export function partialPatch<T extends z.ZodRawShape, C extends z.core.$ZodObjectConfig>(
  schema: z.ZodObject<T, C>,
): z.ZodObject<{ [K in keyof T]: z.ZodOptional<T[K]> }, C> {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => [key, stripDefault(field as z.ZodType).optional()]),
  );
  return schema.extend(shape) as unknown as z.ZodObject<{ [K in keyof T]: z.ZodOptional<T[K]> }, C>;
}
