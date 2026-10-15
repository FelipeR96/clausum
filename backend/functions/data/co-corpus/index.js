const arrendamiento = require('./arrendamiento');
const laboral = require('./laboral');
const prestacion_servicios = require('./prestacion_servicios');
const compraventa = require('./compraventa');
const confidencialidad = require('./confidencialidad');
const licencia_software = require('./licencia_software');
const franquicia = require('./franquicia');
const suministro = require('./suministro');
const distribucion = require('./distribucion');
const mandato = require('./mandato');
const transversal = require('./transversal');

const allArticles = [
  ...arrendamiento,
  ...laboral,
  ...prestacion_servicios,
  ...compraventa,
  ...confidencialidad,
  ...licencia_software,
  ...franquicia,
  ...suministro,
  ...distribucion,
  ...mandato,
  ...transversal,
];

// Validar IDs únicos
const ids = new Set();
for (const a of allArticles) {
  if (ids.has(a.id)) {
    throw new Error(`ID duplicado en corpus CO: ${a.id}`);
  }
  ids.add(a.id);
}

module.exports = allArticles;
