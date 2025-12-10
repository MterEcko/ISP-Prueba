// morganConfig.js
// Configuración para el middleware Morgan (HTTP request logger).

// Simulación de la inicialización de Morgan (requeriría la librería real)
// const morgan = require("morgan");
// const logger = require("./winstonConfig"); // Asumiendo que winstonConfig.js exporta un logger compatible

// // Morgan puede usar diferentes formatos predefinidos: combined, common, dev, short, tiny
// // También puede usar un formato personalizado.
// // Usaremos el stream de Winston para que los logs de Morgan vayan a los mismos transportes.

// const morganMiddleware = morgan(
//    // Formato personalizado: ":method :url :status :res[content-length] - :response-time ms :remote-addr"
//    // O un formato estándar como "combined"
//    process.env.NODE_ENV === "production" ? "combined" : "dev",
//    {
//        stream: logger.stream, // Usar el stream de Winston
//        // Opcional: skip para no loguear ciertas requests (e.g., health checks)
//        // skip: function (req, res) { return res.statusCode < 400 && req.path === "/health"; }
//    }
// );

// Simulación del middleware para que pueda ser "requerido" y usado en la app Express
const morganMiddleware = (req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const ms = Date.now() - start;
        const logMessage = `${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${res.get("Content-Length") || "-"} - ${ms}ms`;
        // Asumimos que tenemos un logger (como Winston) disponible globalmente o importado
        // Para esta simulación, usaremos console.log con un prefijo
        console.log(`(Morgan SIM HTTP Log): ${logMessage}`);
    });
    next();
};

console.log("[morganConfig.js] (Simulación) Morgan middleware configurado.");

// module.exports = morganMiddleware;
// Para que sea más fácil de integrar en el archivo principal de la app, 
// podríamos exportar una función que lo configure en la app, o el middleware directamente.
// Por ahora, este archivo sirve como documentación de cómo se configuraría.
// Si se va a requerir directamente, se exportaría el middleware:
module.exports = morganMiddleware;

