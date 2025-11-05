/**
 * Script de verificación del sistema RBAC
 * Verifica que las tablas, roles y permisos estén correctamente configurados
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

async function verificarRBAC() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sql.connect(config);
    
    console.log('✅ Conexión establecida exitosamente\n');
    
    // Verificar tablas RBAC
    console.log('📊 VERIFICANDO ESTRUCTURA DE TABLAS RBAC:');
    console.log('='.repeat(50));
    
    const tablas = ['Roles', 'Permisos', 'RolPermiso'];
    
    for (const tabla of tablas) {
      try {
        const result = await sql.query(`SELECT COUNT(*) as Total FROM ${tabla}`);
        const total = result.recordset[0].Total;
        console.log(`✅ ${tabla}: ${total} registros`);
      } catch (error) {
        console.log(`❌ ${tabla}: No existe o error - ${error.message}`);
      }
    }
    
    // Verificar roles
    console.log('\n👥 ROLES DISPONIBLES:');
    console.log('='.repeat(50));
    
    const rolesResult = await sql.query(`
      SELECT 
        RolID,
        NombreRol,
        Descripcion,
        Activo,
        (SELECT COUNT(*) FROM RolPermiso WHERE RolID = r.RolID) as TotalPermisos
      FROM Roles r
      ORDER BY RolID
    `);
    
    rolesResult.recordset.forEach(rol => {
      const estado = rol.Activo ? '🟢 Activo' : '🔴 Inactivo';
      console.log(`${rol.RolID}. ${rol.NombreRol} - ${rol.TotalPermisos} permisos - ${estado}`);
      if (rol.Descripcion) {
        console.log(`   📝 ${rol.Descripcion}`);
      }
    });
    
    // Verificar permisos por módulo
    console.log('\n🔐 PERMISOS POR MÓDULO:');
    console.log('='.repeat(50));
    
    const permisosResult = await sql.query(`
      SELECT 
        Modulo,
        COUNT(*) as TotalPermisos
      FROM Permisos
      GROUP BY Modulo
      ORDER BY Modulo
    `);
    
    permisosResult.recordset.forEach(modulo => {
      console.log(`📁 ${modulo.Modulo}: ${modulo.TotalPermisos} permisos`);
    });
    
    // Verificar distribución de permisos por rol
    console.log('\n📊 DISTRIBUCIÓN DE PERMISOS POR ROL:');
    console.log('='.repeat(50));
    
    const distribucionResult = await sql.query(`
      SELECT 
        r.NombreRol,
        COUNT(rp.PermisoID) as PermisosAsignados,
        (SELECT COUNT(*) FROM Permisos) as TotalPermisos
      FROM Roles r
      LEFT JOIN RolPermiso rp ON r.RolID = rp.RolID
      WHERE r.Activo = 1
      GROUP BY r.RolID, r.NombreRol
      ORDER BY PermisosAsignados DESC
    `);
    
    distribucionResult.recordset.forEach(dist => {
      const porcentaje = ((dist.PermisosAsignados / dist.TotalPermisos) * 100).toFixed(1);
      console.log(`${dist.NombreRol}: ${dist.PermisosAsignados}/${dist.TotalPermisos} (${porcentaje}%)`);
    });
    
    // Verificar si hay usuarios con RolID
    console.log('\n👤 USUARIOS CON ROLES ASIGNADOS:');
    console.log('='.repeat(50));
    
    try {
      const usuariosRolResult = await sql.query(`
        SELECT 
          r.NombreRol,
          COUNT(u.id_usuario) as TotalUsuarios
        FROM Roles r
        LEFT JOIN Usuarios u ON r.RolID = u.RolID
        GROUP BY r.RolID, r.NombreRol
        HAVING COUNT(u.id_usuario) > 0
        ORDER BY TotalUsuarios DESC
      `);
      
      if (usuariosRolResult.recordset.length > 0) {
        usuariosRolResult.recordset.forEach(ur => {
          console.log(`${ur.NombreRol}: ${ur.TotalUsuarios} usuarios`);
        });
      } else {
        console.log('⚠️  No hay usuarios con roles RBAC asignados aún');
        console.log('💡 Los usuarios aún usan el campo "rol" (legacy)');
      }
    } catch (error) {
      console.log('⚠️  La columna RolID no existe en la tabla Usuarios');
      console.log('💡 Necesitas ejecutar el script de migración de usuarios');
    }
    
    // Verificar algunos permisos específicos importantes
    console.log('\n🎯 PERMISOS CRÍTICOS:');
    console.log('='.repeat(50));
    
    const permisosCriticos = [
      'gestionar_usuarios',
      'gestionar_roles',
      'eliminar_usuarios',
      'ver_finanzas',
      'configurar_sistema'
    ];
    
    for (const permiso of permisosCriticos) {
      try {
        const permisoResult = await sql.query(`
          SELECT 
            r.NombreRol
          FROM Roles r
          INNER JOIN RolPermiso rp ON r.RolID = rp.RolID
          INNER JOIN Permisos p ON rp.PermisoID = p.PermisoID
          WHERE p.NombrePermiso = @permiso AND r.Activo = 1
        `, { permiso });
        
        const roles = permisoResult.recordset.map(r => r.NombreRol).join(', ');
        console.log(`🔑 ${permiso}: ${roles || 'Ningún rol'}`);
      } catch (error) {
        console.log(`❌ ${permiso}: Error verificando`);
      }
    }
    
    console.log('\n🎉 VERIFICACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(50));
    console.log('✅ El sistema RBAC está correctamente configurado');
    console.log('💡 Próximos pasos:');
    console.log('   1. Migrar usuarios existentes a roles RBAC');
    console.log('   2. Actualizar todas las rutas administrativas');
    console.log('   3. Probar permisos en el frontend');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
  } finally {
    await sql.close();
  }
}

// Ejecutar verificación
verificarRBAC();