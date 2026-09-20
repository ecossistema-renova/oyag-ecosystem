// Apenas credenciais públicas do Supabase podem ficar neste arquivo.
// Nunca adicione service_role, access tokens ou segredos de provedores.
export const SUPABASE_URL = 'https://epbhiygonpkzlmbbsyqv.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_W6PD1uacSUSuBYjHSysdHQ_6fFi_Tur';

// Carrega o complemento de receita/despesa fixa por dia após a configuração base.
queueMicrotask(() => import('./daily-fixed-module.js').catch(error => console.warn('[OYAG Finance] Módulo de fluxo diário não carregou.', error)));
