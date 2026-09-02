import * as XLSX from 'xlsx';

/**
 * Normaliza nombres de columnas (quita acentos, minúsculas, espacios)
 */
function normalizeKey(key) {
  return String(key || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Exporta una lista de items (productos o servicios) a un archivo Excel (.xlsx)
 */
export function exportItemsToExcel({ items = [], type = 'product', filename = 'Registros', categories = [], storeLocations = [] }) {
  if (!items || items.length === 0) {
    throw new Error('No hay registros para exportar');
  }

  const isProduct = type === 'product';

  const rows = items.map((item) => {
    // Resolver categoría
    let categoryName = item.category || '';
    if (!categoryName && item.category_id && categories.length > 0) {
      const found = categories.find((c) => c.id === item.category_id);
      if (found) categoryName = found.name;
    }
    if (!categoryName) categoryName = 'Sin categoría';

    // Resolver sede
    let locationName = item.store_location?.name || '';
    if (!locationName && item.store_location_id && storeLocations.length > 0) {
      const foundLoc = storeLocations.find((l) => l.id === item.store_location_id);
      if (foundLoc) locationName = foundLoc.name;
    }

    // Resolver estado
    let statusLabel = 'Inactivo';
    if (item.status === 'active') statusLabel = 'Activo';
    else if (item.status === 'out_of_stock') statusLabel = 'Agotado';

    if (isProduct) {
      return {
        'Nombre': item.name || '',
        'Categoría': categoryName,
        'Precio': Number(item.price) || 0,
        'Stock': Number(item.stock) || 0,
        'Estado': statusLabel,
        'Sede / Sucursal': locationName,
        'Descripción': item.description || '',
      };
    } else {
      return {
        'Nombre': item.name || '',
        'Categoría': categoryName,
        'Precio': Number(item.price) || 0,
        'Duración (minutos)': Number(item.duration) || 0,
        'Estado': statusLabel,
        'Sede / Sucursal': locationName,
        'Descripción': item.description || '',
      };
    }
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Anchos automáticos de columnas
  ws['!cols'] = isProduct
    ? [
        { wch: 28 }, // Nombre
        { wch: 22 }, // Categoría
        { wch: 14 }, // Precio
        { wch: 12 }, // Stock
        { wch: 14 }, // Estado
        { wch: 22 }, // Sede
        { wch: 40 }, // Descripción
      ]
    : [
        { wch: 28 }, // Nombre
        { wch: 22 }, // Categoría
        { wch: 14 }, // Precio
        { wch: 20 }, // Duración
        { wch: 14 }, // Estado
        { wch: 22 }, // Sede
        { wch: 40 }, // Descripción
      ];

  const wb = XLSX.utils.book_new();
  const sheetName = isProduct ? 'Productos' : 'Servicios';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Descarga una plantilla de Excel con estructura y datos de ejemplo
 */
export function downloadExcelTemplate({ type = 'product' }) {
  const isProduct = type === 'product';

  const sampleRows = isProduct
    ? [
        {
          'Nombre': 'Producto Ejemplo 1',
          'Categoría': 'Belleza',
          'Precio': 25000,
          'Stock': 50,
          'Estado': 'Activo',
          'Sede / Sucursal': '',
          'Descripción': 'Descripción del producto de ejemplo 1',
        },
        {
          'Nombre': 'Producto Ejemplo 2',
          'Categoría': 'Cuidado Facial',
          'Precio': 18000,
          'Stock': 20,
          'Estado': 'Activo',
          'Sede / Sucursal': '',
          'Descripción': 'Descripción del producto de ejemplo 2',
        },
      ]
    : [
        {
          'Nombre': 'Servicio Ejemplo 1',
          'Categoría': 'Barbería',
          'Precio': 35000,
          'Duración (minutos)': 45,
          'Estado': 'Activo',
          'Sede / Sucursal': '',
          'Descripción': 'Corte de cabello clásico y perfilado de barba',
        },
        {
          'Nombre': 'Servicio Ejemplo 2',
          'Categoría': 'Estética',
          'Precio': 55000,
          'Duración (minutos)': 60,
          'Estado': 'Activo',
          'Sede / Sucursal': '',
          'Descripción': 'Limpieza facial profunda con hidratación',
        },
      ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  ws['!cols'] = isProduct
    ? [
        { wch: 28 },
        { wch: 22 },
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
        { wch: 22 },
        { wch: 40 },
      ]
    : [
        { wch: 28 },
        { wch: 22 },
        { wch: 14 },
        { wch: 20 },
        { wch: 14 },
        { wch: 22 },
        { wch: 40 },
      ];

  const wb = XLSX.utils.book_new();
  const sheetName = isProduct ? 'Plantilla Productos' : 'Plantilla Servicios';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const filename = isProduct ? 'Plantilla_Importar_Productos.xlsx' : 'Plantilla_Importar_Servicios.xlsx';
  XLSX.writeFile(wb, filename);
}

/**
 * Lee y parsea un archivo Excel (.xlsx, .xls, .csv)
 * Retorna una lista de filas normalizadas para crear productos o servicios
 */
export function parseExcelFile(file, type = 'product') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('El archivo Excel no contiene hojas');
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('El archivo Excel está vacío o no contiene registros');
        }

        const isProduct = type === 'product';

        const parsedRows = rawJson.map((row, index) => {
          // Normalizar llaves
          const normalizedRow = {};
          Object.keys(row).forEach((k) => {
            normalizedRow[normalizeKey(k)] = row[k];
          });

          // Extraer nombre
          const name =
            normalizedRow['nombre'] ||
            normalizedRow['name'] ||
            normalizedRow['producto'] ||
            normalizedRow['servicio'] ||
            normalizedRow['titulo'] ||
            '';

          // Extraer categoría
          const categoryName =
            normalizedRow['categoria'] ||
            normalizedRow['category'] ||
            normalizedRow['categoria del producto'] ||
            normalizedRow['categoria del servicio'] ||
            '';

          // Extraer precio
          let rawPrice =
            normalizedRow['precio'] ||
            normalizedRow['price'] ||
            normalizedRow['valor'] ||
            0;
          if (typeof rawPrice === 'string') {
            rawPrice = rawPrice.replace(/[^0-9.-]+/g, '');
          }
          const price = Number(rawPrice) || 0;

          // Extraer stock o duración
          let stock = 0;
          let duration = 30;

          if (isProduct) {
            let rawStock =
              normalizedRow['stock'] ||
              normalizedRow['cantidad'] ||
              normalizedRow['inventario'] ||
              0;
            if (typeof rawStock === 'string') {
              rawStock = rawStock.replace(/[^0-9.-]+/g, '');
            }
            stock = Math.max(0, parseInt(rawStock, 10) || 0);
          } else {
            let rawDuration =
              normalizedRow['duracion'] ||
              normalizedRow['duracion (minutos)'] ||
              normalizedRow['duracion minutos'] ||
              normalizedRow['minutos'] ||
              normalizedRow['duration'] ||
              30;
            if (typeof rawDuration === 'string') {
              rawDuration = rawDuration.replace(/[^0-9.-]+/g, '');
            }
            duration = Math.max(1, parseInt(rawDuration, 10) || 30);
          }

          // Extraer estado
          const rawStatus = String(
            normalizedRow['estado'] ||
            normalizedRow['status'] ||
            normalizedRow['activo'] ||
            'active'
          ).toLowerCase().trim();

          let status = 'active';
          if (rawStatus === 'inactivo' || rawStatus === 'inactive' || rawStatus === 'false' || rawStatus === 'no') {
            status = 'inactive';
          } else if (rawStatus === 'agotado' || rawStatus === 'out_of_stock') {
            status = 'out_of_stock';
          }

          // Extraer sede
          const locationName =
            normalizedRow['sede'] ||
            normalizedRow['sede / sucursal'] ||
            normalizedRow['sucursal'] ||
            normalizedRow['ubicacion'] ||
            normalizedRow['store'] ||
            normalizedRow['store_location'] ||
            '';

          // Extraer descripción
          const description =
            normalizedRow['descripcion'] ||
            normalizedRow['description'] ||
            normalizedRow['detalle'] ||
            '';

          // Validación básica
          const isValid = String(name).trim().length > 0 && price >= 0;
          const errors = [];
          if (!String(name).trim()) errors.push('El nombre es requerido');
          if (price < 0) errors.push('El precio debe ser mayor o igual a 0');

          return {
            _index: index + 1,
            name: String(name).trim(),
            categoryName: String(categoryName).trim(),
            price,
            stock: isProduct ? stock : undefined,
            duration: !isProduct ? duration : undefined,
            status,
            locationName: String(locationName).trim(),
            description: String(description).trim(),
            isValid,
            errors,
          };
        });

        resolve(parsedRows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo Excel'));
    };

    reader.readAsArrayBuffer(file);
  });
}
