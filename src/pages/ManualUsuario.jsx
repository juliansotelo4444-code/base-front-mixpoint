import { useState, useMemo } from 'react';
import {
    IconManual, IconBuscar, IconChevron, IconRemito, IconRecepcion,
    IconProducto, IconClientes, IconProveedores, IconGastos, IconUsuarios,
    IconMix, IconSync, IconBanco, IconReporte, IconFlyer, IconCarrito, IconDashboard
} from '../components/Icons';

const SECCIONES_MANUAL = [
    {
        id: 'panel',
        titulo: 'Panel Principal (Dashboard)',
        ruta: '/',
        icono: IconDashboard,
        color: '#6366f1',
        resumen: 'Vista panorámica y métricas financieras, logísticas y comerciales en tiempo real.',
        contenido: [
            {
                subtitulo: 'Indicadores Clave (KPIs)',
                detalle: 'Muestra en tiempo real las ventas totales del día, el número de remitos pendientes de armado en depósito, la cantidad de productos con stock en nivel crítico de reposición y el saldo acumulado en cuentas corrientes por cobrar.'
            },
            {
                subtitulo: 'Gráficos de Tendencias y Flujo',
                detalle: 'Gráfico evolutivo de ventas semanales comparando volumen en kilogramos despachados versus facturación monetaria. Permite detectar picos de demanda y días de mayor movimiento.'
            },
            {
                subtitulo: 'Alertas Tempranas del Sistema',
                detalle: 'Notificaciones automáticas sobre lotes próximos a vencer para priorizar su salida (criterio FEFO) y detección de transferencias entrantes pendientes de conciliar.'
            }
        ],
        tips: [
            'Utiliza los botones de acceso rápido para emitir remitos o ingresar stock sin pasar por el menú lateral.',
            'Haz clic en cualquier tarjeta de alerta para ir directamente al módulo correspondiente.'
        ]
    },
    {
        id: 'remitos',
        titulo: 'Remitos Comerciales',
        ruta: '/remitos',
        icono: IconRemito,
        color: '#10b981',
        resumen: 'Emisión mayorista, cálculo de escalas de precios, control FEFO y comprobantes A4.',
        contenido: [
            {
                subtitulo: 'Paso a Paso: Emisión de Remito',
                detalle: '1. Clic en "+ Nuevo Remito".\n2. Selecciona el Cliente: el sistema autocompleta CUIT, dirección, lista de precios asignada y saldo actual de cuenta corriente.\n3. Añadir Productos: busca por código o nombre, indica la cantidad en kilos o bultos. Los precios se calculan automáticamente según las escalas de volumen (1kg, 5kg, 10kg, 25kg, 30kg).\n4. Descuentos y Fletes: añade bonificaciones o costo de envío si corresponde.\n5. Guardar: el remito entra en estado "Pendiente de Preparación" y viaja por WebSockets en tiempo real al tablero del depósito.'
            },
            {
                subtitulo: 'Acciones y Exportación',
                detalle: '• Impresión A4 Oficial: genera la hoja membretada A4 con código QR de verificación, detalle de bultos y talón de recepción para firma.\n• Etiquetas de Bulto: imprime rótulos autoadhesivos con código de barras y datos del destinatario para adherir a bolsas o cajas.\n• WhatsApp Directo: envía el remito o PDF directo al teléfono registrado del cliente.'
            },
            {
                subtitulo: 'Anulación de Comprobantes',
                detalle: 'Solo disponible para administradores. Al anular un remito, el stock se reincorpora automáticamente al inventario y el motivo queda registrado en la auditoría inmutable.'
            }
        ],
        tips: [
            'Usa el atajo Ctrl + N para abrir la ventana de nuevo remito desde cualquier parte.',
            'Si un cliente supera su límite de crédito configurado, el sistema advertirá antes de confirmar.'
        ]
    },
    {
        id: 'deposito',
        titulo: 'Depósito — Tablero Kanban',
        ruta: '/deposito-kanban',
        icono: IconRecepcion,
        color: '#f59e0b',
        resumen: 'Organización física del picking, fraccionamiento, pesaje y despacho sincronizado en vivo.',
        contenido: [
            {
                subtitulo: 'Sincronización en Tiempo Real (Socket.io)',
                detalle: 'Cada vez que Administración o Ventas emite un remito, la tarjeta aparece de manera instantánea en la primera columna del depósito sin necesidad de recargar la página web.'
            },
            {
                subtitulo: 'Flujo de Estados (Arrastrar y Soltar)',
                detalle: '1. Pendientes de Armado: remitos recién ingresados listos para tomar.\n2. En Preparación / Fraccionamiento: el operario toma el remito para pesar o armar bolsas.\n3. Control y Embalaje: mercadería verificada, pesada y etiquetada.\n4. Listo para Despacho: agrupado en zona de carga para flete o retiro.'
            },
            {
                subtitulo: 'Ficha de Picking y Ubicaciones',
                detalle: 'Al abrir cualquier tarjeta se muestra la lista de materiales, estantería asignada en el galpón y el desglose de lotes específicos asignados por vencimiento.'
            }
        ],
        tips: [
            'Diseñado para pantallas táctiles o terminales en depósito con interfaz de alto contraste.',
            'Cada cambio de estado notifica al módulo comercial para saber si el pedido ya está listo.'
        ]
    },
    {
        id: 'pedidos-web',
        titulo: 'Pedidos Web (E-Commerce & B2B)',
        ruta: '/pedidos-web',
        icono: IconCarrito,
        color: '#3b82f6',
        resumen: 'Bandeja de entrada y conversión directa de pedidos online a remitos oficiales.',
        contenido: [
            {
                subtitulo: 'Gestión de Solicitudes Entrantes',
                detalle: 'Recepción automática de compras generadas desde la tienda online o formulario de pedidos mayoristas. Muestra cliente, productos, total y estado (Nuevo, Confirmado, Rechazado).'
            },
            {
                subtitulo: 'Botón "Convertir a Remito"',
                detalle: 'Con un solo clic transforma la orden web en un remito formal, cargando ítems y precios automáticamente y validando existencias reales en inventario para prevenir ventas sin stock.'
            }
        ],
        tips: [
            'Revisa las observaciones del cliente web antes de convertir el pedido para contemplar preferencias de horario de entrega.'
        ]
    },
    {
        id: 'catalogo-flyers',
        titulo: 'Catálogo Interactivo & Creador de Flyers',
        ruta: '/catalogo-flyers',
        icono: IconFlyer,
        color: '#ec4899',
        resumen: 'Catálogo revista de 21 páginas con fotos ilustrativas y diseñador publicitario.',
        contenido: [
            {
                subtitulo: 'Revista / Catálogo Digital (21 Páginas)',
                detalle: '• Portada Oficial en Alta Definición con estética Mix Point.\n• Grilla de productos con imágenes ilustrativas individuales, fichas técnicas y precios por escala.\n• Modo Pantalla Completa ideal para exhibición en mostrador o presentaciones con clientes.'
            },
            {
                subtitulo: 'Creador de Flyers y Promociones',
                detalle: 'Permite seleccionar de 1 a 6 artículos destacados, personalizar títulos y subtítulos (ej: "Super Oferta Semanal") y descargar la pieza publicitaria en formato PNG o PDF lista para estados de WhatsApp e Instagram.'
            },
            {
                subtitulo: 'Compartir en Redes y WhatsApp',
                detalle: 'Botón de exportación inmediata que envía el enlace del catálogo o la imagen del flyer directamente al chat de ventas.'
            }
        ],
        tips: [
            'Puedes usar Ctrl + K en cualquier momento para abrir el catálogo rápidamente.',
            'Utiliza la vista por categorías si deseas filtrar solo Frutos Secos o Mixes Propios.'
        ]
    },
    {
        id: 'recepciones',
        titulo: 'Recepción de Mercadería & Trazabilidad',
        ruta: '/recepciones',
        icono: IconRecepcion,
        color: '#06b6d4',
        resumen: 'Ingreso de materia prima a granel, control de calidad y generación de lotes FEFO.',
        contenido: [
            {
                subtitulo: 'Circuito de Ingreso de Materia Prima',
                detalle: '1. Selecciona el proveedor y número de factura/remito del remitente.\n2. Carga los kilogramos recibidos y costo unitario de compra ($/kg).\n3. Ingresa fecha de elaboración y fecha de vencimiento: el sistema genera el código de lote único (LOTE-YYYYMM-XXXX).\n4. Checklist de Calidad: confirma estado del empaque, humedad e inocuidad antes de aprobar el ingreso.'
            },
            {
                subtitulo: 'Impacto Inmediato en Stock',
                detalle: 'Al guardar la recepción, los kilos se suman automáticamente al inventario general y el lote queda disponible para fraccionamiento, armado de mixes y venta.'
            }
        ],
        tips: [
            'Cargar siempre con precisión la fecha de vencimiento para garantizar que el algoritmo FEFO priorice la rotación correcta de mercadería.'
        ]
    },
    {
        id: 'produccion',
        titulo: 'Armado de Mixes (Producción)',
        ruta: '/produccion',
        icono: IconMix,
        color: '#8b5cf6',
        resumen: 'Fraccionamiento y elaboración de mezclas con consumo automático de materias primas.',
        contenido: [
            {
                subtitulo: 'Fórmulas y Recetas (BOM)',
                detalle: 'Selecciona la receta a elaborar (ej: Mix Europeo, Mix Energético, Mix Tropical, etc.) e indica la cantidad de kilos finales a producir (ej: 100 kg).'
            },
            {
                subtitulo: 'Explosión de Materiales y Descuento Automático',
                detalle: 'El sistema calcula las proporciones exactas de nueces, almendras, pasas y castañas a consumir, valida si hay suficiente stock de los lotes más antiguos y, al confirmar, descuenta la materia prima ingresando el nuevo lote de producto terminado.'
            }
        ],
        tips: [
            'Imprime la etiqueta de lote del producto terminado inmediatamente para identificar las bolsas producidas en depósito.'
        ]
    },
    {
        id: 'productos',
        titulo: 'Productos y Gestión de Stock',
        ruta: '/productos',
        icono: IconProducto,
        color: '#14b8a6',
        resumen: 'Maestro de artículos, escalas de precios (1/5/10/25/30kg), fotos y alertas de stock.',
        contenido: [
            {
                subtitulo: 'Administración de Artículos',
                detalle: 'Alta, edición y baja de productos. Asignación de SKU, categoría, descripción comercial e imagen ilustrativa.'
            },
            {
                subtitulo: 'Escalas de Precios Mayoristas',
                detalle: 'Configuración de 5 niveles de precios por volumen: 1kg, 5kg, 10kg, 25kg (bolsa cerrada) y 30kg (pallet mayorista). El sistema aplica la tarifa correcta según los kilos acumulados en el remito.'
            },
            {
                subtitulo: 'Ajuste Manual y Umbral Mínimo',
                detalle: 'Definición de stock mínimo para disparar alertas preventivas. Funcionalidad de ajuste manual por inventario físico con justificación obligatoria para auditoría.'
            }
        ],
        tips: [
            'Puedes filtrar por categoría para revisar rápidamente existencias y precios.',
            'Usa la actualización masiva para ajustar precios por porcentaje ante variaciones de costos.'
        ]
    },
    {
        id: 'clientes',
        titulo: 'Clientes y Cuentas Corrientes',
        ruta: '/clientes',
        icono: IconClientes,
        color: '#3b82f6',
        resumen: 'Ficha integral, historial de compras, límites de crédito y resúmenes de deuda.',
        contenido: [
            {
                subtitulo: 'Ficha Comercial del Cliente',
                detalle: 'Registro de datos fiscales, teléfono WhatsApp para envío de comprobantes, dirección de entrega y lista de precios asignada.'
            },
            {
                subtitulo: 'Gestión de Cuentas Corrientes',
                detalle: 'Visualización clara de cargos por remitos emitidos (debe) y pagos recibidos (haber). Saldo en tiempo real y límite de crédito configurable.'
            },
            {
                subtitulo: 'Resumen de Cuenta para WhatsApp',
                detalle: 'Generación instantánea del estado de cuenta con facturas adeudadas y enlaces de pago en formato PDF o texto limpio para enviar al cliente por WhatsApp.'
            }
        ],
        tips: [
            'Al emitir un remito, el saldo adeudado del cliente aparece en pantalla para facilitar la gestión de cobranzas.'
        ]
    },
    {
        id: 'conciliacion',
        titulo: 'Conciliación Bancaria Automática',
        ruta: '/conciliacion',
        icono: IconBanco,
        color: '#10b981',
        resumen: 'Monitoreo de transferencias entrantes (alias mixpoint2026) y cancelación de remitos.',
        contenido: [
            {
                subtitulo: 'Cruce Inteligente de Movimientos',
                detalle: 'Importa extractos bancarios o lee acreditaciones dirigidas al alias de la empresa. El algoritmo cruza CUIT, titular y monto con las deudas pendientes de los clientes.'
            },
            {
                subtitulo: 'Conciliación con 1 Clic',
                detalle: 'Al confirmar una coincidencia, el sistema asienta el recibo de cobro, reduce el saldo en la cuenta corriente del cliente y marca los remitos asociados como cobrados.'
            }
        ],
        tips: [
            'Evita errores manuales cotejando siempre el ID de transferencia del banco con el comprobante que envíe el cliente.'
        ]
    },
    {
        id: 'reportes-diarios',
        titulo: 'Reportes Diarios Matutinos (8:00 AM)',
        ruta: '/reportes-diarios',
        icono: IconReporte,
        color: '#f97316',
        resumen: 'Consolidado ejecutivo matutino para toma de decisiones y planificación de la jornada.',
        contenido: [
            {
                subtitulo: 'Resumen Operativo y Financiero',
                detalle: 'Reporte consolidado con la recaudación del día anterior, volumen en kilos despachados, remitos pendientes de salida matutina y compras de materia prima programadas.'
            },
            {
                subtitulo: 'Exportación a PDF y Planillas',
                detalle: 'Descarga con formato formal para compartir con la dirección de la empresa o imprimir para la reunión operativa de inicio de turno.'
            }
        ],
        tips: [
            'Revisar a primera hora para priorizar las rutas del reparto matutino.'
        ]
    },
    {
        id: 'sincronizacion-sheets',
        titulo: 'Sincronización con Google Sheets',
        ruta: '/sincronizacion-sheets',
        icono: IconSync,
        color: '#059669',
        resumen: 'Conexión bidireccional entre la base de datos y hojas de cálculo en la nube.',
        contenido: [
            {
                subtitulo: 'Integración en Dos Direcciones',
                detalle: '• Modificaciones de precios o costos en Google Sheets se reflejan directamente en la aplicación.\n• Las ventas, remitos y salidas de stock del sistema se vuelcan a las hojas de cálculo para resguardo externo y auditoría contable.'
            },
            {
                subtitulo: 'Forzar Sincronización',
                detalle: 'Botón manual para disparar la actualización inmediata en caso de haber editado planillas de precios masivos fuera de horario programado.'
            }
        ],
        tips: [
            'Verifica el indicador de estado de sincronización en la barra superior para confirmar que la conexión con Google esté activa.'
        ]
    },
    {
        id: 'proveedores-gastos',
        titulo: 'Proveedores & Gastos Operativos',
        ruta: '/proveedores',
        icono: IconProveedores,
        color: '#64748b',
        resumen: 'Padrón de productores, cuentas a pagar y registro de egresos comerciales.',
        contenido: [
            {
                subtitulo: 'Padrón de Proveedores y Cuentas a Pagar',
                detalle: 'Gestión de datos de contacto de productores agrícolas e importadores, plazos de pago y seguimiento de deudas pendientes.'
            },
            {
                subtitulo: 'Gastos Operativos Clasificados',
                detalle: 'Carga de costos fijos y variables (fletes, alquileres, servicios, empaques, maquinaria) para determinar la rentabilidad y el balance neto real del negocio.'
            }
        ],
        tips: [
            'Adjunta el número de comprobante o ticket a cada gasto para facilitar la conciliación contable de fin de mes.'
        ]
    },
    {
        id: 'auditoria-usuarios',
        titulo: 'Auditoría & Seguridad de Usuarios',
        ruta: '/auditoria',
        icono: IconUsuarios,
        color: '#ef4444',
        resumen: 'Registro inmutable de acciones (audit trail) y asignación de roles por sector.',
        contenido: [
            {
                subtitulo: 'Historial / Auditoría Inmutable',
                detalle: 'Registra qué usuario realizó cada acción (creación, edición o anulación de remitos, ajustes de inventario, bajas de clientes), con marca de tiempo exacta y valores previos vs nuevos.'
            },
            {
                subtitulo: 'Roles y Permisos',
                detalle: '• Administrador: acceso total a costos, reportes, usuarios y configuraciones.\n• Ventas: habilitado para remitos, catálogo, clientes y consultas.\n• Depósito: acceso al Tablero Kanban, armado de pedidos y stock físico (sin visualización de márgenes ni costos financieros).'
            }
        ],
        tips: [
            'La auditoría no puede ser modificada ni eliminada, garantizando absoluta transparencia operativa.'
        ]
    }
];

