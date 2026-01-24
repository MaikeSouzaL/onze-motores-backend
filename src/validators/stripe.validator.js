/**
 * Validadores para rotas do Stripe
 */

import Joi from 'joi';

/**
 * Schema de validação para criar checkout session
 */
export const checkoutSessionSchema = Joi.object({
  planType: Joi.string().valid('monthly', 'annual').required()
    .messages({
      'any.only': 'planType deve ser "monthly" ou "annual"',
      'any.required': 'planType é obrigatório',
    }),
  userId: Joi.string().required()
    .messages({
      'string.empty': 'userId não pode estar vazio',
      'any.required': 'userId é obrigatório',
    }),
  successUrl: Joi.string().uri().optional(),
  cancelUrl: Joi.string().uri().optional(),
});

/**
 * Middleware de validação para checkout
 */
export function validateCheckoutRequest(req, res, next) {
  const { error } = checkoutSessionSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    return res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      errors,
    });
  }

  next();
}

