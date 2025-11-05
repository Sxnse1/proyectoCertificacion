/**
 * 🚨 SECURITY ALERT SERVICE - STARTEDUCATION
 * ============================================================
 * Servicio para detectar patrones sospechosos y generar alertas
 * automáticas basadas en la actividad de auditoría
 * ============================================================
 */

/**
 * Detecta patrones sospechosos en los logs de auditoría
 * @param {Object} db - Instancia de la base de datos
 * @returns {Promise<Array>} Array de alertas detectadas
 */
async function detectSuspiciousPatterns(db) {
    try {
        console.log('[SECURITY] 🔍 Analizando patrones sospechosos...');
        
        const alerts = [];
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

        // 1. Múltiples eliminaciones en poco tiempo
        const massiveDeletions = await db.executeQuery(`
            SELECT 
                al.UsuarioID,
                u.nombre,
                u.email,
                COUNT(*) as deletions_count,
                MIN(al.Timestamp) as first_deletion,
                MAX(al.Timestamp) as last_deletion
            FROM AuditLogs al
            INNER JOIN Usuarios u ON al.UsuarioID = u.id_usuario
            WHERE al.Accion LIKE '%ELIMINADO%'
                AND al.Timestamp >= @oneHourAgo
            GROUP BY al.UsuarioID, u.nombre, u.email
            HAVING COUNT(*) >= 3
        `, { oneHourAgo });

        if (massiveDeletions.recordset.length > 0) {
            massiveDeletions.recordset.forEach(user => {
                alerts.push({
                    type: 'MASSIVE_DELETIONS',
                    severity: 'HIGH',
                    title: 'Múltiples Eliminaciones Detectadas',
                    message: `El usuario ${user.nombre} (${user.email}) ha eliminado ${user.deletions_count} elementos en la última hora`,
                    user: {
                        id: user.UsuarioID,
                        name: user.nombre,
                        email: user.email
                    },
                    details: {
                        count: user.deletions_count,
                        timespan: '1 hora',
                        first_deletion: user.first_deletion,
                        last_deletion: user.last_deletion
                    },
                    timestamp: now
                });
            });
        }

        // 2. Actividad fuera de horario laboral
        const afterHoursActivity = await db.executeQuery(`
            SELECT 
                al.UsuarioID,
                u.nombre,
                u.email,
                COUNT(*) as actions_count,
                MIN(al.Timestamp) as first_action,
                MAX(al.Timestamp) as last_action
            FROM AuditLogs al
            INNER JOIN Usuarios u ON al.UsuarioID = u.id_usuario
            WHERE al.Timestamp >= @oneDayAgo
                AND (
                    DATEPART(HOUR, al.Timestamp) < 6 
                    OR DATEPART(HOUR, al.Timestamp) > 22
                    OR DATEPART(WEEKDAY, al.Timestamp) IN (1, 7)
                )
            GROUP BY al.UsuarioID, u.nombre, u.email
            HAVING COUNT(*) >= 5
        `, { oneDayAgo });

        if (afterHoursActivity.recordset.length > 0) {
            afterHoursActivity.recordset.forEach(user => {
                alerts.push({
                    type: 'AFTER_HOURS_ACTIVITY',
                    severity: 'MEDIUM',
                    title: 'Actividad Fuera de Horario',
                    message: `El usuario ${user.nombre} (${user.email}) ha realizado ${user.actions_count} acciones fuera del horario laboral`,
                    user: {
                        id: user.UsuarioID,
                        name: user.nombre,
                        email: user.email
                    },
                    details: {
                        count: user.actions_count,
                        timespan: '24 horas',
                        first_action: user.first_action,
                        last_action: user.last_action
                    },
                    timestamp: now
                });
            });
        }

        // 3. Múltiples fallos de autenticación (simulado - podría venir de logs de auth)
        const multipleFailures = await db.executeQuery(`
            SELECT 
                al.UsuarioID,
                u.nombre,
                u.email,
                al.IP,
                COUNT(*) as failure_count
            FROM AuditLogs al
            INNER JOIN Usuarios u ON al.UsuarioID = u.id_usuario
            WHERE al.Accion LIKE '%FAILED%' OR al.Accion LIKE '%ERROR%'
                AND al.Timestamp >= @oneHourAgo
            GROUP BY al.UsuarioID, u.nombre, u.email, al.IP
            HAVING COUNT(*) >= 5
        `, { oneHourAgo });

        if (multipleFailures.recordset.length > 0) {
            multipleFailures.recordset.forEach(user => {
                alerts.push({
                    type: 'MULTIPLE_FAILURES',
                    severity: 'HIGH',
                    title: 'Múltiples Fallos Detectados',
                    message: `Múltiples fallos desde IP ${user.IP} para usuario ${user.nombre}`,
                    user: {
                        id: user.UsuarioID,
                        name: user.nombre,
                        email: user.email
                    },
                    details: {
                        count: user.failure_count,
                        ip: user.IP,
                        timespan: '1 hora'
                    },
                    timestamp: now
                });
            });
        }

        // 4. Cambios masivos de configuración
        const massiveChanges = await db.executeQuery(`
            SELECT 
                al.UsuarioID,
                u.nombre,
                u.email,
                COUNT(*) as changes_count
            FROM AuditLogs al
            INNER JOIN Usuarios u ON al.UsuarioID = u.id_usuario
            WHERE (al.Accion LIKE '%ACTUALIZADO%' OR al.Accion LIKE '%CONFIGURACION%')
                AND al.Timestamp >= @oneHourAgo
            GROUP BY al.UsuarioID, u.nombre, u.email
            HAVING COUNT(*) >= 10
        `, { oneHourAgo });

        if (massiveChanges.recordset.length > 0) {
            massiveChanges.recordset.forEach(user => {
                alerts.push({
                    type: 'MASSIVE_CHANGES',
                    severity: 'MEDIUM',
                    title: 'Cambios Masivos Detectados',
                    message: `El usuario ${user.nombre} ha realizado ${user.changes_count} actualizaciones en la última hora`,
                    user: {
                        id: user.UsuarioID,
                        name: user.nombre,
                        email: user.email
                    },
                    details: {
                        count: user.changes_count,
                        timespan: '1 hora'
                    },
                    timestamp: now
                });
            });
        }

        console.log(`[SECURITY] ✅ Análisis completado: ${alerts.length} alertas generadas`);
        return alerts;

    } catch (error) {
        console.error('[SECURITY] ❌ Error detectando patrones sospechosos:', error);
        throw error;
    }
}

