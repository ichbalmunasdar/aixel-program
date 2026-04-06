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
var SHEET_PENDAFTARAN     = 'Pendaftaran';
var SHEET_METRICS_CURRENT = 'metrics_current';
var SHEET_METRICS_HISTORY = 'metrics_history';

// ── Header: Pendaftaran ──
var HEADERS_PENDAFTARAN = [
  'Timestamp','Ref ID','Nama Lengkap','Email','Jabatan / Role','Departemen',
  'Atasan Langsung','Lama di Talentlytica','AI Tools yang Digunakan',
  'Kesiapan AI (1-5)','Eksplorasi Mandiri GenAI','Eksperimen di Pekerjaan',
  'Berbagi & Berkomunitas','Komitmen Disetujui','Harapan dari Program',
  'Catatan Tambahan','Status'
];

// ── Header: metrics_current (1 row per email, upsert) ──
var HEADERS_METRICS_CURRENT = [
  'email','nama','jabatan','atasan',
  'm1_baseline','m2_baseline','m3_baseline','m4_baseline','m5_baseline',
  'm1_current','m2_current','m3_current','m4_current','m5_current',
  'periode','tools','usecase','exp','prompt',
  'highlight','hambatan','rencana','kontrib','kontrib_best',
  'submit_count','created_at','updated_at'
];

// ── Header: metrics_history (append-only) ──
var HEADERS_METRICS_HISTORY = [
  'timestamp','email','nama','jabatan','atasan','periode',
  'm1_baseline','m2_baseline','m3_baseline','m4_baseline','m5_baseline',
  'm1_current','m2_current','m3_current','m4_current','m5_current',
  'm1_gain','m2_gain','m3_gain','m4_gain','m5_gain','avg_gain',
  'tools','usecase','exp','prompt',
  'highlight','hambatan','rencana','kontrib','kontrib_best'
];

