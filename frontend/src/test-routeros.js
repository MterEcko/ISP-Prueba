const routeros = require('routeros');

console.log('Exportaciones de routeros:', Object.keys(routeros));
console.log('Tipo de routeros:', typeof routeros);
console.log('Es routeros una función?', typeof routeros === 'function');

if (typeof routeros === 'function') {
  console.log('routeros es una función constructora');
} else if (routeros.Client) {
  console.log('routeros.Client está disponible');
} else if (routeros.RouterOSClient) {
  console.log('routeros.RouterOSClient está disponible');
}