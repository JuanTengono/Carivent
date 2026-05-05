const { errorResponse } = require("../config/interfaces/errors.interface");

module.exports = (requiredPermission) => {
    return async (req, res, next) => {    
        try {
            const { user } = req;
        
            if (user.role.id === 1) {
                return next();
            }else if (!user.role.rolePermissions.some(p => p.permission.name === requiredPermission)) {
                return res.status(403).json(errorResponse("No tiene permisos para acceder a esta ruta", null, 403));
            }else{
                return next();
            }
        } catch (error) {
            next(error);
        }
    };
};