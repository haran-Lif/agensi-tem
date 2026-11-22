(function attachXlsxExporter(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.XlsxExporter = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createXlsxExporter() {
  function xmlEscape(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function columnName(index) {
    let result = "";
    for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
    return result;
  }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function writeZipHeader(view, signature, nameLength, size, crc, offset = 0, central = false) {
    view.setUint32(0, signature, true);
    if (central) {
      view.setUint16(4, 20, true); view.setUint16(6, 20, true); view.setUint16(8, 0x0800, true); view.setUint16(10, 0, true);
      view.setUint16(12, 0, true); view.setUint16(14, 0, true); view.setUint32(16, crc, true); view.setUint32(20, size, true); view.setUint32(24, size, true);
      view.setUint16(28, nameLength, true); view.setUint16(30, 0, true); view.setUint16(32, 0, true); view.setUint16(34, 0, true); view.setUint16(36, 0, true);
      view.setUint32(38, 0, true); view.setUint32(42, offset, true);
    } else {
      view.setUint16(4, 20, true); view.setUint16(6, 0x0800, true); view.setUint16(8, 0, true); view.setUint16(10, 0, true); view.setUint16(12, 0, true);
      view.setUint32(14, crc, true); view.setUint32(18, size, true); view.setUint32(22, size, true); view.setUint16(26, nameLength, true); view.setUint16(28, 0, true);
    }
  }

  function makeZip(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    for (const [name, content] of Object.entries(files)) {
      const nameBytes = encoder.encode(name);
      const data = encoder.encode(content);
      const crc = crc32(data);
      const local = new Uint8Array(30 + nameBytes.length);
      writeZipHeader(new DataView(local.buffer), 0x04034b50, nameBytes.length, data.length, crc);
      local.set(nameBytes, 30);
      localParts.push(local, data);
      const central = new Uint8Array(46 + nameBytes.length);
      writeZipHeader(new DataView(central.buffer), 0x02014b50, nameBytes.length, data.length, crc, offset, true);
      central.set(nameBytes, 46);
      centralParts.push(central);
      offset += local.length + data.length;
    }
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true); endView.setUint16(4, 0, true); endView.setUint16(6, 0, true);
    endView.setUint16(8, centralParts.length, true); endView.setUint16(10, centralParts.length, true);
    endView.setUint32(12, centralSize, true); endView.setUint32(16, offset, true); endView.setUint16(20, 0, true);
    const parts = [...localParts, ...centralParts, end];
    const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let cursor = 0;
    for (const part of parts) { result.set(part, cursor); cursor += part.length; }
    return result;
  }

  function worksheetXml(headers, rows) {
    const allRows = [headers, ...rows];
    const sheetRows = allRows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => {
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
      if (rowIndex > 0 && typeof value === "number" && Number.isFinite(value)) return `<c r="${reference}"><v>${value}</v></c>`;
      return `<c r="${reference}" t="inlineStr" s="${rowIndex === 0 ? 1 : 0}"><is><t xml:space="preserve">${xmlEscape(value ?? "")}</t></is></c>`;
    }).join("")}</row>`).join("");
    const lastColumn = columnName(headers.length - 1);
    const outputStart = Math.min(14, headers.length);
    const outputColumns = headers.length >= 14 ? `<col min="${outputStart}" max="${headers.length}" width="18" customWidth="1"/>` : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastColumn}${allRows.length}"/><sheetViews><sheetView workbookViewId="0"><pane xSplit="3" ySplit="1" topLeftCell="D2" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="12" customWidth="1"/><col min="2" max="2" width="18" customWidth="1"/><col min="3" max="3" width="24" customWidth="1"/><col min="4" max="${Math.min(13, headers.length)}" width="15" customWidth="1"/>${outputColumns}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${lastColumn}${allRows.length}"/></worksheet>`;
  }

  function safeSheetName(value, index) {
    const clean = String(value || `Sheet${index + 1}`).replace(/[\\/?*\[\]:]/g, " ").trim().slice(0, 31);
    return clean || `Sheet${index + 1}`;
  }

  function createMultiSheetWorkbook(sheets) {
    const normalized = (sheets || []).filter((sheet) => Array.isArray(sheet?.headers)).map((sheet, index) => ({
      name: safeSheetName(sheet.name, index),
      headers: sheet.headers,
      rows: Array.isArray(sheet.rows) ? sheet.rows : [],
    }));
    if (!normalized.length) normalized.push({ name: "Sheet1", headers: ["데이터"], rows: [] });
    const sheetOverrides = normalized.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
    const workbookSheets = normalized.map((sheet, index) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
    const workbookRelationships = normalized.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
    const files = {
      "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetOverrides}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
      "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`,
      "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRelationships}<Relationship Id="rId${normalized.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9E1E8"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`,
    };
    normalized.forEach((sheet, index) => { files[`xl/worksheets/sheet${index + 1}.xml`] = worksheetXml(sheet.headers, sheet.rows); });
    return makeZip(files);
  }

  function createWorkbook(headers, rows, sheetName = "Sheet1") {
    return createMultiSheetWorkbook([{ name: sheetName, headers, rows }]);
  }

  return { createWorkbook, createMultiSheetWorkbook };
});
