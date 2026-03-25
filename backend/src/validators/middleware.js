exports.valider = valider;
exports.validerBody = validerBody;
exports.validerQuery = validerQuery;
const gestionErreurs = require("../middleware/gestionErreurs");
/**
 * Valide req[target] avec le schéma et remplace par la version parsée.
 */
function valider(schema, target = 'body') {
    return (req, _res, next) => {
        try {
            const raw = req[target];
            const result = schema.safeParse(raw);
            if (!result.success) {
                const err = result.error;
                const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
                throw new gestionErreurs.ErreurApp(messages.join(' ; '), 400);
            }
            req[target] = result.data;
            next();
        }
        catch (error) {
            if (error instanceof gestionErreurs.ErreurApp)
                throw error;
            next(error);
        }
    };
}
/**
 * Valide req.body avec le schéma (attendu: schema avec clé .shape.body).
 */
function validerBody(schema) {
    return (req, _res, next) => {
        try {
            const result = schema.shape.body.safeParse(req.body);
            if (!result.success) {
                const err = result.error;
                const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
                throw new gestionErreurs.ErreurApp(messages.join(' ; '), 400);
            }
            req.body = result.data;
            next();
        }
        catch (error) {
            if (error instanceof gestionErreurs.ErreurApp)
                throw error;
            next(error);
        }
    };
}
/**
 * Valide req.query avec le schéma (attendu: schema avec clé .shape.query).
 */
function validerQuery(schema) {
    return (req, _res, next) => {
        try {
            const result = schema.shape.query.safeParse(req.query);
            if (!result.success) {
                const err = result.error;
                const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
                throw new gestionErreurs.ErreurApp(messages.join(' ; '), 400);
            }
            req.query = result.data;
            next();
        }
        catch (error) {
            if (error instanceof gestionErreurs.ErreurApp)
                throw error;
            next(error);
        }
    };
}