/**
 * Obtiene estadísticas de seguridad del sistema
 * @param {Object} db - Instancia de la base de datos
 * @returns {Promise<Object>} Estadísticas de seguridad
 */
async function getSecurityStats(db) {
    try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

        // Estadísticas generales
        const stats = await db.executeQuery(`
            SELECT 
                COUNT(*) as total_actions_24h,
                COUNT(DISTINCT UsuarioID) as active_users_24h,
                SUM(CASE WHEN Accion LIKE '%ELIMINADO%' THEN 1 ELSE 0 END) as deletions_24h,
                SUM(CASE WHEN Accion LIKE '%CREADO%' THEN 1 ELSE 0 END) as creations_24h,
                SUM(CASE WHEN Accion LIKE '%ACTUALIZADO%' THEN 1 ELSE 0 END) as updates_24h
            FROM AuditLogs 
            WHERE Timestamp >= @oneDayAgo
        `, { oneDayAgo });

        // Top usuarios más activos
        const topUsers = await db.executeQuery(`
            SELECT TOP 5
                u.nombre,
                u.email,
                COUNT(*) as action_count
            FROM AuditLogs al
            INNER JOIN Usuarios u ON al.UsuarioID = u.id_usuario
            WHERE al.Timestamp >= @oneWeekAgo
            GROUP BY u.nombre, u.email
            ORDER BY COUNT(*) DESC
        `, { oneWeekAgo });

        // Acciones por hora del día
        const hourlyActivity = await db.executeQuery(`
            SELECT 
                DATEPART(HOUR, Timestamp) as hour,
                COUNT(*) as action_count
            FROM AuditLogs
            WHERE Timestamp >= @oneWeekAgo
            GROUP BY DATEPART(HOUR, Timestamp)
            ORDER BY hour
        `, { oneWeekAgo });

        return {
            general: stats.recordset[0] || {
                total_actions_24h: 0,
                active_users_24h: 0,
                deletions_24h: 0,
                creations_24h: 0,
                updates_24h: 0
            },
            topUsers: topUsers.recordset,
            hourlyActivity: hourlyActivity.recordset
        };

    } catch (error) {
        console.error('[SECURITY] ❌ Error obteniendo estadísticas de seguridad:', error);
        throw error;
    }
}

/**
 * Genera un reporte de seguridad completo
 * @param {Object} db - Instancia de la base de datos
 * @returns {Promise<Object>} Reporte completo de seguridad
 */
async function generateSecurityReport(db) {
    try {
        console.log('[SECURITY] 📊 Generando reporte de seguridad...');

        const [alerts, stats] = await Promise.all([
            detectSuspiciousPatterns(db),
            getSecurityStats(db)
        ]);

        const report = {
            timestamp: new Date(),
            summary: {
                total_alerts: alerts.length,
                high_severity: alerts.filter(a => a.severity === 'HIGH').length,
                medium_severity: alerts.filter(a => a.severity === 'MEDIUM').length,
                low_severity: alerts.filter(a => a.severity === 'LOW').length
            },
            alerts: alerts,
            statistics: stats,
            recommendations: generateRecommendations(alerts, stats)
        };

        console.log(`[SECURITY] ✅ Reporte generado: ${alerts.length} alertas, ${stats.general.total_actions_24h} acciones en 24h`);
        return report;

    } catch (error) {
        console.error('[SECURITY] ❌ Error generando reporte de seguridad:', error);
        throw error;
    }
}

/**
 * Genera recomendaciones basadas en las alertas y estadísticas
 * @param {Array} alerts - Alertas detectadas
 * @param {Object} stats - Estadísticas del sistema
 * @returns {Array} Array de recomendaciones
 */
function generateRecommendations(alerts, stats) {
    const recommendations = [];

    // Recomendaciones basadas en alertas
    if (alerts.some(a => a.type === 'MASSIVE_DELETIONS')) {
        recommendations.push({
            type: 'SECURITY_POLICY',
            priority: 'HIGH',
            title: 'Implementar Confirmación de Eliminaciones Masivas',
            description: 'Se recomienda requerir confirmación adicional para eliminar múltiples elementos'
        });
    }

    if (alerts.some(a => a.type === 'AFTER_HOURS_ACTIVITY')) {
        recommendations.push({
            type: 'ACCESS_CONTROL',
            priority: 'MEDIUM',
            title: 'Revisar Políticas de Acceso Fuera de Horario',
            description: 'Considerar restricciones de acceso durante horarios no laborales'
        });
    }

    // Recomendaciones basadas en estadísticas
    if (stats.general.deletions_24h > stats.general.creations_24h * 2) {
        recommendations.push({
            type: 'DATA_INTEGRITY',
            priority: 'MEDIUM',
            title: 'Alto Ratio de Eliminaciones',
            description: 'El número de eliminaciones supera significativamente las creaciones'
        });
    }

    return recommendations;
}

module.exports = {
    detectSuspiciousPatterns,
    getSecurityStats,
    generateSecurityReport
};