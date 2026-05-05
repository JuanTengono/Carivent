const { Prisma } = require("@prisma/client");
const { errorResponse } = require("../config/interfaces/errors.interface");

function errorMiddleware(err, req, res, next) {
    console.error(err); // Para debug en servidor

    // 🔥 Error conocido de Prisma
    if (err instanceof Prisma.PrismaClientKnownRequestError) {

        // Unique constraint
        if (err.code === "P2002") {
            const field = err.meta?.target?.[0] || "campo";
            const value = req.body[field] || "no se encontró el valor";
            const model = err.meta?.modelName || "no se encontró el modelo";

            return res.status(400).json(
                errorResponse(`El valor '${value}' del campo '${field}' ya está registrado en el modelo '${model}'.`, null, 400)
            );
        }

        if (err.code === 'P2010') {
            const field = err.meta?.target?.[0] || "campo";
            return res.status(400).json(
                errorResponse(`El ${field} no puede modificarse`, null, 400)
            );
        }

        // Registro no encontrado
        if (err.code === "P2025") {
            return res.status(404).json(
                errorResponse("El registro no existe", null, 404)
            );
        }

        if (err.code === "P2003") {

            switch (err.meta?.constraint) {
                case "events_site_id_fkey":
                    return res.status(404).json(
                        errorResponse("El sitio no existe", null, 404)
                    );
                case "agendas_event_id_fkey":
                    return res.status(404).json(
                        errorResponse("El evento no existe", null, 404)
                    );
                case "agendas_user_id_fkey":
                    return res.status(404).json(
                        errorResponse("El usuario no existe", null, 404)
                    );
                case "tickets_event_id_fkey":
                    return res.status(404).json(
                        errorResponse("El evento no existe", null, 404)
                    );
                case "tickets_user_id_fkey":
                    return res.status(404).json(
                        errorResponse("El usuario no existe", null, 404)
                    );
                case "notifications_user_id_fkey":
                    return res.status(404).json(
                        errorResponse("El usuario no existe", null, 404)
                    );
                case "surveys_event_id_fkey":
                    return res.status(404).json(
                        errorResponse("El evento no existe", null, 404)
                    );
                case "surveys_user_id_fkey":
                    return res.status(404).json(
                        errorResponse("El usuario no existe", null, 404)
                    );
                case "survey_responses_survey_id_fkey":
                    return res.status(404).json(
                        errorResponse("La encuesta no existe", null, 404)
                    );
                case "survey_responses_user_id_fkey":
                    return res.status(404).json(
                        errorResponse("El usuario no existe", null, 404)
                    );
                case "promotions_event_id_fkey":
                    return res.status(404).json(
                        errorResponse("El evento no existe", null, 404)
                    );
                case "promotions_user_id_fkey":
                    return res.status(404).json(
                        errorResponse("El usuario no existe", null, 404)
                    );
                case "payments_event_id_fkey":
                    return res.status(404).json(
                        errorResponse("El evento no existe", null, 404)
                    );
                case "payments_user_id_fkey":
                    return res.status(404).json(
                        errorResponse("El usuario no existe", null, 404)
                    );
                case "payments_promotion_id_fkey":
                    return res.status(404).json(
                        errorResponse("La promocion no existe", null, 404)
                    );
                case "tickets_payment_id_fkey":
                    return res.status(404).json(
                        errorResponse("El pago no existe", null, 404)
                    );
                default:
                    return res.status(404).json(
                        errorResponse("El registro no existe", null, 404)
                    );
            }
        }
    }

    // Error personalizado (si tú lanzas throw new Error())
    if (err.message) {
        return res.status(400).json(
            errorResponse(err.message, null, 400)
        );
    }

    // Error desconocido
    return res.status(500).json(
        errorResponse("Error interno del servidor", null, 500)
    );
}

module.exports = errorMiddleware;