// ============================================================
//  doPost
// ============================================================
function doPost(e) {
  try {
    var data   = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === 'pendaftaran')   return handlePendaftaran(data);
    if (action === 'upsertMetrics') return handleUpsertMetrics(data);

    return jsonResponse({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

// ============================================================
//  doGet — health check + getMetrics
//  Usage: ?action=getMetrics&email=xxx@yyy.com
// ============================================================
function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};

  if (params.action === 'getMetrics') {
    return handleGetMetrics(params.email || '');
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'AiXel Apps Script is running!' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//  handleGetMetrics — ambil data terbaru peserta by email
// ============================================================
function handleGetMetrics(email) {
  email = email.trim().toLowerCase();
  if (!email) return jsonResponse({ status: 'error', message: 'Email required' });

  var ss     = SpreadsheetApp.openById(SHEET_ID);
  var sheetC = getOrCreateSheet(ss, SHEET_METRICS_CURRENT, HEADERS_METRICS_CURRENT);
  var sheetP = ss.getSheetByName(SHEET_PENDAFTARAN);

  // Cek apakah terdaftar di Pendaftaran
  var registered = false;
  var participantName = '';
  if (sheetP) {
    var pData = sheetP.getDataRange().getValues();
    for (var i = 1; i < pData.length; i++) {
      if ((pData[i][3] || '').toString().trim().toLowerCase() === email) {
        registered = true;
        participantName = pData[i][2] || '';
        break;
      }
    }
  }

  // Cari di metrics_current
  var current = findRowByEmail(sheetC, email);

  if (current) {
    // Ambil history untuk email ini
    var sheetH   = getOrCreateSheet(ss, SHEET_METRICS_HISTORY, HEADERS_METRICS_HISTORY);
    var histData = sheetH.getDataRange().getValues();
    var hHeaders = histData[0];
    var history  = [];
    for (var j = 1; j < histData.length; j++) {
      if ((histData[j][1] || '').toString().trim().toLowerCase() === email) {
        var rec = {};
        hHeaders.forEach(function(h, idx) { rec[h] = histData[j][idx]; });
        history.push(rec);
      }
    }
    return jsonResponse({ status: 'found', registered: registered, current: current, history: history });
  }

  return jsonResponse({
    status: registered ? 'registered_no_data' : 'not_found',
    registered: registered,
    participantName: participantName,
    current: null,
    history: []
  });
}

// ============================================================
//  handleUpsertMetrics
// ============================================================
function handleUpsertMetrics(data) {
  var email = (data.email || '').trim().toLowerCase();
  if (!email) return jsonResponse({ status: 'error', message: 'Email wajib diisi.' });

  var ss     = SpreadsheetApp.openById(SHEET_ID);
  var sheetC = getOrCreateSheet(ss, SHEET_METRICS_CURRENT, HEADERS_METRICS_CURRENT);
  var sheetH = getOrCreateSheet(ss, SHEET_METRICS_HISTORY, HEADERS_METRICS_HISTORY);
  var sheetP = ss.getSheetByName(SHEET_PENDAFTARAN);

  // Validasi: email harus terdaftar
  var registered = false;
  if (sheetP) {
    var pRows = sheetP.getDataRange().getValues();
    for (var i = 1; i < pRows.length; i++) {
      if ((pRows[i][3] || '').toString().trim().toLowerCase() === email) {
        registered = true; break;
      }
    }
  }
  if (!registered) {
    return jsonResponse({ status: 'error', message: 'Email tidak ditemukan dalam daftar peserta AiXel. Pastikan Anda sudah mendaftar.' });
  }

  var now     = new Date();
  var ts      = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  var existing    = findRowByEmail(sheetC, email);
  var isFirstTime = !existing;
  var submitCount = existing ? (parseInt(existing.submit_count) || 0) + 1 : 1;
  var createdAt   = existing ? existing.created_at : ts;

  // Baseline readonly setelah submit pertama
  var m1b = isFirstTime ? (data.m1_baseline || '') : (existing.m1_baseline || '');
  var m2b = isFirstTime ? (data.m2_baseline || '') : (existing.m2_baseline || '');
  var m3b = isFirstTime ? (data.m3_baseline || '') : (existing.m3_baseline || '');
  var m4b = isFirstTime ? (data.m4_baseline || '') : (existing.m4_baseline || '');
  var m5b = isFirstTime ? (data.m5_baseline || '') : (existing.m5_baseline || '');

  function calcGain(baseline, current, dir) {
    var b = parseFloat(baseline); var c = parseFloat(current);
    if (isNaN(b) || isNaN(c) || b === 0) return '';
    var raw = (c - b) / b;
    return ((dir === -1 ? -raw : raw) * 100).toFixed(1) + '%';
  }

  var gains = [
    calcGain(m1b, data.m1_current, -1),
    calcGain(m2b, data.m2_current,  1),
    calcGain(m3b, data.m3_current, -1),
    calcGain(m4b, data.m4_current,  1),
    calcGain(m5b, data.m5_current,  1)
  ];
  var validG  = gains.map(function(g){return parseFloat(g);}).filter(function(g){return !isNaN(g);});
  var avgGain = validG.length ? (validG.reduce(function(s,v){return s+v;},0)/validG.length).toFixed(1)+'%' : '';

  // Upsert metrics_current
  var currentRow = [
    email, data.nama||'', data.jabatan||'', data.atasan||'',
    m1b, m2b, m3b, m4b, m5b,
    data.m1_current||'', data.m2_current||'', data.m3_current||'', data.m4_current||'', data.m5_current||'',
    data.periode||'', data.tools||'', data.usecase||'', data.exp||'', data.prompt||'',
    data.highlight||'', data.hambatan||'', data.rencana||'', data.kontrib||'', data.kontrib_best||'',
    submitCount, createdAt, ts
  ];

  if (existing && existing._rowIndex) {
    sheetC.getRange(existing._rowIndex, 1, 1, currentRow.length).setValues([currentRow]);
  } else {
    sheetC.appendRow(currentRow);
    formatNewRow(sheetC, sheetC.getLastRow());
  }

  // Append metrics_history
  var histRow = [
    ts, email, data.nama||'', data.jabatan||'', data.atasan||'', data.periode||'',
    m1b, m2b, m3b, m4b, m5b,
    data.m1_current||'', data.m2_current||'', data.m3_current||'', data.m4_current||'', data.m5_current||'',
    gains[0], gains[1], gains[2], gains[3], gains[4], avgGain,
    data.tools||'', data.usecase||'', data.exp||'', data.prompt||'',
    data.highlight||'', data.hambatan||'', data.rencana||'', data.kontrib||'', data.kontrib_best||''
  ];
  sheetH.appendRow(histRow);
  formatNewRow(sheetH, sheetH.getLastRow());

  return jsonResponse({
    status: 'success',
    isFirstTime: isFirstTime,
    submitCount: submitCount,
    avgGain: avgGain,
    message: isFirstTime
      ? 'Data pertama berhasil disimpan. Baseline telah ditetapkan.'
      : 'Progress bulan ini berhasil diperbarui (submit ke-' + submitCount + ').'
  });
}

// ============================================================
//  handlePendaftaran
// ============================================================
function handlePendaftaran(data) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = getOrCreateSheet(ss, SHEET_PENDAFTARAN, HEADERS_PENDAFTARAN);

  var now   = new Date();
  var refId = 'AXL-' + now.getTime().toString(36).toUpperCase().slice(-6);

  var row = [
    Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'),
    refId,
    data.nama||'', data.email||'', data.jabatan||'', data.departemen||'',
    data.atasan||'', data.tenure||'', data.tools||'',
    data.kesiapanAI||'', data.eksplorasi||'', data.eksperimen||'',
    data.berbagi||'', data.komitmen||'', data.harapan||'', data.catatan||'',
    'Pending Review'
  ];

  sheet.appendRow(row);
  formatNewRow(sheet, sheet.getLastRow());

  return jsonResponse({ status: 'success', refId: refId, message: 'Pendaftaran berhasil disimpan.' });
}

// ============================================================
//  Helpers
// ============================================================

function findRowByEmail(sheet, email) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if ((data[i][0] || '').toString().trim().toLowerCase() === email) {
      var rec = { _rowIndex: i + 1 };
      headers.forEach(function(h, idx) { rec[h] = data[i][idx]; });
      return rec;
    }
  }
  return null;
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    var hr = sheet.getRange(1, 1, 1, headers.length);
    hr.setBackground('#0D7377');
    hr.setFontColor('#FFFFFF');
    hr.setFontWeight('bold');
    hr.setFontSize(10);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

function formatNewRow(sheet, rowNum) {
  var numCols = sheet.getLastColumn();
  sheet.getRange(rowNum, 1, 1, numCols).setBackground(rowNum % 2 === 0 ? '#F0FAFA' : '#FFFFFF');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
