const serverUrl = process.env.SWAGGER_SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "Eventos API",
    version: "1.0.0",
    description: "DocumentaciÃ³n completa del backend (mÃ³dulos 1, 2, 3 y 4) con autenticaciÃ³n JWT y permisos por rol.",
  },
  servers: [
    {
      url: serverUrl,
      description: "Servidor actual",
    },
  ],
  tags: [
    { name: "Auth", description: "AutenticaciÃ³n y gestiÃ³n de sesiÃ³n" },
    { name: "Public", description: "Catalogo publico sin autenticacion" },
    { name: "Security", description: "Roles y permisos" },
    { name: "Sites", description: "GestiÃ³n de sitios" },
    { name: "Events", description: "GestiÃ³n de eventos" },
    { name: "Agendas", description: "Itinerario de eventos" },
    { name: "Tickets", description: "BoleterÃ­a y validaciÃ³n en puerta" },
    { name: "Payments", description: "Pagos y transacciones" },
    { name: "Promotions", description: "Promociones y descuentos" },
    { name: "Notifications", description: "Sistema de notificaciones" },
    { name: "Surveys", description: "Encuestas y respuestas" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "OperaciÃ³n realizada correctamente." },
          data: { type: "object", nullable: true },
          status: { type: "integer", example: 200 },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Error en la operaciÃ³n." },
          data: { type: "object", nullable: true },
          status: { type: "integer", example: 400 },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      PublicPagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 57 },
          totalPages: { type: "integer", example: 3 },
        },
      },
      PublicSiteItem: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          name: { type: "string", example: "Centro de Convenciones" },
          imageUrl: { type: "string", format: "uri", nullable: true, example: "https://cdn.example.com/sites/movistar-arena.jpg" },
          city: { type: "string", example: "Bogota" },
          address: { type: "string", example: "Calle 123 #45-67" },
          latitude: { type: "number", format: "double", nullable: true, example: 2.9386 },
          longitude: { type: "number", format: "double", nullable: true, example: -75.2811 },
          mapsUrl: { type: "string", format: "uri", nullable: true, example: "https://www.google.com/maps/search/?api=1&query=2.9386%2C-75.2811" },
          capacity: { type: "integer", example: 500 },
          status: { type: "string", example: "ACTIVE" },
        },
      },
      PublicEventItem: {
        type: "object",
        properties: {
          id: { type: "integer", example: 101 },
          name: { type: "string", example: "Conferencia Tech" },
          description: { type: "string", example: "Evento de tecnologia" },
          imageUrl: { type: "string", format: "uri", nullable: true, example: "https://cdn.example.com/events/conferencia-tech.jpg" },
          type: { type: "string", enum: ["PUBLIC", "PRIVATE"], example: "PUBLIC" },
          status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "CONFIRMED", "CANCELLED", "COMPLETED", "ARCHIVED"], example: "CONFIRMED" },
          startTime: { type: "string", format: "date-time", example: "2026-04-10T08:00:00.000Z" },
          endTime: { type: "string", format: "date-time", example: "2026-04-10T12:00:00.000Z" },
          siteId: { type: "integer", example: 1 },
          site: {
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              name: { type: "string", example: "Centro de Convenciones" },
              imageUrl: { type: "string", format: "uri", nullable: true, example: "https://cdn.example.com/sites/movistar-arena.jpg" },
              city: { type: "string", example: "Bogota" },
              address: { type: "string", example: "Calle 123 #45-67" },
              latitude: { type: "number", format: "double", nullable: true, example: 2.9386 },
              longitude: { type: "number", format: "double", nullable: true, example: -75.2811 },
              mapsUrl: { type: "string", format: "uri", nullable: true, example: "https://www.google.com/maps/search/?api=1&query=2.9386%2C-75.2811" },
            },
          },
        },
      },
      PublicEventsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Eventos publicos obtenidos correctamente" },
          data: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { $ref: "#/components/schemas/PublicEventItem" },
              },
              pagination: { $ref: "#/components/schemas/PublicPagination" },
            },
          },
          status: { type: "integer", example: 200 },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      PublicSitesResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Sitios publicos obtenidos correctamente" },
          data: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { $ref: "#/components/schemas/PublicSiteItem" },
              },
              pagination: { $ref: "#/components/schemas/PublicPagination" },
            },
          },
          status: { type: "integer", example: 200 },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Juan PÃ©rez" },
          email: { type: "string", format: "email", example: "juan@email.com" },
          password: { type: "string", example: "12345678" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@email.com" },
          password: { type: "string", example: "123456" },
        },
      },
      LoginUserPayload: {
        type: "object",
        properties: {
          id: { type: "integer", example: 3 },
          name: { type: "string", example: "William Bonilla" },
          email: { type: "string", format: "email", example: "wsbonilladiaz@gmail.com" },
          role: { type: "string", example: "user" },
          permissions: {
            type: "array",
            items: { type: "string" },
            example: ["READ_EVENTS", "CREATE_TICKET", "READ_TICKETS"],
          },
          status: { type: "string", example: "ACTIVE" },
          emailVerified: { type: "boolean", example: false },
          emailVerifiedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Login exitoso" },
          data: {
            type: "object",
            properties: {
              user: { $ref: "#/components/schemas/LoginUserPayload" },
              token: { type: "string", example: "jwt.token.aqui" },
            },
          },
          status: { type: "integer", example: 200 },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      LogoutRequest: {
        type: "object",
        required: ["token"],
        properties: {
          token: { type: "string", example: "jwt.token.aqui" },
        },
      },
      RequestEmailVerificationRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email", example: "usuario@email.com" },
        },
      },
      VerifyEmailRequest: {
        type: "object",
        required: ["token"],
        properties: {
          token: { type: "string", example: "token_de_verificacion" },
        },
      },
      RequestPasswordResetRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email", example: "usuario@email.com" },
        },
      },
      ResetPasswordRequest: {
        type: "object",
        required: ["token", "newPassword"],
        properties: {
          token: { type: "string", example: "token_de_recuperacion" },
          newPassword: { type: "string", example: "NuevaPass123" },
        },
      },
      RoleRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "asistente" },
        },
      },
      PermissionRequest: {
        type: "object",
        required: ["name", "type"],
        properties: {
          name: { type: "string", example: "READ_EVENTS" },
          type: { type: "string", enum: ["CREATE", "READ", "UPDATE", "DELETE"], example: "READ" },
        },
      },
      AssignPermissionsRequest: {
        type: "object",
        required: ["roleId", "permissionIds"],
        properties: {
          roleId: { type: "integer", example: 2 },
          permissionIds: {
            type: "array",
            items: { type: "integer" },
            example: [8, 9, 12],
          },
        },
      },
      SiteRequest: {
        type: "object",
        required: ["name", "ubication", "direction", "phone", "email", "capacity"],
        properties: {
          name: { type: "string", example: "Centro de Convenciones" },
          ubication: { type: "string", example: "BogotÃ¡" },
          direction: { type: "string", example: "Calle 123 #45-67" },
          imageUrl: { type: "string", format: "uri", nullable: true, example: "https://cdn.example.com/sites/movistar-arena.jpg" },
          latitude: { type: "number", format: "double", example: 2.9386 },
          longitude: { type: "number", format: "double", example: -75.2811 },
          phone: { type: "string", example: "3001234567" },
          email: { type: "string", format: "email", example: "sitio@email.com" },
          capacity: { type: "integer", example: 500 },
          status: { type: "string", enum: ["ACTIVE", "INACTIVE"], example: "ACTIVE" },
        },
      },
      EventRequest: {
        type: "object",
        required: ["name", "type", "description", "startTime", "endTime", "siteId"],
        properties: {
          name: { type: "string", example: "Conferencia Tech" },
          type: { type: "string", enum: ["PUBLIC", "PRIVATE"], example: "PUBLIC" },
          status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "CONFIRMED", "CANCELLED", "COMPLETED", "ARCHIVED"], example: "PENDING" },
          description: { type: "string", example: "Evento de tecnologÃ­a" },
          imageUrl: { type: "string", format: "uri", example: "https://cdn.example.com/events/conferencia-tech.jpg" },
          ticketPrice: { type: "number", format: "float", example: 120000 },
          maxTicketsPerUser: { type: "integer", example: 4 },
          startTime: { type: "string", format: "date-time", example: "2026-04-10T08:00:00.000Z" },
          endTime: { type: "string", format: "date-time", example: "2026-04-10T12:00:00.000Z" },
          siteId: { type: "integer", example: 1 },
        },
      },
      EventDashboardSummary: {
        type: "object",
        properties: {
          event: {
            type: "object",
            properties: {
              id: { type: "integer", example: 101 },
              name: { type: "string", example: "Conferencia Tech" },
              description: { type: "string", example: "Evento de tecnologia" },
              imageUrl: { type: "string", format: "uri", nullable: true, example: "https://cdn.example.com/events/conferencia-tech.jpg" },
              status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "CONFIRMED", "CANCELLED", "COMPLETED", "ARCHIVED"], example: "CONFIRMED" },
              ticketPrice: { type: "number", format: "float", example: 120000 },
              maxTicketsPerUser: { type: "integer", example: 4 },
              startTime: { type: "string", format: "date-time", example: "2026-04-10T08:00:00.000Z" },
              endTime: { type: "string", format: "date-time", example: "2026-04-10T12:00:00.000Z" },
              site: {
                type: "object",
                properties: {
                  id: { type: "integer", example: 1 },
                  name: { type: "string", example: "Movistar Arena" },
                  imageUrl: { type: "string", format: "uri", nullable: true, example: "https://cdn.example.com/sites/movistar-arena.jpg" },
                  ubication: { type: "string", example: "Bogota" },
                  direction: { type: "string", example: "Diagonal 61C # 26-36" },
                  latitude: { type: "number", format: "double", nullable: true, example: 4.6486 },
                  longitude: { type: "number", format: "double", nullable: true, example: -74.0772 },
                  mapsUrl: { type: "string", format: "uri", nullable: true, example: "https://www.google.com/maps/search/?api=1&query=4.6486%2C-74.0772" },
                  capacity: { type: "integer", example: 14000 },
                },
              },
            },
          },
          counters: {
            type: "object",
            properties: {
              totalCapacity: { type: "integer", example: 14000 },
              available: { type: "integer", example: 11200 },
              reserved: { type: "integer", example: 300 },
              sold: { type: "integer", example: 2500 },
              used: { type: "integer", example: 1200 },
              cancelled: { type: "integer", example: 20 },
              expired: { type: "integer", example: 15 },
              soldPercentage: { type: "number", format: "float", example: 17.86 },
            },
          },
          revenue: {
            type: "object",
            properties: {
              currency: { type: "string", example: "COP" },
              total: { type: "number", format: "float", example: 300000000 },
              sold: { type: "number", format: "float", example: 300000000 },
              reserved: { type: "number", format: "float", example: 36000000 },
              used: { type: "number", format: "float", example: 144000000 },
              baseTicketPrice: { type: "number", format: "float", example: 120000 },
              maxTicketsPerUser: { type: "integer", example: 4 },
            },
          },
        },
      },
      EventsDashboardSummary: {
        type: "object",
        properties: {
          summary: {
            type: "object",
            properties: {
              currency: { type: "string", example: "COP" },
              revenue: { type: "number", format: "float", example: 18000000 },
              soldTickets: { type: "integer", example: 150 },
              activeEvents: { type: "integer", example: 3 },
            },
          },
          period: {
            type: "object",
            properties: {
              months: { type: "integer", example: 6 },
              startYear: { type: "integer", example: 2025 },
              startMonth: { type: "integer", example: 10 },
              endYear: { type: "integer", example: 2026 },
              endMonth: { type: "integer", example: 3 },
              totalRevenue: { type: "number", format: "float", example: 18000000 },
            },
          },
          monthlyRevenue: {
            type: "array",
            items: {
              type: "object",
              properties: {
                year: { type: "integer", example: 2026 },
                month: { type: "integer", example: 3 },
                label: { type: "string", example: "Mar" },
                revenue: { type: "number", format: "float", example: 4500000 },
                soldTickets: { type: "integer", example: 37 },
              },
            },
          },
        },
      },
      AgendaRequest: {
        type: "object",
        required: ["activity", "startTime", "endTime", "eventId"],
        properties: {
          activity: { type: "string", example: "Registro de asistentes" },
          startTime: { type: "string", format: "date-time", example: "2026-04-10T08:00:00.000Z" },
          endTime: { type: "string", format: "date-time", example: "2026-04-10T09:00:00.000Z" },
          eventId: { type: "integer", example: 1 },
          status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "CONFIRMED", "CANCELLED", "COMPLETED", "ARCHIVED"], example: "PENDING" },
        },
      },
      TicketRequest: {
        type: "object",
        required: ["eventId"],
        properties: {
          eventId: { type: "integer", example: 1 },
          quantity: { type: "integer", example: 2 },
          promotionCode: { type: "string", example: "DESC10" },
          paymentProvider: { type: "string", example: "manual" },
          paymentReference: { type: "string", example: "TRX-123" },
          currency: { type: "string", example: "COP" },
        },
      },
      PromotionRequest: {
        type: "object",
        required: ["code", "title", "discountType", "discountValue"],
        properties: {
          code: { type: "string", example: "DESC10" },
          title: { type: "string", example: "Descuento lanzamiento" },
          description: { type: "string", example: "Promocion para primeras compras" },
          discountType: { type: "string", enum: ["PERCENT", "FIXED"], example: "PERCENT" },
          discountValue: { type: "number", example: 10 },
          minQuantity: { type: "integer", example: 1 },
          maxUses: { type: "integer", example: 100 },
          validFrom: { type: "string", format: "date-time", example: "2026-03-08T00:00:00.000Z" },
          validTo: { type: "string", format: "date-time", example: "2026-04-01T00:00:00.000Z" },
          eventId: { type: "integer", example: 1 },
          isActive: { type: "boolean", example: true },
        },
      },
      NotificationRequest: {
        type: "object",
        required: ["title", "message", "userId"],
        properties: {
          title: { type: "string", example: "Cambio de horario" },
          message: { type: "string", example: "El evento iniciarÃ¡ 30 minutos mÃ¡s tarde" },
          userId: { type: "integer", example: 3 },
        },
      },
      RegisterNotificationDeviceRequest: {
        type: "object",
        required: ["provider", "platform", "token"],
        properties: {
          provider: { type: "string", enum: ["FCM"], example: "FCM" },
          platform: { type: "string", enum: ["ANDROID", "IOS", "WEB"], example: "ANDROID" },
          token: { type: "string", example: "fcm_device_token_example" },
        },
      },
      UnregisterNotificationDeviceRequest: {
        type: "object",
        required: ["token"],
        properties: {
          token: { type: "string", example: "fcm_device_token_example" },
        },
      },
      SurveyRequest: {
        type: "object",
        required: ["titleSurvey", "eventId"],
        properties: {
          titleSurvey: { type: "string", example: "Â¿CÃ³mo calificarÃ­as el evento?" },
          eventId: { type: "integer", example: 1 },
        },
      },
      SurveyResponseRequest: {
        type: "object",
        required: ["surveyId", "stars"],
        properties: {
          surveyId: { type: "integer", example: 1 },
          stars: { type: "integer", minimum: 1, maximum: 5, example: 5 },
          comment: { type: "string", example: "Excelente organizaciÃ³n" },
        },
      },
    },
  },
  paths: {
    "/": {
      get: {
        tags: ["Auth"],
        summary: "Health bÃ¡sico",
        responses: {
          200: { description: "OK" },
        },
      },
    },
    "/api/v1/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Registrar usuario",
        description: "Crea usuario con rol base 'user' de manera automatica. No acepta roleId en el body.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          200: { description: "Usuario registrado" },
          400: { description: "Error de validaciÃ³n", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Iniciar sesiÃ³n",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
              example: {
                email: "admin@email.com",
                password: "123456",
              },
            },
          },
        },
        responses: {
          200: { description: "Login exitoso", content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } } },
          400: { description: "Credenciales invÃ¡lidas", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Cerrar sesiÃ³n",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LogoutRequest" },
            },
          },
        },
        responses: {
          200: { description: "Logout exitoso" },
          401: { description: "No autorizado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/v1/auth/request-email-verification": {
      post: {
        tags: ["Auth"],
        summary: "Solicitar verificacion de correo",
        description: "Envio no bloqueante del correo de verificacion. Respuesta generica para no exponer existencia de usuario.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RequestEmailVerificationRequest" },
            },
          },
        },
        responses: {
          200: { description: "Solicitud procesada" },
        },
      },
    },
    "/api/v1/auth/resend-email-verification": {
      post: {
        tags: ["Auth"],
        summary: "Alias para reenviar verificacion de correo",
        deprecated: true,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RequestEmailVerificationRequest" },
            },
          },
        },
        responses: {
          200: { description: "Solicitud procesada" },
        },
      },
    },
    "/api/v1/auth/verify-email": {
      get: {
        tags: ["Auth"],
        summary: "Verificar correo por token (GET)",
        parameters: [
          { in: "query", name: "token", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Correo verificado correctamente" },
        },
      },
      post: {
        tags: ["Auth"],
        summary: "Verificar correo por token (POST)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyEmailRequest" },
            },
          },
        },
        responses: {
          200: { description: "Correo verificado correctamente" },
        },
      },
    },
    "/api/v1/auth/request-password-reset": {
      post: {
        tags: ["Auth"],
        summary: "Solicitar recuperacion de contrasena",
        description: "Envio no bloqueante del correo de recuperacion. Respuesta generica para no exponer existencia de usuario.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RequestPasswordResetRequest" },
            },
          },
        },
        responses: {
          200: { description: "Solicitud procesada" },
        },
      },
    },
    "/api/v1/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Restablecer contrasena con token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResetPasswordRequest" },
            },
          },
        },
        responses: {
          200: { description: "Contrasena actualizada correctamente" },
        },
      },
    },

    "/api/v1/public/events": {
      get: {
        tags: ["Public"],
        summary: "Catalogo publico de eventos",
        description: "No requiere token. Excluye CANCELLED y ARCHIVED por defecto.",
        parameters: [
          { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
          { in: "query", name: "limit", schema: { type: "integer", minimum: 1, default: 20 } },
          { in: "query", name: "all", schema: { type: "boolean", default: false } },
          { in: "query", name: "search", schema: { type: "string" } },
          { in: "query", name: "status", schema: { type: "string", example: "CONFIRMED" } },
          { in: "query", name: "type", schema: { type: "string", enum: ["PUBLIC", "PRIVATE"] } },
          { in: "query", name: "siteId", schema: { type: "integer" } },
          { in: "query", name: "dateFrom", schema: { type: "string", format: "date-time" } },
          { in: "query", name: "dateTo", schema: { type: "string", format: "date-time" } }
        ],
        responses: {
          200: {
            description: "Eventos publicos obtenidos correctamente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PublicEventsResponse" }
              }
            }
          }
        }
      }
    },
    "/api/v1/public/get-events": {
      get: {
        tags: ["Public"],
        summary: "Alias legado de eventos publicos",
        deprecated: true,
        parameters: [
          { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
          { in: "query", name: "limit", schema: { type: "integer", minimum: 1, default: 20 } },
          { in: "query", name: "all", schema: { type: "boolean", default: false } },
          { in: "query", name: "search", schema: { type: "string" } },
          { in: "query", name: "status", schema: { type: "string", example: "CONFIRMED" } },
          { in: "query", name: "type", schema: { type: "string", enum: ["PUBLIC", "PRIVATE"] } },
          { in: "query", name: "siteId", schema: { type: "integer" } },
          { in: "query", name: "dateFrom", schema: { type: "string", format: "date-time" } },
          { in: "query", name: "dateTo", schema: { type: "string", format: "date-time" } }
        ],
        responses: {
          200: {
            description: "Eventos publicos obtenidos correctamente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PublicEventsResponse" }
              }
            }
          }
        }
      }
    },
    "/api/v1/public/sites": {
      get: {
        tags: ["Public"],
        summary: "Catalogo publico de sitios",
        description: "No requiere token.",
        parameters: [
          { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
          { in: "query", name: "limit", schema: { type: "integer", minimum: 1, default: 20 } },
          { in: "query", name: "all", schema: { type: "boolean", default: false } },
          { in: "query", name: "search", schema: { type: "string" } },
          { in: "query", name: "city", schema: { type: "string" } }
        ],
        responses: {
          200: {
            description: "Sitios publicos obtenidos correctamente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PublicSitesResponse" }
              }
            }
          }
        }
      }
    },
    "/api/v1/public/get-sites": {
      get: {
        tags: ["Public"],
        summary: "Alias legado de sitios publicos",
        deprecated: true,
        parameters: [
          { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
          { in: "query", name: "limit", schema: { type: "integer", minimum: 1, default: 20 } },
          { in: "query", name: "all", schema: { type: "boolean", default: false } },
          { in: "query", name: "search", schema: { type: "string" } },
          { in: "query", name: "city", schema: { type: "string" } }
        ],
        responses: {
          200: {
            description: "Sitios publicos obtenidos correctamente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PublicSitesResponse" }
              }
            }
          }
        }
      }
    },
    "/api/v1/public/agendas": { get: { tags: ["Public"], summary: "Catalogo publico de agendas", parameters: [{ in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } }, { in: "query", name: "limit", schema: { type: "integer", minimum: 1, default: 20 } }, { in: "query", name: "all", schema: { type: "boolean", default: false } }, { in: "query", name: "eventId", schema: { type: "integer" } }, { in: "query", name: "search", schema: { type: "string" } }], responses: { 200: { description: "Agendas publicas obtenidas correctamente" } } } },
    "/api/v1/public/get-agendas": { get: { tags: ["Public"], summary: "Alias legado de agendas publicas", deprecated: true, parameters: [{ in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } }, { in: "query", name: "limit", schema: { type: "integer", minimum: 1, default: 20 } }, { in: "query", name: "all", schema: { type: "boolean", default: false } }, { in: "query", name: "eventId", schema: { type: "integer" } }, { in: "query", name: "search", schema: { type: "string" } }], responses: { 200: { description: "Agendas publicas obtenidas correctamente" } } } },
    "/api/v1/public/events/{id}/capacity": { get: { tags: ["Public"], summary: "Aforo publico de evento", parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Aforo publico obtenido correctamente" } } } },
    "/api/v1/security/store-role": { post: { tags: ["Security"], summary: "Crear rol", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RoleRequest" } } } }, responses: { 200: { description: "Rol creado" } } } },
    "/api/v1/security/update-role/{id}": { put: { tags: ["Security"], summary: "Actualizar rol", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RoleRequest" } } } }, responses: { 200: { description: "Rol actualizado" } } } },
    "/api/v1/security/delete-role/{id}": { delete: { tags: ["Security"], summary: "Eliminar rol", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Rol eliminado" } } } },
    "/api/v1/security/get-roles": { get: { tags: ["Security"], summary: "Listar roles", security: [{ bearerAuth: [] }], parameters: [{ in: "query", name: "page", schema: { type: "integer" } }, { in: "query", name: "limit", schema: { type: "integer" } }, { in: "query", name: "all", schema: { type: "boolean" } }], responses: { 200: { description: "Roles obtenidos" } } } },
    "/api/v1/security/get-permissions": { get: { tags: ["Security"], summary: "Listar permisos", security: [{ bearerAuth: [] }], parameters: [{ in: "query", name: "page", schema: { type: "integer" } }, { in: "query", name: "limit", schema: { type: "integer" } }, { in: "query", name: "all", schema: { type: "boolean" } }], responses: { 200: { description: "Permisos obtenidos" } } } },
    "/api/v1/security/create-permission": { post: { tags: ["Security"], summary: "Crear permiso", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PermissionRequest" } } } }, responses: { 200: { description: "Permiso creado" } } } },
    "/api/v1/security/assign-permission-to-role": { post: { tags: ["Security"], summary: "Asignar permisos a rol", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AssignPermissionsRequest" } } } }, responses: { 200: { description: "Permisos asignados" } } } },

    "/api/v1/sites/create-site": { post: { tags: ["Sites"], summary: "Crear sitio", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SiteRequest" }, example: { name: "Centro de Convenciones", ubication: "BogotÃ¡", direction: "Calle 123 #45-67", imageUrl: "https://cdn.example.com/sites/movistar-arena.jpg", latitude: 2.9386, longitude: -75.2811, phone: "3001234567", email: "sitio@email.com", capacity: 500 } } } }, responses: { 200: { description: "Sitio creado" }, 400: { description: "Error de validaciÃ³n", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } } } } },
    "/api/v1/sites/update-site/{id}": { put: { tags: ["Sites"], summary: "Actualizar sitio", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SiteRequest" }, example: { name: "Centro de Convenciones", ubication: "BogotÃ¡", direction: "Calle 123 #45-67", imageUrl: "https://cdn.example.com/sites/movistar-arena.jpg", latitude: 2.9386, longitude: -75.2811, phone: "3001234567", email: "sitio@email.com", capacity: 500, status: "ACTIVE" } } } }, responses: { 200: { description: "Sitio actualizado" } } } },
    "/api/v1/sites/delete-site/{id}": { delete: { tags: ["Sites"], summary: "Eliminar sitio", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Sitio eliminado" } } } },
    "/api/v1/sites/get-sites": { get: { tags: ["Sites"], summary: "Listar sitios", security: [{ bearerAuth: [] }], parameters: [{ in: "query", name: "page", schema: { type: "integer" } }, { in: "query", name: "limit", schema: { type: "integer" } }, { in: "query", name: "all", schema: { type: "boolean" } }], responses: { 200: { description: "Sitios obtenidos" } } } },

    "/api/v1/events/create-event": { post: { tags: ["Events"], summary: "Crear evento", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/EventRequest" }, example: { name: "Conferencia Tech", type: "PUBLIC", status: "PENDING", description: "Evento de tecnologia", imageUrl: "https://cdn.example.com/events/conferencia-tech.jpg", ticketPrice: 120000, maxTicketsPerUser: 4, startTime: "2026-04-10T08:00:00.000Z", endTime: "2026-04-10T12:00:00.000Z", siteId: 1 } } } }, responses: { 200: { description: "Evento creado" } } } },
    "/api/v1/events/update-event/{id}": { put: { tags: ["Events"], summary: "Actualizar evento", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/EventRequest" }, example: { name: "Conferencia Tech 2026", type: "PUBLIC", status: "CONFIRMED", description: "Evento de tecnologia actualizado", imageUrl: "https://cdn.example.com/events/conferencia-tech-2026.jpg", ticketPrice: 150000, maxTicketsPerUser: 4, startTime: "2026-04-10T08:00:00.000Z", endTime: "2026-04-10T13:00:00.000Z", siteId: 1 } } } }, responses: { 200: { description: "Evento actualizado" } } } },
    "/api/v1/events/delete-event/{id}": { delete: { tags: ["Events"], summary: "Eliminar evento", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Evento eliminado" } } } },
    "/api/v1/events/get-events": { get: { tags: ["Events"], summary: "Listar eventos", security: [{ bearerAuth: [] }], parameters: [{ in: "query", name: "page", schema: { type: "integer" } }, { in: "query", name: "limit", schema: { type: "integer" } }, { in: "query", name: "all", schema: { type: "boolean" } }], responses: { 200: { description: "Eventos obtenidos" } } } },
    "/api/v1/events/get-dashboard-summary": { get: { tags: ["Events"], summary: "Resumen global privado de eventos", security: [{ bearerAuth: [] }], parameters: [{ in: "query", name: "months", schema: { type: "integer", minimum: 1, maximum: 24, default: 6 } }, { in: "query", name: "endYear", schema: { type: "integer", example: 2026 } }, { in: "query", name: "endMonth", schema: { type: "integer", minimum: 1, maximum: 12, example: 3 } }], responses: { 200: { description: "Resumen general de eventos obtenido", content: { "application/json": { schema: { $ref: "#/components/schemas/EventsDashboardSummary" } } } } } } },
    "/api/v1/events/get-capacity/{id}": { get: { tags: ["Events"], summary: "Resumen privado de aforo e ingresos del evento", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Resumen del evento obtenido", content: { "application/json": { schema: { $ref: "#/components/schemas/EventDashboardSummary" } } } } } } },
    "/api/v1/events/run-automation-jobs": { post: { tags: ["Events"], summary: "Ejecutar automatizaciones de ciclo de vida", security: [{ bearerAuth: [] }], responses: { 200: { description: "Automatizaciones ejecutadas" } } } },

    "/api/v1/agendas/create-agenda": { post: { tags: ["Agendas"], summary: "Crear agenda", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AgendaRequest" } } } }, responses: { 200: { description: "Agenda creada" } } } },
    "/api/v1/agendas/update-agenda/{id}": { put: { tags: ["Agendas"], summary: "Actualizar agenda", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AgendaRequest" } } } }, responses: { 200: { description: "Agenda actualizada" } } } },
    "/api/v1/agendas/delete-agenda/{id}": { delete: { tags: ["Agendas"], summary: "Eliminar agenda", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Agenda eliminada" } } } },
    "/api/v1/agendas/get-agendas": { get: { tags: ["Agendas"], summary: "Listar agendas", security: [{ bearerAuth: [] }], parameters: [{ in: "query", name: "page", schema: { type: "integer" } }, { in: "query", name: "limit", schema: { type: "integer" } }, { in: "query", name: "all", schema: { type: "boolean" } }, { in: "query", name: "eventId", schema: { type: "integer" } }, { in: "query", name: "search", schema: { type: "string" } }], responses: { 200: { description: "Agendas obtenidas" } } } },

    "/api/v1/tickets/create-ticket": { post: { tags: ["Tickets"], summary: "Adquirir boleta", description: "Siempre crea el pago en estado PENDING y reserva cupos. Solo admin puede confirmar pago y en ese momento se envia email de confirmacion de tickets y factura al comprador.", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TicketRequest" } } } }, responses: { 200: { description: "Compra registrada en PENDING" } } } },
    "/api/v1/tickets/get-tickets": { get: { tags: ["Tickets"], summary: "Listar boletas", security: [{ bearerAuth: [] }], parameters: [{ in: "query", name: "page", schema: { type: "integer" } }, { in: "query", name: "limit", schema: { type: "integer" } }, { in: "query", name: "all", schema: { type: "boolean" } }, { in: "query", name: "eventId", schema: { type: "integer" } }], responses: { 200: { description: "Boletas obtenidas" } } } },
    "/api/v1/tickets/validate-ticket/{codeQr}": { put: { tags: ["Tickets"], summary: "Validar boleta en puerta", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "codeQr", required: true, schema: { type: "string" } }], responses: { 200: { description: "Boleta validada" } } } },

    "/api/v1/notifications/create-notification": { post: { tags: ["Notifications"], summary: "Crear notificaciÃ³n", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/NotificationRequest" } } } }, responses: { 200: { description: "NotificaciÃ³n creada" } } } },
    "/api/v1/notifications/get-notifications": { get: { tags: ["Notifications"], summary: "Listar notificaciones", security: [{ bearerAuth: [] }], parameters: [{ in: "query", name: "page", schema: { type: "integer" } }, { in: "query", name: "limit", schema: { type: "integer" } }, { in: "query", name: "all", schema: { type: "boolean" } }, { in: "query", name: "userId", schema: { type: "integer" } }, { in: "query", name: "onlyUnread", schema: { type: "boolean" } }], responses: { 200: { description: "Notificaciones obtenidas" } } } },
    "/api/v1/notifications/mark-notification-as-read/{id}": { put: { tags: ["Notifications"], summary: "Marcar notificaciÃ³n como leÃ­da", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], responses: { 200: { description: "NotificaciÃ³n actualizada" } } } },    "/api/v1/notifications/register-device": { post: { tags: ["Notifications"], summary: "Registrar dispositivo push", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterNotificationDeviceRequest" } } } }, responses: { 200: { description: "Dispositivo registrado" } } } },
    "/api/v1/notifications/unregister-device": { post: { tags: ["Notifications"], summary: "Desregistrar dispositivo push", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UnregisterNotificationDeviceRequest" } } } }, responses: { 200: { description: "Dispositivo desregistrado" } } } },

    "/api/v1/surveys/create-survey": { post: { tags: ["Surveys"], summary: "Crear encuesta", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SurveyRequest" } } } }, responses: { 200: { description: "Encuesta creada" } } } },
    "/api/v1/surveys/get-surveys": { get: { tags: ["Surveys"], summary: "Listar encuestas", security: [{ bearerAuth: [] }], parameters: [{ in: "query", name: "page", schema: { type: "integer" } }, { in: "query", name: "limit", schema: { type: "integer" } }, { in: "query", name: "all", schema: { type: "boolean" } }, { in: "query", name: "eventId", schema: { type: "integer" } }], responses: { 200: { description: "Encuestas obtenidas" } } } },
    "/api/v1/surveys/create-survey-response": { post: { tags: ["Surveys"], summary: "Responder encuesta", description: "Disponible para asistentes con boleta validada.", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SurveyResponseRequest" } } } }, responses: { 200: { description: "Respuesta creada" } } } },
    "/api/v1/surveys/get-survey-responses": { get: { tags: ["Surveys"], summary: "Listar respuestas de encuestas", security: [{ bearerAuth: [] }], parameters: [{ in: "query", name: "page", schema: { type: "integer" } }, { in: "query", name: "limit", schema: { type: "integer" } }, { in: "query", name: "all", schema: { type: "boolean" } }, { in: "query", name: "surveyId", schema: { type: "integer" } }], responses: { 200: { description: "Respuestas obtenidas" } } } },
    "/api/v1/events/get-capacity/{id}": { get: { tags: ["Events"], summary: "Aforo en tiempo real del evento", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Aforo del evento obtenido" } } } },
    "/api/v1/events/run-automation-jobs": { post: { tags: ["Events"], summary: "Ejecutar automatizaciones del ciclo de vida", security: [{ bearerAuth: [] }], responses: { 200: { description: "Automatizaciones ejecutadas" } } } },
    "/api/v1/agendas/get-agendas": { get: { tags: ["Agendas"], summary: "Listar agendas", security: [{ bearerAuth: [] }], parameters: [{ in: "query", name: "page", schema: { type: "integer" } }, { in: "query", name: "limit", schema: { type: "integer" } }, { in: "query", name: "all", schema: { type: "boolean" } }, { in: "query", name: "eventId", schema: { type: "integer" } }, { in: "query", name: "search", schema: { type: "string" } }], responses: { 200: { description: "Agendas obtenidas" } } } },
    "/api/v1/tickets/cancel-ticket/{id}": { put: { tags: ["Tickets"], summary: "Cancelar boleta", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Boleta cancelada" } } } },
    "/api/v1/tickets/get-attendees/{eventId}": { get: { tags: ["Tickets"], summary: "Listar asistentes validados", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "eventId", required: true, schema: { type: "integer" } }, { in: "query", name: "page", schema: { type: "integer" } }, { in: "query", name: "limit", schema: { type: "integer" } }, { in: "query", name: "all", schema: { type: "boolean" } }, { in: "query", name: "search", schema: { type: "string" } }], responses: { 200: { description: "Asistentes obtenidos" } } } },
    "/api/v1/tickets/get-capacity/{eventId}": { get: { tags: ["Tickets"], summary: "Resumen privado de aforo e ingresos por evento", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "eventId", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Resumen del evento obtenido", content: { "application/json": { schema: { $ref: "#/components/schemas/EventDashboardSummary" } } } } } } },
    "/api/v1/notifications/broadcast-promotion": { post: { tags: ["Notifications"], summary: "Enviar notificacion promocional masiva", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["title", "message"], properties: { title: { type: "string" }, message: { type: "string" }, eventId: { type: "integer" } } } } } }, responses: { 200: { description: "Notificacion promocional enviada" } } } },
    "/api/v1/notifications/broadcast-event": { post: { tags: ["Notifications"], summary: "Enviar notificacion del evento", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["eventId", "title", "message"], properties: { eventId: { type: "integer" }, title: { type: "string" }, message: { type: "string" }, type: { type: "string", enum: ["EVENT", "REMINDER"] } } } } } }, responses: { 200: { description: "Notificacion del evento enviada" } } } },
    "/api/v1/public/agendas": { get: { tags: ["Public"], summary: "Catalogo publico de agendas", parameters: [{ in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } }, { in: "query", name: "limit", schema: { type: "integer", minimum: 1, default: 20 } }, { in: "query", name: "all", schema: { type: "boolean", default: false } }, { in: "query", name: "eventId", schema: { type: "integer" } }, { in: "query", name: "search", schema: { type: "string" } }], responses: { 200: { description: "Agendas publicas obtenidas correctamente" } } } },
    "/api/v1/public/get-agendas": { get: { tags: ["Public"], summary: "Alias legado de agendas publicas", deprecated: true, parameters: [{ in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } }, { in: "query", name: "limit", schema: { type: "integer", minimum: 1, default: 20 } }, { in: "query", name: "all", schema: { type: "boolean", default: false } }, { in: "query", name: "eventId", schema: { type: "integer" } }, { in: "query", name: "search", schema: { type: "string" } }], responses: { 200: { description: "Agendas publicas obtenidas correctamente" } } } },
    "/api/v1/public/events/{id}/capacity": { get: { tags: ["Public"], summary: "Aforo publico de evento", parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Aforo publico obtenido correctamente" } } } },
    "/api/v1/public/open-app/reset-password": { get: { tags: ["Public"], summary: "Puente web para abrir app en reset password", parameters: [{ in: "query", name: "token", schema: { type: "string" } }], responses: { 200: { description: "HTML puente para deep link de reset password" } } } },
    "/api/v1/public/open-app/verify-email": { get: { tags: ["Public"], summary: "Puente web para abrir app en verificacion de correo", parameters: [{ in: "query", name: "token", schema: { type: "string" } }], responses: { 200: { description: "HTML puente para deep link de verify email" } } } },
    "/api/v1/promotions/create-promotion": { post: { tags: ["Promotions"], summary: "Crear promocion", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PromotionRequest" } } } }, responses: { 200: { description: "Promocion creada" } } } },
    "/api/v1/promotions/update-promotion/{id}": { put: { tags: ["Promotions"], summary: "Actualizar promocion", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PromotionRequest" } } } }, responses: { 200: { description: "Promocion actualizada" } } } },
    "/api/v1/promotions/delete-promotion/{id}": { delete: { tags: ["Promotions"], summary: "Eliminar promocion", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Promocion eliminada" } } } },
    "/api/v1/promotions/get-promotions": { get: { tags: ["Promotions"], summary: "Listar promociones", security: [{ bearerAuth: [] }], parameters: [{ in: "query", name: "page", schema: { type: "integer" } }, { in: "query", name: "limit", schema: { type: "integer" } }, { in: "query", name: "all", schema: { type: "boolean" } }, { in: "query", name: "eventId", schema: { type: "integer" } }, { in: "query", name: "search", schema: { type: "string" } }, { in: "query", name: "isActive", schema: { type: "boolean" } }, { in: "query", name: "code", schema: { type: "string" } }], responses: { 200: { description: "Promociones obtenidas" } } } },
    "/api/v1/payments/get-payments": { get: { tags: ["Payments"], summary: "Listar pagos", security: [{ bearerAuth: [] }], parameters: [{ in: "query", name: "page", schema: { type: "integer" } }, { in: "query", name: "limit", schema: { type: "integer" } }, { in: "query", name: "all", schema: { type: "boolean" } }, { in: "query", name: "eventId", schema: { type: "integer" } }, { in: "query", name: "status", schema: { type: "string" } }], responses: { 200: { description: "Pagos obtenidos" } } } },
    "/api/v1/payments/get-payment/{id}": { get: { tags: ["Payments"], summary: "Obtener detalle de pago", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Pago obtenido" } } } },
    "/api/v1/payments/confirm-payment/{id}": { put: { tags: ["Payments"], summary: "Confirmar pago pendiente (solo admin)", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Pago confirmado" } } } },
    "/api/v1/payments/fail-payment/{id}": { put: { tags: ["Payments"], summary: "Marcar pago como fallido (solo admin)", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Pago marcado como fallido" } } } },
  },
};




