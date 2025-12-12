// Auto-generado por sync-plugin-views.js - NO EDITAR MANUALMENTE
// Este archivo mapea nombres de plugins a sus componentes Vue

import EmailConfig from './EmailConfig.vue';
import JellyfinConfig from './JellyfinConfig.vue';
import MercadopagoConfig from './MercadopagoConfig.vue';
import OpenpayConfig from './OpenpayConfig.vue';
import PaypalConfig from './PaypalConfig.vue';
import StripeConfig from './StripeConfig.vue';

export const pluginComponents = {
  'email': EmailConfig,
  'jellyfin': JellyfinConfig,
  'mercadopago': MercadopagoConfig,
  'openpay': OpenpayConfig,
  'paypal': PaypalConfig,
  'stripe': StripeConfig
};

export function hasPluginComponent(pluginName) {
  return pluginName in pluginComponents;
}

export function getPluginComponent(pluginName) {
  return pluginComponents[pluginName] || null;
}
