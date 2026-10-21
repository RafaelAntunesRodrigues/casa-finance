import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
    },
  },
});

// Defesa adicional para quando o app fica exposto à internet (não apenas
// LAN): limite generoso que não atrapalha o uso normal de duas pessoas, mas
// reduz o impacto de scraping/abuso automatizado.
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Muitas requisições em pouco tempo. Aguarde um instante.',
    },
  },
});
