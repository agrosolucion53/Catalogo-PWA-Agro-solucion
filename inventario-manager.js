#!/usr/bin/env node
/*
 * Gestor profesional de inventario para productos.json
 * Comandos:
 * - listar [--categoria=cat] [--bajo-stock=10]
 * - agregar --nombre="..." --precio=1000 --categoria=... --stock=10 [--descripcion="..."] [--lineaAgro=...] [--emoji=...]
 * - editar --id=123 [--nombre=...] [--precio=...] [--stock=...] [...]
 * - eliminar --id=123
 * - ajustar-stock --id=123 --tipo=entrada|salida|ajuste --cantidad=5 [--motivo="..."]
 * - reporte [--bajo-stock=10]
 */

const fs = require('fs');
const path = require('path');

const PRODUCTOS_PATH = path.join(__dirname, 'productos.json');
const MOVIMIENTOS_PATH = path.join(__dirname, 'inventario-movimientos.json');
const BACKUPS_DIR = path.join(__dirname, 'backups-inventario');

const CATEGORIAS_VALIDAS = new Set([
  'nutricion_animal',
  'medicamentos',
  'insumos',
  'implementos',
  'veterinaria',
  'ganaderia',
  'avicultura',
  'acuicultura',
  'bovinos',
  'ovinos',
  'caprinos',
  'otros'
]);

function parseArgs(argv) {
  const args = {};
  for (const token of argv) {
    if (!token.startsWith('--')) continue;
    const raw = token.slice(2);
    const eqIndex = raw.indexOf('=');
    if (eqIndex === -1) {
      args[raw] = true;
      continue;
    }
    const key = raw.slice(0, eqIndex);
    const value = raw.slice(eqIndex + 1);
    args[key] = value;
  }
  return args;
}

function nowIso() {
  return new Date().toISOString();
}

function safeReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error leyendo ${path.basename(filePath)}:`, error.message);
    process.exit(1);
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

function backupCatalog() {
  ensureBackupsDir();
  if (!fs.existsSync(PRODUCTOS_PATH)) return;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `productos-${ts}.json`;
  const backupPath = path.join(BACKUPS_DIR, backupName);
  fs.copyFileSync(PRODUCTOS_PATH, backupPath);
}

function loadCatalog() {
  const data = safeReadJson(PRODUCTOS_PATH, null);
  if (!data || !Array.isArray(data.productos)) {
    console.error('productos.json no tiene una estructura valida.');
    process.exit(1);
  }
  return data;
}

function bumpPatchVersion(version) {
  const parts = String(version || '1.0.0').split('.').map((n) => parseInt(n, 10));
  const major = Number.isFinite(parts[0]) ? parts[0] : 1;
  const minor = Number.isFinite(parts[1]) ? parts[1] : 0;
  const patch = Number.isFinite(parts[2]) ? parts[2] : 0;
  return `${major}.${minor}.${patch + 1}`;
}

function saveCatalog(data) {
  data.version = bumpPatchVersion(data.version);
  data.lastUpdate = nowIso();
  backupCatalog();
  writeJson(PRODUCTOS_PATH, data);
}

function loadMovimientos() {
  return safeReadJson(MOVIMIENTOS_PATH, { movimientos: [] });
}

function saveMovimientos(data) {
  writeJson(MOVIMIENTOS_PATH, data);
}

function appendMovimiento(mov) {
  const data = loadMovimientos();
  data.movimientos.push(mov);
  saveMovimientos(data);
}

function toInt(value, label) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) {
    console.error(`${label} invalido: ${value}`);
    process.exit(1);
  }
  return n;
}

function normalizeCategoria(categoria) {
  return String(categoria || '').trim().toLowerCase();
}

function validateCategoria(categoria) {
  const c = normalizeCategoria(categoria);
  if (!CATEGORIAS_VALIDAS.has(c)) {
    console.error(`Categoria invalida: ${categoria}`);
    console.error(`Categorias permitidas: ${Array.from(CATEGORIAS_VALIDAS).join(', ')}`);
    process.exit(1);
  }
  return c;
}

function getNextId(productos) {
  if (productos.length === 0) return 1;
  return Math.max(...productos.map((p) => toInt(p.id, 'id'))) + 1;
}

function findById(productos, id) {
  return productos.find((p) => toInt(p.id, 'id') === id);
}

function fmtPrice(value) {
  return `$${toInt(value, 'precio').toLocaleString('es-CO')}`;
}

function printRow(cols) {
  console.log(cols.join(' | '));
}

function listarCommand(args) {
  const catalog = loadCatalog();
  let items = [...catalog.productos];

  if (args.categoria) {
    const cat = normalizeCategoria(args.categoria);
    items = items.filter((p) => normalizeCategoria(p.categoria) === cat || normalizeCategoria(p.lineaAgro) === cat);
  }

  if (args['bajo-stock']) {
    const limite = toInt(args['bajo-stock'], 'bajo-stock');
    items = items.filter((p) => toInt(p.stock ?? 0, 'stock') <= limite);
  }

  items.sort((a, b) => a.id - b.id);
  console.log(`\nProductos encontrados: ${items.length}`);
  printRow(['ID', 'NOMBRE', 'CAT', 'STOCK', 'PRECIO']);
  for (const p of items) {
    printRow([
      String(p.id),
      p.nombre,
      p.categoria || '-',
      String(p.stock ?? 0),
      fmtPrice(p.precio)
    ]);
  }
}

function agregarCommand(args) {
  const required = ['nombre', 'precio', 'categoria', 'stock'];
  for (const key of required) {
    if (!args[key]) {
      console.error(`Falta parametro --${key}`);
      process.exit(1);
    }
  }

  const catalog = loadCatalog();
  const id = getNextId(catalog.productos);
  const categoria = validateCategoria(args.categoria);
  const precio = toInt(args.precio, 'precio');
  const stock = toInt(args.stock, 'stock');

  const producto = {
    id,
    nombre: String(args.nombre).trim(),
    categoria,
    precio,
    descripcion: String(args.descripcion || `Producto de linea ${categoria}.`).trim(),
    emoji: String(args.emoji || '📦').trim(),
    stock,
    etiqueta: String(args.etiqueta || 'Catalogo').trim(),
    tipoEtiqueta: 'etiqueta-producto',
    lineaAgro: String(args.lineaAgro || categoria).trim().toLowerCase()
  };

  catalog.productos.push(producto);
  saveCatalog(catalog);

  appendMovimiento({
    fecha: nowIso(),
    tipo: 'alta',
    productoId: id,
    nombre: producto.nombre,
    cantidad: stock,
    stockAnterior: 0,
    stockNuevo: stock,
    motivo: args.motivo || 'Alta de producto'
  });

  console.log(`✅ Producto agregado: ${producto.nombre} (ID ${id})`);
}

function editarCommand(args) {
  if (!args.id) {
    console.error('Falta parametro --id');
    process.exit(1);
  }
  const id = toInt(args.id, 'id');
  const catalog = loadCatalog();
  const producto = findById(catalog.productos, id);
  if (!producto) {
    console.error(`No existe producto con id ${id}`);
    process.exit(1);
  }

  const stockAnterior = toInt(producto.stock ?? 0, 'stock');

  if (args.nombre) producto.nombre = String(args.nombre).trim();
  if (args.precio) producto.precio = toInt(args.precio, 'precio');
  if (args.categoria) producto.categoria = validateCategoria(args.categoria);
  if (args.descripcion) producto.descripcion = String(args.descripcion).trim();
  if (args.emoji) producto.emoji = String(args.emoji).trim();
  if (args.etiqueta) producto.etiqueta = String(args.etiqueta).trim();
  if (args.lineaAgro) producto.lineaAgro = String(args.lineaAgro).trim().toLowerCase();
  if (args.stock) producto.stock = toInt(args.stock, 'stock');

  saveCatalog(catalog);

  const stockNuevo = toInt(producto.stock ?? 0, 'stock');
  if (stockAnterior !== stockNuevo) {
    appendMovimiento({
      fecha: nowIso(),
      tipo: 'edicion-stock',
      productoId: id,
      nombre: producto.nombre,
      cantidad: stockNuevo - stockAnterior,
      stockAnterior,
      stockNuevo,
      motivo: args.motivo || 'Edicion de producto'
    });
  }

  console.log(`✅ Producto actualizado: ${producto.nombre} (ID ${id})`);
}

function eliminarCommand(args) {
  if (!args.id) {
    console.error('Falta parametro --id');
    process.exit(1);
  }
  const id = toInt(args.id, 'id');
  const catalog = loadCatalog();
  const index = catalog.productos.findIndex((p) => toInt(p.id, 'id') === id);
  if (index === -1) {
    console.error(`No existe producto con id ${id}`);
    process.exit(1);
  }

  const producto = catalog.productos[index];
  catalog.productos.splice(index, 1);
  saveCatalog(catalog);

  appendMovimiento({
    fecha: nowIso(),
    tipo: 'baja',
    productoId: id,
    nombre: producto.nombre,
    cantidad: -(toInt(producto.stock ?? 0, 'stock')),
    stockAnterior: toInt(producto.stock ?? 0, 'stock'),
    stockNuevo: 0,
    motivo: args.motivo || 'Baja de producto'
  });

  console.log(`✅ Producto eliminado: ${producto.nombre} (ID ${id})`);
}

function ajustarStockCommand(args) {
  const required = ['id', 'tipo', 'cantidad'];
  for (const key of required) {
    if (!args[key]) {
      console.error(`Falta parametro --${key}`);
      process.exit(1);
    }
  }

  const id = toInt(args.id, 'id');
  const tipo = String(args.tipo).trim().toLowerCase();
  const cantidad = toInt(args.cantidad, 'cantidad');

  if (!['entrada', 'salida', 'ajuste'].includes(tipo)) {
    console.error('Tipo invalido. Use entrada, salida o ajuste.');
    process.exit(1);
  }

  const catalog = loadCatalog();
  const producto = findById(catalog.productos, id);
  if (!producto) {
    console.error(`No existe producto con id ${id}`);
    process.exit(1);
  }

  const stockAnterior = toInt(producto.stock ?? 0, 'stock');
  let stockNuevo = stockAnterior;

  if (tipo === 'entrada') stockNuevo = stockAnterior + cantidad;
  if (tipo === 'salida') stockNuevo = stockAnterior - cantidad;
  if (tipo === 'ajuste') stockNuevo = cantidad;

  if (stockNuevo < 0) {
    console.error(`Stock insuficiente. Actual: ${stockAnterior}, solicitado: ${cantidad}`);
    process.exit(1);
  }

  producto.stock = stockNuevo;
  saveCatalog(catalog);

  appendMovimiento({
    fecha: nowIso(),
    tipo,
    productoId: id,
    nombre: producto.nombre,
    cantidad: tipo === 'salida' ? -cantidad : (tipo === 'ajuste' ? stockNuevo - stockAnterior : cantidad),
    stockAnterior,
    stockNuevo,
    motivo: args.motivo || 'Ajuste de inventario'
  });

  console.log(`✅ Stock actualizado: ${producto.nombre} | ${stockAnterior} -> ${stockNuevo}`);
}

function reporteCommand(args) {
  const catalog = loadCatalog();
  const limite = toInt(args['bajo-stock'] || 5, 'bajo-stock');

  const totalProductos = catalog.productos.length;
  const totalStock = catalog.productos.reduce((acc, p) => acc + toInt(p.stock ?? 0, 'stock'), 0);
  const valorInventario = catalog.productos.reduce((acc, p) => {
    const stock = toInt(p.stock ?? 0, 'stock');
    const precio = toInt(p.precio, 'precio');
    return acc + (stock * precio);
  }, 0);

  const bajoStock = catalog.productos
    .filter((p) => toInt(p.stock ?? 0, 'stock') <= limite)
    .sort((a, b) => (toInt(a.stock ?? 0, 'stock') - toInt(b.stock ?? 0, 'stock')));

  console.log('\n=== REPORTE INVENTARIO ===');
  console.log(`Version catalogo: ${catalog.version}`);
  console.log(`Ultima actualizacion: ${catalog.lastUpdate}`);
  console.log(`Total productos: ${totalProductos}`);
  console.log(`Total unidades en stock: ${totalStock}`);
  console.log(`Valor total inventario: ${valorInventario.toLocaleString('es-CO')}`);
  console.log(`Productos con stock <= ${limite}: ${bajoStock.length}`);

  if (bajoStock.length > 0) {
    console.log('\n--- ALERTA BAJO STOCK ---');
    printRow(['ID', 'NOMBRE', 'STOCK', 'PRECIO']);
    for (const p of bajoStock) {
      printRow([String(p.id), p.nombre, String(p.stock ?? 0), fmtPrice(p.precio)]);
    }
  }
}

function printHelp() {
  console.log(`
Uso:
  node inventario-manager.js listar [--categoria=cat] [--bajo-stock=10]
  node inventario-manager.js agregar --nombre="..." --precio=1000 --categoria=... --stock=10 [--descripcion="..."] [--lineaAgro=...] [--emoji=...]
  node inventario-manager.js editar --id=123 [--nombre=...] [--precio=...] [--stock=...] [--categoria=...]
  node inventario-manager.js eliminar --id=123
  node inventario-manager.js ajustar-stock --id=123 --tipo=entrada|salida|ajuste --cantidad=5 [--motivo="..."]
  node inventario-manager.js reporte [--bajo-stock=10]
`);
}

function main() {
  const [, , command, ...rest] = process.argv;
  const args = parseArgs(rest);

  switch (command) {
    case 'listar':
      listarCommand(args);
      break;
    case 'agregar':
      agregarCommand(args);
      break;
    case 'editar':
      editarCommand(args);
      break;
    case 'eliminar':
      eliminarCommand(args);
      break;
    case 'ajustar-stock':
      ajustarStockCommand(args);
      break;
    case 'reporte':
      reporteCommand(args);
      break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;
    default:
      console.error(`Comando no reconocido: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main();
