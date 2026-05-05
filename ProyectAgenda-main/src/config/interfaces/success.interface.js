/**
 * Interfaz para respuestas exitosas en formato JSON.
 * @typedef {Object} SuccessResponse
 * @property {boolean} success - Indica si la operación fue exitosa.
 * @property {string} message - Mensaje descriptivo de la respuesta.
 * @property {Object} [data] - Información adicional opcional de la respuesta.
 * @property {number} status - Código de estado HTTP de la respuesta.
 */

module.exports = {
    successResponse: (message, data, status) => ({
        success: true,
        message: message || "Operación realizada correctamente.",
        data: data || null,
        status: status || 200,
        timestamp: new Date().toISOString(),
    })
};