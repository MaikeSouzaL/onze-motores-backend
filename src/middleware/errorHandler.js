/**
 * Middleware de tratamento de erros
 */

export function errorHandler(err, req, res, next) {
  console.error('❌ Erro capturado:', {
    message: err.message,
    type: err.type || err.name,
    stack: err.stack,
    statusCode: err.statusCode,
  });

  // Erro do Stripe
  if (err.type === 'StripeError' || err.type?.includes('Stripe')) {
    return res.status(err.statusCode || 400).json({
      success: false,
      error: err.message,
      type: 'stripe_error',
    });
  }

  // Erro de validação
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message,
      type: 'validation_error',
    });
  }

  // Erro genérico - SEMPRE retorna detalhes em dev/produção para facilitar debug
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(statusCode).json({
    success: false,
    error: message,
    type: 'server_error',
    // Incluir detalhes técnicos para ajudar no debug (remover em prod se necessário)
    details: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });
}

