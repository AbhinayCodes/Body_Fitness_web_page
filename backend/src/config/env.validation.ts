import * as Joi from 'joi';

export function validateEnvironment(config: Record<string, unknown>) {
  const schema = Joi.object({
    DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
    JWT_SECRET: Joi.string().min(32).required(),
    PORT: Joi.number().port().default(8000),
  }).unknown(true);
  const { error, value } = schema.validate(config);
  if (error) throw new Error(`Invalid environment configuration: ${error.message}`);
  return value;
}
