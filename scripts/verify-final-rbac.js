/**
 * Script de verificación final del sistema RBAC
 * Verifica que el usuario esté correctamente migrado y el sistema funcione
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

async function verificacionFinalRBAC() {
  try {
    console.log('🔄 Verificando sistema RBAC post-migración...');
    await sql.connect(config);
    console.log('✅ Conexión establecida\n');
    
    // 1. Verificar usuario migrado
    console.log('👤 USUARIO MIGRADO:');
    console.log('='.repeat(50));
    
    const usuarioResult = await sql.query(`
      SELECT 
        u.id_usuario,
        u.nombre + ' ' + u.apellido as NombreCompleto,
        u.email,
        u.rol as RolLegacy,
        r.NombreRol as RolRBAC,
        r.Descripcion,
        u.estatus
      FROM Usuarios u
      LEFT JOIN Roles r ON u.RolID = r.RolID
      WHERE u.email = 'admin@starteducation.com'
    `);
    
    if (usuarioResult.recordset.length > 0) {
      const usuario = usuarioResult.recordset[0];
      console.log(`✅ Usuario: ${usuario.NombreCompleto}`);
      console.log(`✅ Email: ${usuario.email}`);
      console.log(`✅ Rol Legacy: ${usuario.RolLegacy}`);
      console.log(`✅ Rol RBAC: ${usuario.RolRBAC || 'NO ASIGNADO'}`);
      console.log(`✅ Estado: ${usuario.estatus}`);
      
      if (usuario.RolRBAC === 'SuperAdmin') {
        console.log('🎉 Usuario correctamente migrado a SuperAdmin');
      } else {
        console.log('⚠️ Usuario NO tiene rol SuperAdmin asignado');
      }
    } else {
      console.log('❌ Usuario no encontrado');
    }
    
    // 2. Verificar permisos específicos para el usuario
    console.log('\n🔑 PERMISOS DEL USUARIO:');
    console.log('='.repeat(50));
    
    const permisosResult = await sql.query(`
      SELECT 
        p.Modulo,
        p.NombrePermiso,
        p.Descripcion
      FROM Usuarios u
      INNER JOIN Roles r ON u.RolID = r.RolID
      INNER JOIN RolPermiso rp ON r.RolID = rp.RolID
      INNER JOIN Permisos p ON rp.PermisoID = p.PermisoID
      WHERE u.email = 'admin@starteducation.com'
        AND r.Activo = 1 
        AND p.Activo = 1
      ORDER BY p.Modulo, p.NombrePermiso
    `);
    
    if (permisosResult.recordset.length > 0) {
      console.log(`✅ Total permisos: ${permisosResult.recordset.length}`);
      
      // Agrupar por módulo
      const permisosPorModulo = {};
      permisosResult.recordset.forEach(permiso => {
        if (!permisosPorModulo[permiso.Modulo]) {
          permisosPorModulo[permiso.Modulo] = [];
        }
        permisosPorModulo[permiso.Modulo].push(permiso.NombrePermiso);
      });
      
      Object.keys(permisosPorModulo).forEach(modulo => {
        console.log(`📁 ${modulo}: ${permisosPorModulo[modulo].length} permisos`);
        permisosPorModulo[modulo].forEach(permiso => {
          console.log(`   🔑 ${permiso}`);
        });
      });
    } else {
      console.log('❌ Usuario no tiene permisos asignados');
    }
    
    // 3. Verificar permisos críticos específicos
    console.log('\n🎯 PERMISOS CRÍTICOS VERIFICADOS:');
    console.log('='.repeat(50));
    
    const permisosCriticos = [
      'gestionar_usuarios',
      'gestionar_roles', 
      'eliminar_usuarios',
      'configurar_sistema',
      'ver_finanzas'
    ];
    
    for (const permisoCritico of permisosCriticos) {
      const tienePermisoResult = await sql.query(`
        SELECT COUNT(*) as Tiene
        FROM Usuarios u
        INNER JOIN Roles r ON u.RolID = r.RolID
        INNER JOIN RolPermiso rp ON r.RolID = rp.RolID
        INNER JOIN Permisos p ON rp.PermisoID = p.PermisoID
        WHERE u.email = 'admin@starteducation.com'
          AND p.NombrePermiso = '${permisoCritico}'
          AND r.Activo = 1 
          AND p.Activo = 1
      `);
      
      const tienePermiso = tienePermisoResult.recordset[0].Tiene > 0;
      console.log(`${tienePermiso ? '✅' : '❌'} ${permisoCritico}: ${tienePermiso ? 'SÍ' : 'NO'}`);
    }
    
    // 4. Estado del sistema RBAC
    console.log('\n📊 RESUMEN DEL SISTEMA RBAC:');
    console.log('='.repeat(50));
    
    const resumenResult = await sql.query(`
      SELECT 
        (SELECT COUNT(*) FROM Roles WHERE Activo = 1) as RolesActivos,
        (SELECT COUNT(*) FROM Permisos WHERE Activo = 1) as PermisosActivos,
        (SELECT COUNT(*) FROM RolPermiso) as AsignacionesPermisos,
        (SELECT COUNT(*) FROM Usuarios WHERE RolID IS NOT NULL) as UsuariosConRBAC
    `);
    
    const resumen = resumenResult.recordset[0];
    console.log(`📈 Roles activos: ${resumen.RolesActivos}`);
    console.log(`🔑 Permisos activos: ${resumen.PermisosActivos}`);
    console.log(`🔗 Asignaciones de permisos: ${resumen.AsignacionesPermisos}`);
    console.log(`👥 Usuarios con RBAC: ${resumen.UsuariosConRBAC}`);
    
    console.log('\n🎉 VERIFICACIÓN COMPLETADA');
    console.log('='.repeat(50));
    
    if (usuarioResult.recordset[0]?.RolRBAC === 'SuperAdmin' && permisosResult.recordset.length === 30) {
      console.log('✅ Sistema RBAC completamente funcional');
      console.log('🚀 El usuario puede acceder a /admin/roles');
      console.log('');
      console.log('🔧 PRÓXIMOS PASOS:');
      console.log('   1. Cerrar sesión en el navegador');
      console.log('   2. Iniciar sesión con admin@starteducation.com');
      console.log('   3. Ir a http://localhost:3000/admin/roles');
      console.log('   4. ¡Disfrutar del sistema RBAC completo!');
    } else {
      console.log('⚠️ Hay problemas con la configuración RBAC');
    }
    
  } catch (error) {
    console.error('❌ Error en verificación:', error.message);
  } finally {
    await sql.close();
  }
}

// Ejecutar verificación
verificacionFinalRBAC();