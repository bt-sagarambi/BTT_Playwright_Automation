/**
 * Build a simple .docx from a .txt prompt (Word OpenXML).
 * Usage: node scripts/build-prompt-docx.mjs <txtPath> <docxPath>
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDocumentXml(lines) {
  const paras = lines
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paras}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;
}

async function writeDocx(txtPath, docxPath) {
  const lines = fs.readFileSync(txtPath, 'utf8').split(/\r?\n/);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-docx-'));
  const wordDir = path.join(tmp, 'word');
  const relsDir = path.join(tmp, '_rels');
  const wordRels = path.join(wordDir, '_rels');
  fs.mkdirSync(wordRels, { recursive: true });
  fs.mkdirSync(relsDir, { recursive: true });

  fs.writeFileSync(
    path.join(tmp, '[Content_Types].xml'),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  fs.writeFileSync(
    path.join(relsDir, '.rels'),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  fs.writeFileSync(path.join(wordDir, 'document.xml'), buildDocumentXml(lines));
  fs.writeFileSync(
    path.join(wordRels, 'document.xml.rels'),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`
  );

  // Prefer PowerShell Compress-Archive via child process is awkward for docx; use adm-zip if present else manual zip via powershell
  if (fs.existsSync(docxPath)) fs.unlinkSync(docxPath);
  const ps = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory('${tmp.replace(/'/g, "''")}', '${docxPath.replace(/'/g, "''")}')
`;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
  console.log('Wrote', docxPath);
}

const [txtPath, docxPath] = process.argv.slice(2);
if (!txtPath || !docxPath) {
  console.error('Usage: node scripts/build-prompt-docx.mjs <txt> <docx>');
  process.exit(1);
}
writeDocx(path.resolve(txtPath), path.resolve(docxPath)).catch((e) => {
  console.error(e);
  process.exit(1);
});
