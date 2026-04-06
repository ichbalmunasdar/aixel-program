// ============================================================
//  AiXel Program — Google Apps Script Backend
//  Spreadsheet ID: 1RHORcuMWzHjR_kFsvxz_WAWQpJZ52fOokt5sgUz1gtk
//
//  CARA PASANG:
//  1. Buka Google Sheets → Extensions → Apps Script
//  2. Hapus isi default, paste seluruh kode ini
//  3. Klik Deploy → New deployment → Web app
//     - Execute as: Me
//     - Who has access: Anyone
//  4. Copy URL deployment, paste ke index.html pada variabel APPS_SCRIPT_URL
// ============================================================

var SHEET_ID = '1RHORcuMWzHjR_kFsvxz_WAWQpJZ52fOokt5sgUz1gtk';

// ── Sheet names ──
var SHEET_PENDAFTARAN = 'Pendaftaran';

// ── Header row untuk sheet Pendaftaran ──
var HEADERS_PENDAFTARAN = [
  'Timestamp',
  'Ref ID',
  'Nama Lengkap',
  'Email',
  'Jabatan / Role',
  'Departemen',
  'Atasan Langsung',
  'Lama di Talentlytica',
  'AI Tools yang Digunakan',
  'Kesiapan AI (1-5)',
  'Eksplorasi Mandiri GenAI',
  'Eksperimen di Pekerjaan',
  'Berbagi & Berkomunitas',
  'Komitmen Disetujui',
  'Harapan dari Program',
  'Catatan Tambahan',
  'Status'
];

// ============================================================
//  doPost — menerima data dari website
// ============================================================
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === 'pendaftaran') {
      return handlePendaftaran(data);
    }

    return jsonResponse({ status: 'error', message: 'Unknown action: ' + action });

  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

// ============================================================
//  doGet — test endpoint (buka URL di browser untuk cek)
// ============================================================
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'AiXel Apps Script is running!' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//  Handler: Form Pendaftaran
// ============================================================
function handlePendaftaran(data) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = getOrCreateSheet(ss, SHEET_PENDAFTARAN, HEADERS_PENDAFTARAN);

  var now   = new Date();
  var refId = 'AXL-' + now.getTime().toString(36).toUpperCase().slice(-6);

  var row = [
    Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'),
    refId,
    data.nama         || '',
    data.email        || '',
    data.jabatan      || '',
    data.departemen   || '',
    data.atasan       || '',
    data.tenure       || '',
    data.tools        || '',
    data.kesiapanAI   || '',
    data.eksplorasi   || '',
    data.eksperimen   || '',
    data.berbagi      || '',
    data.komitmen     || '',
    data.harapan      || '',
    data.catatan      || '',
    'Pending Review'
  ];

  sheet.appendRow(row);

  // Format baris baru
  var lastRow = sheet.getLastRow();
  formatNewRow(sheet, lastRow);

  return jsonResponse({
    status: 'success',
    refId:  refId,
    message: 'Pendaftaran berhasil disimpan.'
  });
}

// ============================================================
//  Helpers
// ============================================================

// Buat sheet baru jika belum ada, atau kembalikan yang sudah ada
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Tulis header row
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    // Format header: bold, background teal, warna putih
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#0D7377');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(10);
    // Freeze header row
    sheet.setFrozenRows(1);
    // Auto-resize kolom
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

// Format baris data baru
function formatNewRow(sheet, rowNum) {
  var numCols = sheet.getLastColumn();
  var range   = sheet.getRange(rowNum, 1, 1, numCols);
  // Alternating row color
  range.setBackground(rowNum % 2 === 0 ? '#F0FAFA' : '#FFFFFF');
  // Wrap text untuk kolom isian panjang (kolom 11-15 = Eksplorasi dst)
  sheet.getRange(rowNum, 11, 1, 5).setWrap(true);
  sheet.autoResizeColumns(1, numCols);
}

// Return JSON response dengan CORS header
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
