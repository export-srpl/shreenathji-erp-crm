/**
 * Utility functions for exporting data to Excel/CSV
 */

export interface ExportColumn {
  key: string;
  label: string;
}

/**
 * Convert data array to CSV format
 */
export function convertToCSV(data: any[], columns: ExportColumn[]): string {
  // Create header row
  const headers = columns.map(col => `"${col.label}"`).join(',');
  
  // Create data rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = getNestedValue(row, col.key);
      // Escape quotes and wrap in quotes
      const stringValue = String(value ?? '').replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',');
  });
  
  return [headers, ...rows].join('\n');
}

/**
 * Convert data array to Excel-compatible CSV (with BOM for UTF-8)
 */
export function convertToExcelCSV(data: any[], columns: ExportColumn[]): string {
  const csv = convertToCSV(data, columns);
  // Add BOM for Excel UTF-8 support
  return '\ufeff' + csv;
}

/**
 * Download CSV file
 */
export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : '';
  }, obj);
}

/**
 * Format date for export
 */
export function formatDateForExport(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '0.00';
  return amount.toFixed(2);
}

