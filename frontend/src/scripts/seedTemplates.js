// backend/src/scripts/seedTemplates.js
const db = require('../models');
const DocumentTemplate = db.DocumentTemplate;

async function seedTemplates() {
  try {
    console.log('🌱 Iniciando seed de plantillas de documentos...');

    // Verificar si ya existen plantillas
    const existingCount = await DocumentTemplate.count();
    
    if (existingCount > 0) {
      console.log(`⚠️  Ya existen ${existingCount} plantillas. ¿Desea continuar? (Esto no duplicará plantillas existentes)`);
    }

    const templates = [
      {
        name: 'Contrato de Servicio',
        description: 'Contrato estándar de prestación de servicios de Internet',
        templateType: 'contract',
        icon: '📋',
        category: 'legal',
        filePath: 'contrato-servicio.html',
        requiresSignature: true,
        enabled: true,
        version: 1,
        isActiveVersion: true,
        availableVariables: [
          'nombre_completo', 'nombre', 'apellidos', 'email', 'telefono', 
          'whatsapp', 'domicilio', 'numero_cliente', 'numero_contrato',
          'fecha_inicio', 'plan_servicio', 'velocidad_descarga', 'velocidad_subida',
          'precio_mensual', 'usuario_pppoe', 'ip_asignada', 'zona', 'nodo', 
          'sector', 'fecha_generacion', 'latitud', 'longitud', 'qr_data'
        ],
        config: {
          pageSize: 'letter',
          orientation: 'portrait',
          margins: { top: 40, right: 40, bottom: 40, left: 40 }
        },
        metadata: {
          usageCount: 0,
          lastUsed: null
        }
      },
      {
        name: 'Hoja de Instalación',
        description: 'Documento técnico de registro de instalación de equipo',
        templateType: 'installation',
        icon: '🔧',
        category: 'technical',
        filePath: 'hoja-instalacion.html',
        requiresSignature: true,
        enabled: true,
        version: 1,
        isActiveVersion: true,
        availableVariables: [
          'nombre_completo', 'numero_cliente', 'telefono', 'email', 'domicilio',
          'latitud', 'longitud', 'plan_servicio', 'velocidad_descarga', 
          'velocidad_subida', 'zona', 'nodo', 'sector', 'ip_asignada',
          'usuario_pppoe', 'fecha_instalacion', 'tecnico_instalador',
          'metros_cable', 'cantidad_conectores'
        ],
        config: {
          pageSize: 'letter',
          orientation: 'portrait',
          margins: { top: 30, right: 30, bottom: 30, left: 30 }
        },
        metadata: {
          usageCount: 0,
          lastUsed: null
        }
      },
      {
        name: 'Recibo de Pago',
        description: 'Comprobante de pago de servicios de Internet',
        templateType: 'receipt',
        icon: '🧾',
        category: 'billing',
        filePath: 'recibo-pago.html',
        requiresSignature: false,
        enabled: true,
        version: 1,
        isActiveVersion: true,
        availableVariables: [
          'nombre_completo', 'numero_cliente', 'domicilio', 'telefono',
          'plan_servicio', 'velocidad_descarga', 'velocidad_subida',
          'precio_mensual', 'numero_recibo', 'fecha_generacion',
          'periodo_facturacion', 'servicios_adicionales', 'adeudo_anterior',
          'descuentos', 'total_pagado', 'total_en_letra', 'metodo_pago',
          'referencia_pago'
        ],
        config: {
          pageSize: 'letter',
          orientation: 'portrait',
          margins: { top: 20, right: 20, bottom: 20, left: 20 }
        },
        metadata: {
          usageCount: 0,
          lastUsed: null
        }
      },
      {
        name: 'Reporte Técnico',
        description: 'Informe detallado del estado técnico del servicio',
        templateType: 'report',
        icon: '📊',
        category: 'technical',
        filePath: 'reporte-tecnico.html',
        requiresSignature: true,
        enabled: true,
        version: 1,
        isActiveVersion: true,
        availableVariables: [
          'nombre_completo', 'numero_cliente', 'domicilio', 'telefono', 'email',
          'plan_servicio', 'velocidad_descarga', 'velocidad_subida', 'ip_asignada',
          'usuario_pppoe', 'zona', 'nodo', 'sector', 'latitud', 'longitud',
          'numero_reporte', 'fecha_generacion', 'ultima_conexion',
          'frecuencia_sector', 'modelo_router', 'mac_router', 'modelo_antena',
          'mac_antena', 'promedio_descarga', 'min_descarga', 'max_descarga',
          'promedio_subida', 'min_subida', 'max_subida', 'promedio_latencia',
          'min_latencia', 'max_latencia', 'promedio_perdida', 'min_perdida',
          'max_perdida', 'disponibilidad', 'tecnico_responsable',
          'fecha_proxima_revision'
        ],
        config: {
          pageSize: 'letter',
          orientation: 'portrait',
          margins: { top: 25, right: 25, bottom: 25, left: 25 }
        },
        metadata: {
          usageCount: 0,
          lastUsed: null
        }
      }
    ];

    for (const templateData of templates) {
      // Verificar si ya existe
      const existing = await DocumentTemplate.findOne({
        where: { name: templateData.name }
      });

      if (existing) {
        console.log(`⏭️  Plantilla "${templateData.name}" ya existe, saltando...`);
        continue;
      }

      // Crear plantilla
      const template = await DocumentTemplate.create(templateData);
      console.log(`✅ Plantilla "${template.name}" creada exitosamente (ID: ${template.id})`);
    }

    console.log('\n🎉 Seed de plantillas completado!');
    console.log('📋 Total de plantillas en la base de datos:', await DocumentTemplate.count());

  } catch (error) {
    console.error('❌ Error en seed de plantillas:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedTemplates()
    .then(() => {
      console.log('\n✨ Proceso completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { seedTemplates };