const crypto = require('crypto');

// Clave de cifrado - En producción usar variables de entorno
const SECRET_KEY = process.env.CRYPTO_SECRET_KEY || 'Mi-Clave-Secreta-Para-Cifrado-12345';
const IV_LENGTH = 16; // AES bloque estándar

function encrypt(text) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc', 
      Buffer.from(SECRET_KEY), 
      iv
    );
    
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Error al cifrar:', error);
    return text; // En caso de error, devolver texto original
  }
}

function decrypt(text) {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      Buffer.from(SECRET_KEY), 
      iv
    );
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error('Error al descifrar:', error);
    return text; // En caso de error, devolver texto original
  }
}

module.exports = {
  encrypt,
  decrypt
};