export default function ManualUsuario() {
    const [busqueda, setBusqueda] = useState('');
    const [seccionSeleccionada, setSeccionSeleccionada] = useState(SECCIONES_MANUAL[0].id);

    const seccionesFiltradas = useMemo(() => {
        if (!busqueda.trim()) return SECCIONES_MANUAL;
        const q = busqueda.toLowerCase();
        return SECCIONES_MANUAL.filter(sec =>
            sec.titulo.toLowerCase().includes(q) ||
            sec.resumen.toLowerCase().includes(q) ||
            sec.contenido.some(c => c.subtitulo.toLowerCase().includes(q) || c.detalle.toLowerCase().includes(q)) ||
            (sec.tips && sec.tips.some(t => t.toLowerCase().includes(q)))
        );
    }, [busqueda]);

    const seccionActiva = useMemo(() => {
        return SECCIONES_MANUAL.find(s => s.id === seccionSeleccionada) || seccionesFiltradas[0] || SECCIONES_MANUAL[0];
    }, [seccionSeleccionada, seccionesFiltradas]);

    return (
        <div className="manual-usuario-page" style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
            {/* ENCABEZADO PRINCIPAL */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 16,
                marginBottom: 28,
                paddingBottom: 20,
                borderBottom: '1px solid var(--color-border)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <div style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
                        }}>
                            <IconManual style={{ width: 24, height: 24 }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                                Manual de Uso y Guía Operativa
                            </h1>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
                                Distribuidora Mix Point • Documentación oficial de funcionalidades y flujos de trabajo
                            </p>
                        </div>
                    </div>
                </div>

                {/* BUSCADOR DE INSTRUCCIONES */}
                <div style={{ position: 'relative', width: 340, maxWidth: '100%' }}>
                    <IconBuscar style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)',
                        pointerEvents: 'none'
                    }} />
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar funcionalidad, atajo o módulo..."
                        className="form-control"
                        style={{
                            paddingLeft: 38,
                            borderRadius: 8,
                            fontSize: 13,
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)'
                        }}
                    />
                    {busqueda && (
                        <button
                            onClick={() => setBusqueda('')}
                            style={{
                                position: 'absolute',
                                right: 10,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer',
                                fontSize: 14
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            </header>

            {/* CONTENEDOR DE DOS COLUMNAS */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '320px 1fr',
                gap: 24,
                alignItems: 'start'
            }}>
                {/* COLUMNA IZQUIERDA: ÍNDICE DE SECCIONES */}
                <aside style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 12,
                    padding: '16px 12px',
                    position: 'sticky',
                    top: 20,
                    maxHeight: 'calc(100vh - 120px)',
                    overflowY: 'auto'
                }}>
                    <div style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--color-text-muted)',
                        padding: '4px 12px 10px 12px',
                        letterSpacing: '0.06em'
                    }}>
                        Módulos ({seccionesFiltradas.length})
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {seccionesFiltradas.length === 0 ? (
                            <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
                                No se encontraron módulos que coincidan con la búsqueda.
                            </div>
                        ) : (
                            seccionesFiltradas.map((sec) => {
                                const Icono = sec.icono;
                                const activo = seccionActiva?.id === sec.id;
                                return (
                                    <button
                                        key={sec.id}
                                        type="button"
                                        onClick={() => setSeccionSeleccionada(sec.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: 8,
                                            border: 'none',
                                            background: activo ? 'var(--color-surface-hover, rgba(255,255,255,0.06))' : 'transparent',
                                            color: activo ? 'var(--color-primary, #f59e0b)' : 'var(--color-text)',
                                            fontWeight: activo ? 600 : 400,
                                            fontSize: 13,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                            <div style={{
                                                width: 26,
                                                height: 26,
                                                borderRadius: 6,
                                                background: activo ? sec.color : 'rgba(255,255,255,0.05)',
                                                color: activo ? '#fff' : 'var(--color-text-muted)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <Icono style={{ width: 14, height: 14 }} />
                                            </div>
                                            <span style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {sec.titulo}
                                            </span>
                                        </div>
                                        <IconChevron style={{
                                            width: 14,
                                            height: 14,
                                            opacity: activo ? 1 : 0.3,
                                            transform: activo ? 'translateX(2px)' : 'none'
                                        }} />
                                    </button>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* COLUMNA DERECHA: DETALLE COMPLETO DE LA SECCIÓN */}
                {seccionActiva && (
                    <main style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 12,
                        padding: 32,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}>
                        {/* CABECERA DE LA SECCIÓN */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 16,
                            marginBottom: 24,
                            paddingBottom: 20,
                            borderBottom: '1px solid var(--color-border)'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                    <div style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        background: seccionActiva.color,
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <seccionActiva.icono style={{ width: 20, height: 20 }} />
                                    </div>
                                    <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
                                        {seccionActiva.titulo}
                                    </h2>
                                </div>
                                <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
                                    {seccionActiva.resumen}
                                </p>
                            </div>

                            <a
                                href={seccionActiva.ruta}
                                className="btn btn-secondary btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                            >
                                <span>Ir a la sección</span>
                                <IconChevron style={{ width: 14, height: 14 }} />
                            </a>
                        </div>

                        {/* BLOQUES DE EXPLICACIÓN DETALLADA */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {seccionActiva.contenido.map((bloque, idx) => (
                                <div key={idx} style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: 10,
                                    padding: '18px 20px',
                                    border: '1px solid rgba(255, 255, 255, 0.04)'
                                }}>
                                    <h3 style={{
                                        fontSize: 16,
                                        fontWeight: 600,
                                        color: 'var(--color-primary, #f59e0b)',
                                        margin: '0 0 10px 0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8
                                    }}>
                                        <span style={{
                                            display: 'inline-block',
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: 'var(--color-primary, #f59e0b)'
                                        }} />
                                        {bloque.subtitulo}
                                    </h3>
                                    <div style={{
                                        fontSize: 13.5,
                                        lineHeight: 1.65,
                                        color: 'var(--color-text)',
                                        whiteSpace: 'pre-line'
                                    }}>
                                        {bloque.detalle}
                                    </div>
                                </div>
                            ))}

                            {/* RECOMENDACIONES Y CONSEJOS (TIPS) */}
                            {seccionActiva.tips && seccionActiva.tips.length > 0 && (
                                <div style={{
                                    marginTop: 12,
                                    background: 'rgba(245, 158, 11, 0.06)',
                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                    borderRadius: 10,
                                    padding: '16px 20px'
                                }}>
                                    <div style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: '#f59e0b',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        marginBottom: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}>
                                        💡 Buenas Prácticas y Consejos Clave
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.6, color: 'var(--color-text)' }}>
                                        {seccionActiva.tips.map((tip, i) => (
                                            <li key={i} style={{ marginBottom: 4 }}>
                                                {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* ATAJOS Y ASISTENCIA */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 12,
                                marginTop: 16,
                                paddingTop: 16,
                                borderTop: '1px solid var(--color-border)',
                                fontSize: 12,
                                color: 'var(--color-text-muted)'
                            }}>
                                <div>
                                    ¿Dudas operativas? Puedes consultar al asistente inteligente <strong>Jarvis</strong> en la esquina inferior.
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span className="badge badge-neutral">Ruta: {seccionActiva.ruta}</span>
                                </div>
                            </div>
                        </div>
                    </main>
                )}
            </div>
        </div>
    );
}
