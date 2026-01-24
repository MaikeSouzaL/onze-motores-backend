/**
 * Constantes dos produtos/planos do Stripe
 *
 * IMPORTANTE: Estes IDs devem corresponder aos criados no Stripe Dashboard
 *
 * Dois modos de operação:
 * 1. useDynamicPricing: false → Usa priceId (preço fixo do Stripe)
 * 2. useDynamicPricing: true → Usa productId + preço configurado (preço dinâmico)
 */

export const STRIPE_PRODUCTS = {
  monthly: {
    priceId: "price_1SmjQ3DzsooY9dEF9Qu0FZlX", // R$ 29,90/mês
    productId: "prod_TkDrQicmYiqkoN", // Product ID para modo dinâmico
    name: "Plano Mensal - Onze Motores",
  },
  annual: {
    priceId: "price_1SmjQjDzsooY9dEF1ldvTnGE", // R$ 288,00/ano
    productId: "prod_TkDsSzlG2ILRd9", // Product ID para modo dinâmico
    name: "Plano Anual - Onze Motores",
  },
};
