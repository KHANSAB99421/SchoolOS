/**
 * Utility functions for Indian currency, English words, date formatting, and CSV tools
 */

export function formatINR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  const rounded = Math.round(amount);
  return '₹' + new Intl.NumberFormat('en-IN').format(rounded);
}

export function formatNumberOnly(amount: number): string {
  if (isNaN(amount)) return '0';
  return new Intl.NumberFormat('en-IN').format(Math.round(amount));
}

const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const twoDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tensMultiple = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertLessThanThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    str += singleDigits[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += tensMultiple[Math.floor(n / 10)] + ' ';
    n %= 10;
  } else if (n >= 10) {
    str += twoDigits[n - 10] + ' ';
    n = 0;
  }
  if (n > 0) {
    str += singleDigits[n] + ' ';
  }
  return str.trim();
}

/**
 * Converts a number to Indian currency words
 * Example: 15450 -> "Fifteen Thousand Four Hundred Fifty Rupees Only"
 */
export function numberToWordsINR(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';
  if (isNaN(amount) || amount < 0) return '';

  let num = Math.floor(amount);
  let words = '';

  // Crores (1,00,00,000)
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  if (crore > 0) {
    words += convertLessThanThousand(crore) + ' Crore ';
  }

  // Lakhs (1,00,000)
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  if (lakh > 0) {
    words += convertLessThanThousand(lakh) + ' Lakh ';
  }

  // Thousands (1,000)
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  if (thousand > 0) {
    words += convertLessThanThousand(thousand) + ' Thousand ';
  }

  // Hundreds & Remaining
  if (num > 0) {
    words += convertLessThanThousand(num);
  }

  return (words.trim() + ' Rupees Only').replace(/\s+/g, ' ');
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function getTodayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Export arbitrary rows to CSV file download
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvRows = [];
  csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

  for (const row of rows) {
    csvRows.push(row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','));
  }

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Simple CSV parser for bulk students
 */
export function parseStudentsCSV(csvText: string): Array<{
  name: string;
  class: string;
  section: string;
  rollNo: string;
  admissionNo: string;
  parentName: string;
  parentMobile: string;
  status: 'active' | 'inactive';
}> {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Header row
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const students = [];

  for (let i = 1; i < lines.length; i++) {
    // Basic CSV splitting handling commas within quotes if any
    const rawCols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (rawCols.length < 3 || !rawCols[0]) continue;

    const rowObj: Record<string, string> = {};
    header.forEach((h, idx) => {
      rowObj[h] = rawCols[idx] || '';
    });

    const name = rowObj['name'] || rowObj['student name'] || rawCols[0] || '';
    const studentClass = rowObj['class'] || rawCols[1] || '1';
    const section = rowObj['section'] || rawCols[2] || 'A';
    const rollNo = rowObj['rollno'] || rowObj['roll no'] || rawCols[3] || String(i);
    const admissionNo = rowObj['admissionno'] || rowObj['admission no'] || rawCols[4] || `ADM-${1000 + i}`;
    const parentName = rowObj['parentname'] || rowObj['parent name'] || rawCols[5] || 'Parent of ' + name;
    const parentMobile = rowObj['parentmobile'] || rowObj['mobile'] || rowObj['phone'] || rawCols[6] || '9876543210';
    const status = (rowObj['status']?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive';

    if (name) {
      students.push({
        name,
        class: studentClass,
        section: section.toUpperCase(),
        rollNo,
        admissionNo,
        parentName,
        parentMobile,
        status,
      });
    }
  }

  return students;
}
