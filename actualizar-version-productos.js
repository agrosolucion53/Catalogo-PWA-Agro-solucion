#!/usr/bin/env node
/**
 * ========================================
 * SCRIPT DE ACTUALIZACIÓN DE VERSIÓN
 * ========================================
 * 
 * Este script actualiza automáticamente la versión y timestamp
 * en productos.json cuando se hace un cambio en el catálogo.
 * 
 * Uso:
 * node actualizar-version-productos.js [patch|minor|major]
 * 
 * Ejemplos:
 * - node actualizar-version-productos.js patch   → 1.0.0 → 1.0.1
 * - node actualizar-version-productos.js minor   → 1.0.0 → 1.1.0
 * - node actualizar-version-productos.js major   → 1.0.0 → 2.0.0
 */

const fs = require('fs');
const path = require('path');

const PRODUCTOS_PATH = path.join(__dirname, 'productos.json');

// Leer el tipo de actualización (patch, minor, major)
const tipoActualizacion = process.argv[2] || 'patch';

try {
    // Leer productos.json
    const data = fs.readFileSync(PRODUCTOS_PATH, 'utf8');
    const productos = JSON.parse(data);
    
    // Incrementar versión
    const versionActual = productos.version.split('.');
    let [major, minor, patch] = versionActual.map(Number);
    
    switch (tipoActualizacion) {
        case 'major':
            major++;
            minor = 0;
            patch = 0;
            break;
        case 'minor':
            minor++;
            patch = 0;
            break;
        case 'patch':
        default:
            patch++;
            break;
    }
    
    const nuevaVersion = `${major}.${minor}.${patch}`;
    
    // Actualizar datos
    productos.version = nuevaVersion;
    productos.lastUpdate = new Date().toISOString();
    
    // Guardar archivo
    fs.writeFileSync(
        PRODUCTOS_PATH, 
        JSON.stringify(productos, null, 2), 
        'utf8'
    );
    
    console.log('✅ productos.json actualizado correctamente');
    console.log(`📦 Nueva versión: ${nuevaVersion}`);
    console.log(`🕐 Timestamp: ${productos.lastUpdate}`);
    console.log(`📊 Total productos: ${productos.productos.length}`);
    
} catch (error) {
    console.error('❌ Error actualizando productos.json:', error.message);
    process.exit(1);
}
