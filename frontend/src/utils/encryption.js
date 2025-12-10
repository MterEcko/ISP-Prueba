// isp-system/backend/src/utils/encryption.js
const crypto = require('crypto');
class EncryptionUtil {
constructor(key = null) {
// Usar clave del ambiente o generar basada en hardware ID
this.algorithm = 'aes-256-cbc';
this.key = key || this.deriveKey(process.env.ENCRYPTION_KEY || 'default-key');
}
/**

Derivar clave de 32 bytes desde una string
*/
deriveKey(password) {
return crypto.scryptSync(password, 'salt', 32);
}

/**

Cifrar texto
*/
encrypt(text) {
try {
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
let encrypted = cipher.update(text, 'utf8', 'hex');
encrypted += cipher.final('hex');
// Retornar IV + encrypted
return iv.toString('hex') + ':' + encrypted;
} catch (error) {
throw new Error(Encryption failed: ${error.message});
}
}

/**

Descifrar texto
*/
decrypt(encryptedText) {
try {
const parts = encryptedText.split(':');
const iv = Buffer.from(parts[0], 'hex');
const encrypted = parts[1];
const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
let decrypted = decipher.update(encrypted, 'hex', 'utf8');
decrypted += decipher.final('utf8');
return decrypted;
} catch (error) {
throw new Error(Decryption failed: ${error.message});
}
}

/**

Hash de un valor (one-way)
*/
hash(text) {
return crypto
.createHash('sha256')
.update(text)
.digest('hex');
}

/**

Generar token aleatorio
*/
generateToken(length = 32) {
return crypto.randomBytes(length).toString('hex');
}

/**

Comparar hash
*/
compareHash(text, hash) {
return this.hash(text) === hash;
}
}

// Instancia singleton
let instance = null;
module.exports = {
getInstance: (key = null) => {
if (!instance) {
instance = new EncryptionUtil(key);
}
return instance;
},
EncryptionUtil
};
