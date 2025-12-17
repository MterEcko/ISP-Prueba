// Auto-generado por sync-plugin-views.js - NO EDITAR MANUALMENTE
// Este archivo mapea nombres de plugins a sus componentes Vue

import EmailConfig from './EmailConfig.vue';
import JellyfinConfig from './JellyfinConfig.vue';
import MercadopagoConfig from './MercadopagoConfig.vue';
import OpenpayConfig from './OpenpayConfig.vue';
import PaypalConfig from './PaypalConfig.vue';
import StripeConfig from './StripeConfig.vue';
import TelegramConfig from './TelegramConfig.vue';
import WhatsappMetaConfig from './WhatsappMetaConfig.vue';
import WhatsappTwilioConfig from './WhatsappTwilioConfig.vue';

export const pluginComponents = {
  'email': EmailConfig,
  'jellyfin': JellyfinConfig,
  'mercadopago': MercadopagoConfig,
  'openpay': OpenpayConfig,
  'paypal': PaypalConfig,
  'stripe': StripeConfig,
  'telegram': TelegramConfig,
  'whatsapp-meta': WhatsappMetaConfig,
  'whatsapp-twilio': WhatsappTwilioConfig
};

export function hasPluginComponent(pluginName) {
  return pluginName in pluginComponents;
}

export function getPluginComponent(pluginName) {
  return pluginComponents[pluginName] || null;
}
