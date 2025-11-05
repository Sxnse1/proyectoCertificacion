/**
 * Script para migrar usuario a SuperAdmin usando Node.js
 * Evita problemas de QUOTED_IDENTIFIER de SQL Server
 */

const sql = require('mssql');

const config = {
  user: 'barberadmin',
  password: '193755', 
  server: 'DESKTOP-6QU5OJ8\\SQLEXPRESS',
  database: 'StartEducationDB',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

async function migrarUsuarioSuperAdmin() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sql.connect(config);
    console.log('✅ Conexión establecida\n');
    
    // Paso 1: Verificar usuario existente
    console.log('👥 VERIFICANDO USUARIO EXISTENTE:');
    console.log('='.repeat(50));
    
    const usuarioResult = await sql.query(`
      SELECT 
        id_usuario,
        nombre + ' ' + apellido as NombreCompleto,
        email,
        rol as RolLegacy,
        RolID as RolRBAC,
        estatus
      FROM Usuarios 
      WHERE email = 'admin@starteducation.com'
    `);
    
    if (usuarioResult.recordset.length === 0) {
      console.log('❌ No se encontró el usuario admin@starteducation.com');
      return;
    }
    
    const usuario = usuarioResult.recordset[0];
    console.log(`Usuario encontrado: ${usuario.NombreCompleto}`);
    console.log(`Email: ${usuario.email}`);
    console.log(`Rol Legacy: ${usuario.RolLegacy}`);
    console.log(`RolID RBAC actual: ${usuario.RolRBAC || 'NULL'}`);
    console.log(`Estatus: ${usuario.estatus}`);
    
    // Paso 2: Obtener ID del rol SuperAdmin
    const superAdminResult = await sql.query(`
      SELECT RolID, NombreRol, Descripcion 
      FROM Roles 
      WHERE NombreRol = 'SuperAdmin'
    `);
    
    if (superAdminResult.recordset.length === 0) {
      console.log('❌ No se encontró el rol SuperAdmin');
      return;
    }
    
    const superAdminRol = superAdminResult.recordset[0];
    console.log(`\n🔐 ROL SUPERADMIN ENCONTRADO:`);
    console.log(`ID: ${superAdminRol.RolID}`);
    console.log(`Nombre: ${superAdminRol.NombreRol}`);
    console.log(`Descripción: ${superAdminRol.Descripcion}`);
    
    // Paso 3: Asignar rol SuperAdmin
    console.log('\n🚀 ASIGNANDO ROL SUPERADMIN...');
    console.log('='.repeat(50));
    
    const request = new sql.Request();
    request.input('rolId', sql.Int, superAdminRol.RolID);
    request.input('usuarioId', sql.Int, usuario.id_usuario);
    
    // Usar parámetros para evitar problemas de QUOTED_IDENTIFIER
    const updateResult = await request.query(`
      UPDATE Usuarios 
      SET RolID = @rolId 
      WHERE id_usuario = @usuarioId
    `);
    
    if (updateResult.rowsAffected[0] > 0) {
      console.log('✅ Usuario migrado exitosamente a SuperAdmin');
    } else {
      console.log('⚠️ No se pudo actualizar el usuario');
    }
    
    // Paso 4: Verificar la migración
    console.log('\n🎯 VERIFICACIÓN POST-MIGRACIÓN:');
    console.log('='.repeat(50));
    
    const verificacionResult = await sql.query(`
      SELECT 
        u.id_usuario,
        u.nombre + ' ' + u.apellido as NombreCompleto,
        u.email,
        u.rol as RolLegacy,
        r.NombreRol as RolRBAC,
        r.Descripcion,
        COUNT(rp.PermisoID) as TotalPermisos
      FROM Usuarios u
      LEFT JOIN Roles r ON u.RolID = r.RolID
      LEFT JOIN RolPermiso rp ON r.RolID = rp.RolID
      WHERE u.email = 'admin@starteducation.com'
      GROUP BY u.id_usuario, u.nombre, u.apellido, u.email, u.rol, r.NombreRol, r.Descripcion
    `);
    
    const usuarioMigrado = verificacionResult.recordset[0];
    console.log(`✅ Usuario: ${usuarioMigrado.NombreCompleto}`);
    console.log(`✅ Email: ${usuarioMigrado.email}`);
    console.log(`✅ Rol Legacy: ${usuarioMigrado.RolLegacy}`);
    console.log(`✅ Rol RBAC: ${usuarioMigrado.RolRBAC}`);
    console.log(`✅ Total Permisos: ${usuarioMigrado.TotalPermisos}`);
    
    // Paso 5: Mostrar algunos permisos
    console.log('\n🔑 PERMISOS ASIGNADOS (muestra):');
    console.log('='.repeat(50));
    
    const permisosResult = await sql.query(`
      SELECT TOP 10
        p.Modulo,
        p.NombrePermiso,
        p.Descripcion
      FROM Usuarios u
      INNER JOIN Roles r ON u.RolID = r.RolID
      INNER JOIN RolPermiso rp ON r.RolID = rp.RolID  
      INNER JOIN Permisos p ON rp.PermisoID = p.PermisoID
      WHERE u.email = 'admin@starteducation.com'
      ORDER BY p.Modulo, p.NombrePermiso
    `);
    
    permisosResult.recordset.forEach(permiso => {
      console.log(`📁 ${permiso.Modulo}: ${permiso.NombrePermiso}`);
    });
    
    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('='.repeat(50));
    console.log('💡 Próximos pasos:');
    console.log('   1. Cerrar sesión actual en el navegador');
    console.log('   2. Volver a iniciar sesión');
    console.log('   3. Los permisos se cargarán automáticamente');
    console.log('   4. Podrás acceder a /admin/roles y todas las funciones administrativas');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
  } finally {
    await sql.close();
  }
}

// Ejecutar migración
migrarUsuarioSuperAdmin();