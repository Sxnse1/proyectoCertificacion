// Script para verificar la estructura de las tablas de monetización
const sql = require('mssql');
const { connect } = require('../config/database');

async function checkTables() {
  try {
    const pool = await connect();
    console.log('✅ Conectado a la base de datos\n');

    // Verificar estructura de Membresias
    console.log('📊 Tabla: Membresias');
    console.log('='.repeat(50));
    const membresiasCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Membresias'
      ORDER BY ORDINAL_POSITION
    `);
    if (membresiasCols.recordset.length > 0) {
      membresiasCols.recordset.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE.padEnd(15)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('  ⚠️  Tabla no existe');
    }

    // Verificar estructura de Suscripciones
    console.log('\n📊 Tabla: Suscripciones');
    console.log('='.repeat(50));
    const suscripcionesCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Suscripciones'
      ORDER BY ORDINAL_POSITION
    `);
    if (suscripcionesCols.recordset.length > 0) {
      suscripcionesCols.recordset.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE.padEnd(15)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('  ⚠️  Tabla no existe');
    }

    // Verificar estructura de Compras
    console.log('\n📊 Tabla: Compras');
    console.log('='.repeat(50));
    const comprasCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Compras'
      ORDER BY ORDINAL_POSITION
    `);
    if (comprasCols.recordset.length > 0) {
      comprasCols.recordset.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE.padEnd(15)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('  ⚠️  Tabla no existe');
    }

    // Verificar estructura de Carrito
    console.log('\n📊 Tabla: Carrito');
    console.log('='.repeat(50));
    const carritoCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Carrito'
      ORDER BY ORDINAL_POSITION
    `);
    if (carritoCols.recordset.length > 0) {
      carritoCols.recordset.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE.padEnd(15)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('  ⚠️  Tabla no existe');
    }

    console.log('\n✅ Verificación completada');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkTables();
