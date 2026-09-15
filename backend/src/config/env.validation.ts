import * as Joi from 'joi';

export function validateEnvironment(config: Record<string, unknown>) {
  const schema = Joi.object({
    DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
    JWT_SECRET: Joi.string().min(32).required(),
    PORT: Joi.number().port().default(8000),
    OTP_DEVELOPMENT_MODE: Joi.boolean().default(false),
    OTP_DEVELOPMENT_CODE: Joi.string().pattern(/^\d{6}$/).when('OTP_DEVELOPMENT_MODE', { is: true, then: Joi.required() }),
    OTP_REQUEST_LIMIT: Joi.number().integer().min(1).max(10).default(3),
    OTP_MAX_ATTEMPTS: Joi.number().integer().min(1).max(10).default(5),
  }).unknown(true);
  const { error, value } = schema.validate(config);
  if (error) throw new Error(`Invalid environment configuration: ${error.message}`);
  if (value.NODE_ENV === 'production' && value.OTP_DEVELOPMENT_MODE) throw new Error('Invalid environment configuration: OTP_DEVELOPMENT_MODE must be disabled in production.');
  return value;
}
