exports.valider = valider;
exports.validerBody = validerBody;
exports.validerQuery = validerQuery;

const gestionErreurs = require("../middleware/gestionErreurs");

function formatterErreurZod(errorZod) {
    return errorZod.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(' ; ');
}

function validerAvecSchema(schema, cible) {
    return (req, _res, next) => {
        const result = schema.safeParse(req[cible]);
        if (!result.success) {
            return next(new gestionErreurs.ErreurApp(formatterErreurZod(result.error), 400));
        }
        req[cible] = result.data;
        return next();
    };
}

function valider(schema, target = 'body') {
    return validerAvecSchema(schema, target);
}

function validerBody(schema) {
    return validerAvecSchema(schema.shape.body, 'body');
}

function validerQuery(schema) {
    return validerAvecSchema(schema.shape.query, 'query');
}
