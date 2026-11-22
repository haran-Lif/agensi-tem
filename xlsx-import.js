(function attachXlsxImporter(root) {
  function columnIndex(reference) {
    const letters = String(reference || "").match(/[A-Z]+/)?.[0] || "A";
    return [...letters].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  }

  function elements(node, localName) {
    return [...node.getElementsByTagNameNS("*", localName)];
  }

  function xmlText(node) {
    return elements(node, "t").map((item) => item.textContent || "").join("");
  }

  function normalizeZipPath(path) {
    const parts = [];
    String(path).split("/").forEach((part) => {
      if (!part || part === ".") return;
      if (part === "..") parts.pop();
      else parts.push(part);
    });
    return parts.join("/");
  }

  function parseSharedStrings(xml) {
    if (!xml) return [];
    const document = new DOMParser().parseFromString(xml, "application/xml");
    return elements(document, "si").map(xmlText);
  }

  function parseSheet(xml, sharedStrings) {
    const document = new DOMParser().parseFromString(xml, "application/xml");
    return elements(document, "row").map((row) => {
      const values = [];
      elements(row, "c").forEach((cell) => {
        const index = columnIndex(cell.getAttribute("r"));
        const type = cell.getAttribute("t");
        const raw = elements(cell, "v")[0]?.textContent ?? "";
        let value = raw;
        if (type === "s") value = sharedStrings[Number(raw)] ?? "";
        else if (type === "inlineStr") value = xmlText(cell);
        else if (type === "b") value = raw === "1";
        else if (raw !== "" && Number.isFinite(Number(raw))) value = Number(raw);
        values[index] = value;
      });
      return values;
    });
  }

  function rowsToObjects(rows, requiredHeaders, minHeaderMatches, errorLabel) {
    const headerIndex = rows.findIndex((row) => requiredHeaders.filter((header) => row.includes(header)).length >= minHeaderMatches);
    if (headerIndex < 0) throw new Error(`${errorLabel} 시트의 헤더를 찾을 수 없습니다.`);
    const headers = rows[headerIndex].map((value) => String(value || "").trim());
    const objects = rows.slice(headerIndex + 1).map((row, rowOffset) => {
      const object = { __rowNumber: headerIndex + rowOffset + 2 };
      headers.forEach((header, index) => { if (header) object[header] = row[index] ?? ""; });
      return object;
    }).filter((row) => headers.some((header) => header && String(row[header] ?? "").trim()));
    return { headers, rows: objects };
  }

  async function readWorkbookRows(file, options) {
    if (!root.JSZip) throw new Error("Excel 압축 해제 모듈을 불러오지 못했습니다.");
    const zip = await root.JSZip.loadAsync(await file.arrayBuffer());
    const workbookXml = await zip.file("xl/workbook.xml")?.async("text");
    const relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("text");
    if (!workbookXml || !relsXml) throw new Error("올바른 Excel 통합문서가 아닙니다.");

    const workbookDocument = new DOMParser().parseFromString(workbookXml, "application/xml");
    const relsDocument = new DOMParser().parseFromString(relsXml, "application/xml");
    const relationships = new Map(
      elements(relsDocument, "Relationship").map((relationship) => [
        relationship.getAttribute("Id"),
        relationship.getAttribute("Target"),
      ]),
    );
    const sheets = elements(workbookDocument, "sheet").map((sheet) => ({
      name: sheet.getAttribute("name"),
      relationId: sheet.getAttribute("r:id"),
    }));
    const selectedSheet = sheets.find((sheet) => options.sheetNames.includes(sheet.name))
      || sheets.find((sheet) => options.sheetKeywords.some((keyword) => sheet.name?.includes(keyword)))
      || sheets[0];
    if (!selectedSheet) throw new Error("읽을 수 있는 시트가 없습니다.");
    const target = relationships.get(selectedSheet.relationId);
    const sheetPath = target?.startsWith("/") ? normalizeZipPath(target.slice(1)) : normalizeZipPath(`xl/${target}`);
    const sheetXml = await zip.file(sheetPath)?.async("text");
    if (!sheetXml) throw new Error(`${selectedSheet.name} 시트를 읽지 못했습니다.`);
    const sharedXml = await zip.file("xl/sharedStrings.xml")?.async("text");
    const parsed = rowsToObjects(
      parseSheet(sheetXml, parseSharedStrings(sharedXml)),
      options.requiredHeaders,
      options.minHeaderMatches,
      options.errorLabel,
    );
    return { ...parsed, sheetName: selectedSheet.name };
  }

  function readRows(file) {
    return readWorkbookRows(file, {
      sheetNames: ["업무업로드"],
      sheetKeywords: ["업무"],
      requiredHeaders: ["업무번호", "보조번호", "업무명", "결과물 분류", "산출물 분류", "작업자", "팀명", "세부그룹", "Count"],
      minHeaderMatches: 4,
      errorLabel: "업무업로드",
    });
  }

  function readDeliverableRows(file) {
    return readWorkbookRows(file, {
      sheetNames: ["결과물업로드", "산출물업로드"],
      sheetKeywords: ["결과물", "산출물"],
      requiredHeaders: ["프로젝트", "결과물 명칭", "산출물 명칭", "기준공수"],
      minHeaderMatches: 3,
      errorLabel: "결과물업로드",
    });
  }

  root.XlsxImporter = { readRows, readDeliverableRows };
})(typeof globalThis !== "undefined" ? globalThis : window);
