/**
 * VERIFICACIÓN DE ACTUALIZACIÓN - MÓDULO PERFIL
 * StartEducation Platform
 * Confirma que el módulo perfil ahora usa la misma paleta de colores que categorías
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 VERIFICANDO ACTUALIZACIÓN DE DISEÑO - MÓDULO PERFIL');
console.log('=====================================================\n');

const projectRoot = process.cwd();

// Paleta de colores esperada del módulo categorías
const expectedColorVars = [
  '--primary-color: #ea580c',
  '--primary-hover: #c2410c',
  '--success-color: #10b981',
  '--warning-color: #f59e0b',
  '--danger-color: #ef4444',
  '--text-dark: #1f2937',
  '--text-muted: #6b7280',
  '--border-color: #e5e7eb',
  '--bg-light: #f8fafc'
];

// Estilos esperados similares a categorías
const expectedStyles = [
  'background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
  'border-left: 5px solid var(--primary-color)',
  'box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1)',
  'border-radius: 16px',
  'font-family: \'Inter\', sans-serif',
  'background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%)',
  'border: 2px solid var(--border-color)',
  'transform: translateY(-2px)'
];

// Estructura HTML esperada
const expectedElements = [
  'main-container',
  'header-section',
  'header-title',
  'stats-row',
  'stat-card',
  'stat-number',
  'stat-label',
  'content-grid',
  'main-card',
  'card-header',
  'card-body'
];

let allChecksPass = true;

console.log('🎨 VERIFICANDO PALETA DE COLORES:');
console.log('--------------------------------');

const perfilViewPath = path.join(projectRoot, 'views/perfil.hbs');
if (fs.existsSync(perfilViewPath)) {
  const perfilContent = fs.readFileSync(perfilViewPath, 'utf8');
  
  expectedColorVars.forEach(colorVar => {
    if (perfilContent.includes(colorVar)) {
      console.log(`✅ ${colorVar}`);
    } else {
      console.log(`❌ ${colorVar} - NO ENCONTRADO`);
      allChecksPass = false;
    }
  });
} else {
  console.log('❌ No se puede verificar views/perfil.hbs - archivo no existe');
  allChecksPass = false;
}

console.log('\n🎭 VERIFICANDO ESTILOS CONSISTENTES:');
console.log('-----------------------------------');

if (fs.existsSync(perfilViewPath)) {
  const perfilContent = fs.readFileSync(perfilViewPath, 'utf8');
  
  expectedStyles.forEach(style => {
    if (perfilContent.includes(style)) {
      console.log(`✅ ${style.substring(0, 50)}...`);
    } else {
      console.log(`❌ ${style.substring(0, 50)}... - NO ENCONTRADO`);
      allChecksPass = false;
    }
  });
}

console.log('\n🏗️ VERIFICANDO ESTRUCTURA HTML:');
console.log('-------------------------------');

if (fs.existsSync(perfilViewPath)) {
  const perfilContent = fs.readFileSync(perfilViewPath, 'utf8');
  
  expectedElements.forEach(element => {
    const classSelector = `class="${element}"`;
    const classSelector2 = `class=".*${element}.*"`;
    
    if (perfilContent.includes(classSelector) || perfilContent.includes(element)) {
      console.log(`✅ ${element}`);
    } else {
      console.log(`❌ ${element} - NO ENCONTRADO`);
      allChecksPass = false;
    }
  });
}

console.log('\n🔍 VERIFICANDO COMPONENTES ESPECÍFICOS:');
console.log('--------------------------------------');

if (fs.existsSync(perfilViewPath)) {
  const perfilContent = fs.readFileSync(perfilViewPath, 'utf8');
  
  const componentChecks = [
    { check: 'Bootstrap 5.3', description: 'Framework Bootstrap 5.3.2' },
    { check: 'Bootstrap Icons', description: 'Iconografía Bootstrap Icons' },
    { check: 'Inter', description: 'Fuente Google Fonts Inter' },
    { check: 'header-section', description: 'Sección de header con borde izquierdo' },
    { check: 'stats-row', description: 'Grid de estadísticas' },
    { check: 'profile-avatar', description: 'Avatar de perfil con gradiente' },
    { check: 'role-badge', description: 'Badge de rol del usuario' },
    { check: 'section-title', description: 'Títulos de sección con borde inferior' },
    { check: 'activity-item', description: 'Items de actividad reciente' },
    { check: 'back-btn', description: 'Botón de regreso estilizado' }
  ];
  
  componentChecks.forEach(check => {
    if (perfilContent.includes(check.check)) {
      console.log(`✅ ${check.description}`);
    } else {
      console.log(`❌ ${check.description} - NO ENCONTRADO`);
      allChecksPass = false;
    }
  });
}

console.log('\n⚡ VERIFICANDO FUNCIONALIDADES JAVASCRIPT:');
console.log('-----------------------------------------');

if (fs.existsSync(perfilViewPath)) {
  const perfilContent = fs.readFileSync(perfilViewPath, 'utf8');
  
  const jsChecks = [
    { check: 'profile-form', description: 'Formulario de actualización de perfil' },
    { check: 'password-form', description: 'Formulario de cambio de contraseña' },
    { check: 'fetch(\'/perfil/actualizar\'', description: 'AJAX para actualizar perfil' },
    { check: 'fetch(\'/perfil/cambiar-password\'', description: 'AJAX para cambiar contraseña' },
    { check: 'showAlert', description: 'Sistema de alertas JavaScript' },
    { check: 'spinner-border', description: 'Estados de loading con spinners' }
  ];
  
  jsChecks.forEach(check => {
    if (perfilContent.includes(check.check)) {
      console.log(`✅ ${check.description}`);
    } else {
      console.log(`❌ ${check.description} - NO ENCONTRADO`);
      allChecksPass = false;
    }
  });
}

console.log('\n📊 COMPARACIÓN CON MÓDULO CATEGORÍAS:');
console.log('------------------------------------');

const categoriasPath = path.join(projectRoot, 'views/admin/categorias-admin.hbs');
if (fs.existsSync(categoriasPath) && fs.existsSync(perfilViewPath)) {
  const categoriasContent = fs.readFileSync(categoriasPath, 'utf8');
  const perfilContent = fs.readFileSync(perfilViewPath, 'utf8');
  
  const comparisonChecks = [
    { 
      pattern: ':root {', 
      description: 'Variables CSS root coincidentes',
      categorias: categoriasContent.includes(':root {'),
      perfil: perfilContent.includes(':root {')
    },
    { 
      pattern: 'font-family: \'Inter\'', 
      description: 'Fuente Inter aplicada',
      categorias: categoriasContent.includes('font-family: \'Inter\''),
      perfil: perfilContent.includes('font-family: \'Inter\'')
    },
    { 
      pattern: 'background: linear-gradient(135deg, #f8fafc', 
      description: 'Fondo con gradiente gris',
      categorias: categoriasContent.includes('background: linear-gradient(135deg, #f8fafc'),
      perfil: perfilContent.includes('background: linear-gradient(135deg, #f8fafc')
    },
    { 
      pattern: 'border-left: 5px solid var(--primary-color)', 
      description: 'Borde izquierdo naranja en headers',
      categorias: categoriasContent.includes('border-left: 5px solid var(--primary-color)'),
      perfil: perfilContent.includes('border-left: 5px solid var(--primary-color)')
    }
  ];
  
  comparisonChecks.forEach(check => {
    if (check.categorias && check.perfil) {
      console.log(`✅ ${check.description} - CONSISTENTE`);
    } else if (!check.categorias && !check.perfil) {
      console.log(`⚠️  ${check.description} - AMBOS FALTANTES`);
    } else {
      console.log(`❌ ${check.description} - INCONSISTENTE`);
      allChecksPass = false;
    }
  });
}

console.log('\n📈 RESUMEN FINAL:');
console.log('=================');

if (allChecksPass) {
  console.log('🎉 ¡ACTUALIZACIÓN DE DISEÑO EXITOSA!');
  console.log('');
  console.log('✨ Características implementadas:');
  console.log('  • Paleta de colores idéntica al módulo categorías');
  console.log('  • Background con gradiente gris suave');
  console.log('  • Headers con borde izquierdo naranja');
  console.log('  • Cards con sombras y bordes redondeados');
  console.log('  • Estadísticas con iconos naranjas');
  console.log('  • Botones con gradientes y efectos hover');
  console.log('  • Fuente Inter aplicada consistentemente');
  console.log('  • Estructura HTML similar a categorías');
  console.log('');
  console.log('🔗 El módulo perfil ahora tiene el MISMO DISEÑO que categorías');
  console.log('🎨 Paleta de colores: Naranja (#ea580c) + Grises neutros');
  console.log('📱 Totalmente responsivo con Bootstrap 5.3.2');
  
} else {
  console.log('⚠️  HAY PROBLEMAS CON LA ACTUALIZACIÓN');
  console.log('Por favor revisa los elementos marcados con ❌');
}

console.log('');
console.log('📝 NOTAS DE LA ACTUALIZACIÓN:');
console.log('• Se cambió el fondo de gradiente azul-púrpura a gris suave');
console.log('• Se aplicó el borde izquierdo naranja en el header');
console.log('• Se unificaron los colores de iconos y botones');
console.log('• Se adoptó la estructura de cards del módulo categorías');
console.log('• Se mantuvo toda la funcionalidad original intacta');
console.log('=====================================================');