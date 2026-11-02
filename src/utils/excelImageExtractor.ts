import JSZip from 'jszip';

export interface ExtractedExcelImage {
  sheetName: string;
  row: number; // 0-based row index in Excel (Row 1 in Excel = 0, Row 2 = 1, etc.)
  col: number; // 0-based col index in Excel (Col A = 0, Col B = 1, etc.)
  toRow?: number;
  toCol?: number;
  dataUrl: string;
}

/**
 * Converts Excel column letter (A, B, ..., Z, AA, AB) to 0-based index
 */
function colLettersToNumber(colStr: string): number {
  let col = 0;
  const upper = colStr.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    col = col * 26 + (upper.charCodeAt(i) - 64);
  }
  return Math.max(0, col - 1);
}

/**
 * Infers image MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'bmp':
      return 'image/bmp';
    case 'emf':
    case 'wmf':
      // Microsoft vector graphics; some browsers may not support native rendering, but store as fallback
      return `image/${ext}`;
    default:
      return 'image/png';
  }
}

/**
 * Optimizes/resizes images to avoid memory bloating and localStorage quota errors.
 * Preserves high quality (up to 800x800px) while compressing to ~30-70KB.
 */
async function resizeImageIfNeeded(dataUrl: string, maxDim = 800): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return dataUrl;
  // If small already (< 60KB), no need to re-encode
  if (dataUrl.length < 60 * 1024) return dataUrl;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          if (!width || !height) {
            resolve(dataUrl);
            return;
          }

          if (width <= maxDim && height <= maxDim && dataUrl.length < 150 * 1024) {
            resolve(dataUrl);
            return;
          }

          let newWidth = width;
          let newHeight = height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              newHeight = Math.round((height * maxDim) / width);
              newWidth = maxDim;
            } else {
              newWidth = Math.round((width * maxDim) / height);
              newHeight = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = newWidth;
          canvas.height = newHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          const isPng = dataUrl.startsWith('data:image/png');
          const outputType = isPng ? 'image/png' : 'image/jpeg';
          const resized = canvas.toDataURL(outputType, 0.85);

          // If resized is unexpectedly larger than original, keep original
          if (resized.length > dataUrl.length) {
            resolve(dataUrl);
          } else {
            resolve(resized);
          }
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

/**
 * Normalizes relative file paths inside an OpenXML package zip
 */
function resolveZipPath(baseDir: string, relativePath: string): string {
  const cleanRel = relativePath.replace(/^\//, '');
  if (!cleanRel.startsWith('..')) {
    if (cleanRel.startsWith('xl/')) return cleanRel;
    return `${baseDir}/${cleanRel}`.replace(/\/+/g, '/');
  }

  // Handle ../
  const baseParts = baseDir.split('/').filter(Boolean);
  const relParts = cleanRel.split('/').filter(Boolean);

  for (const part of relParts) {
    if (part === '..') {
      baseParts.pop();
    } else if (part !== '.') {
      baseParts.push(part);
    }
  }

  return baseParts.join('/');
}

/**
 * Parses relationships from any .rels XML string into a Map of Id -> Target
 */
function parseRelationships(relsXml: string, baseDir: string): Map<string, string> {
  const map = new Map<string, string>();
  const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/gi;
  let match: RegExpExecArray | null;

  while ((match = relRegex.exec(relsXml)) !== null) {
    const id = match[1];
    const target = match[2];
    const resolved = resolveZipPath(baseDir, target);
    map.set(id, resolved);
  }

  return map;
}

/**
 * Master function to extract images embedded directly inside an Excel (.xlsx) file.
 * Supports:
 * 1. Traditional floating pictures (anchored in cells / over cells via DrawingML)
 * 2. Excel 365 "Place in Cell" pictures (cellimages.xml)
 * 3. Fallback unanchored images in media folder
 */
export async function extractImagesFromExcel(
  fileBuffer: Uint8Array,
  targetSheetNames: string[] = []
): Promise<Map<string, ExtractedExcelImage[]>> {
  const result = new Map<string, ExtractedExcelImage[]>();

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(fileBuffer);
  } catch (err) {
    // If not a valid zip archive (e.g. .csv or old binary .xls format)
    console.debug('File is not an OpenXML zip archive, skipping image extraction:', err);
    return result;
  }

  // 1. Parse xl/workbook.xml to map sheet names to rId
  const workbookXmlFile = zip.file('xl/workbook.xml');
  if (!workbookXmlFile) {
    return result;
  }

  const workbookXml = await workbookXmlFile.async('text');
  const workbookRelsFile = zip.file('xl/_rels/workbook.xml.rels');
  const workbookRelsXml = workbookRelsFile ? await workbookRelsFile.async('text') : '';
  const workbookRelsMap = parseRelationships(workbookRelsXml, 'xl');

  // Map sheetName -> sheetXmlPath
  // e.g. <sheet name="獎品清單" sheetId="1" r:id="rId1"/>
  const sheetNameToPath = new Map<string, string>();
  const sheetList: { name: string; path: string; index: number }[] = [];

  const sheetRegex = /<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/gi;
  let sMatch: RegExpExecArray | null;
  let sheetIdx = 0;

  while ((sMatch = sheetRegex.exec(workbookXml)) !== null) {
    const name = sMatch[1];
    const rId = sMatch[2];
    const resolvedPath = workbookRelsMap.get(rId);
    if (resolvedPath) {
      sheetNameToPath.set(name, resolvedPath);
      sheetList.push({ name, path: resolvedPath, index: sheetIdx });
      sheetIdx++;
    }
  }

  // Fallback: If no sheets found via r:id, check standard worksheets/sheet1.xml
  if (sheetList.length === 0 && targetSheetNames.length > 0) {
    targetSheetNames.forEach((name, idx) => {
      const p = `xl/worksheets/sheet${idx + 1}.xml`;
      if (zip.file(p)) {
        sheetNameToPath.set(name, p);
        sheetList.push({ name, path: p, index: idx });
      }
    });
  }

  // 2. Parse Excel 365 In-Cell Images (xl/cellimages.xml) if present
  const cellImagesList: string[] = [];
  const cellImagesFile = zip.file('xl/cellimages.xml');
  if (cellImagesFile) {
    try {
      const cellImagesXml = await cellImagesFile.async('text');
      const cellImagesRelsFile = zip.file('xl/_rels/cellimages.xml.rels') || zip.file('xl/cellimages.xml.rels');
      const cellImagesRelsXml = cellImagesRelsFile ? await cellImagesRelsFile.async('text') : '';
      const cellImagesRelsMap = parseRelationships(cellImagesRelsXml, 'xl');

      // Look for <a:blip r:embed="rId..."/>
      const blipRegex = /<[^>]*:?blip[^>]*r:embed="([^"]+)"/gi;
      let bMatch: RegExpExecArray | null;
      while ((bMatch = blipRegex.exec(cellImagesXml)) !== null) {
        const embedId = bMatch[1];
        const mediaPath = cellImagesRelsMap.get(embedId);
        if (mediaPath) {
          const mFile = zip.file(mediaPath) || zip.file(mediaPath.replace(/^\//, ''));
          if (mFile) {
            const base64 = await mFile.async('base64');
            const mime = getMimeType(mediaPath);
            const dataUrl = `data:${mime};base64,${base64}`;
            const optimized = await resizeImageIfNeeded(dataUrl);
            cellImagesList.push(optimized);
          }
        }
      }
    } catch (err) {
      console.warn('Failed parsing cellimages.xml:', err);
    }
  }

  // Cache of media files already converted to data URLs to avoid duplicate decoding
  const mediaDataUrlCache = new Map<string, string>();
  const getCachedMediaDataUrl = async (mediaPath: string): Promise<string | null> => {
    if (mediaDataUrlCache.has(mediaPath)) {
      return mediaDataUrlCache.get(mediaPath)!;
    }
    const cleanPath = mediaPath.replace(/^\//, '');
    const mFile = zip.file(cleanPath) || zip.file(`xl/${cleanPath}`);
    if (!mFile) return null;

    try {
      const base64 = await mFile.async('base64');
      const mime = getMimeType(mediaPath);
      const rawUrl = `data:${mime};base64,${base64}`;
      const optimized = await resizeImageIfNeeded(rawUrl);
      mediaDataUrlCache.set(mediaPath, optimized);
      return optimized;
    } catch {
      return null;
    }
  };

  // 3. Process each worksheet for DrawingML (Floating / Cell Anchored Images)
  for (const sheet of sheetList) {
    const sheetImages: ExtractedExcelImage[] = [];
    const sheetXmlFile = zip.file(sheet.path);
    if (!sheetXmlFile) continue;

    const sheetXml = await sheetXmlFile.async('text');

    // Find sheet rels file (e.g. xl/worksheets/_rels/sheet1.xml.rels)
    const sheetFileName = sheet.path.split('/').pop() || '';
    const sheetRelsPath = `xl/worksheets/_rels/${sheetFileName}.rels`;
    const sheetRelsFile = zip.file(sheetRelsPath);

    if (sheetRelsFile) {
      const sheetRelsXml = await sheetRelsFile.async('text');
      const sheetRelsMap = parseRelationships(sheetRelsXml, 'xl/worksheets');

      // Look for drawings relationship: Type containing "drawing"
      const drawingRels: string[] = [];
      const dRelRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Type="[^"]*\/drawing"[^>]*Target="([^"]+)"/gi;
      let dMatch: RegExpExecArray | null;
      while ((dMatch = dRelRegex.exec(sheetRelsXml)) !== null) {
        const target = dMatch[2];
        const resolved = resolveZipPath('xl/worksheets', target);
        drawingRels.push(resolved);
      }

      // If no explicit Type=".../drawing", check any Target matching drawings/drawing*.xml
      if (drawingRels.length === 0) {
        sheetRelsMap.forEach((targetPath) => {
          if (targetPath.includes('drawings/drawing')) {
            drawingRels.push(targetPath);
          }
        });
      }

      // Process each drawing XML for this sheet
      for (const drawingPath of drawingRels) {
        const cleanDrawingPath = drawingPath.replace(/^\//, '');
        const drawingFile = zip.file(cleanDrawingPath);
        if (!drawingFile) continue;

        const drawingXml = await drawingFile.async('text');
        const drawingFileName = cleanDrawingPath.split('/').pop() || '';
        const drawingRelsPath = `xl/drawings/_rels/${drawingFileName}.rels`;
        const drawingRelsFile = zip.file(drawingRelsPath);
        const drawingRelsXml = drawingRelsFile ? await drawingRelsFile.async('text') : '';
        const drawingRelsMap = parseRelationships(drawingRelsXml, 'xl/drawings');

        // Extract anchor blocks: twoCellAnchor & oneCellAnchor
        const anchorRegex = /<(?:xdr:)?(twoCellAnchor|oneCellAnchor)[^>]*>([\s\S]*?)<\/(?:xdr:)?\1>/gi;
        let aMatch: RegExpExecArray | null;

        while ((aMatch = anchorRegex.exec(drawingXml)) !== null) {
          const anchorBody = aMatch[2];

          // Parse <from> row & col
          const fromColMatch = /<(?:xdr:)?from>[\s\S]*?<(?:xdr:)?col>\s*(\d+)\s*<\/(?:xdr:)?col>/i.exec(anchorBody);
          const fromRowMatch = /<(?:xdr:)?from>[\s\S]*?<(?:xdr:)?row>\s*(\d+)\s*<\/(?:xdr:)?row>/i.exec(anchorBody);

          // Parse <to> row & col
          const toColMatch = /<(?:xdr:)?to>[\s\S]*?<(?:xdr:)?col>\s*(\d+)\s*<\/(?:xdr:)?col>/i.exec(anchorBody);
          const toRowMatch = /<(?:xdr:)?to>[\s\S]*?<(?:xdr:)?row>\s*(\d+)\s*<\/(?:xdr:)?row>/i.exec(anchorBody);

          // Parse image blip r:embed="rId..."
          const blipMatch = /<(?:a:)?blip[^>]*r:embed="([^"]+)"/i.exec(anchorBody);

          if (fromRowMatch && blipMatch) {
            const row = parseInt(fromRowMatch[1], 10);
            const col = fromColMatch ? parseInt(fromColMatch[1], 10) : 0;
            const toRow = toRowMatch ? parseInt(toRowMatch[1], 10) : undefined;
            const toCol = toColMatch ? parseInt(toColMatch[1], 10) : undefined;
            const embedId = blipMatch[1];

            const mediaPath = drawingRelsMap.get(embedId);
            if (mediaPath) {
              const dataUrl = await getCachedMediaDataUrl(mediaPath);
              if (dataUrl) {
                sheetImages.push({
                  sheetName: sheet.name,
                  row,
                  col,
                  toRow,
                  toCol,
                  dataUrl,
                });
              }
            }
          }
        }
      }
    }

    // 4. Also check Excel 365 In-Cell references inside this sheet's XML
    if (cellImagesList.length > 0) {
      // Find cells with vm="1" or =DISPIMG(...)
      const cellVmRegex = /<c\s+r="([A-Z]+)(\d+)"[^>]*vm="(\d+)"/gi;
      let cvMatch: RegExpExecArray | null;
      let matchedCount = 0;

      while ((cvMatch = cellVmRegex.exec(sheetXml)) !== null) {
        const colLetters = cvMatch[1];
        const rowNum = parseInt(cvMatch[2], 10) - 1; // 0-based
        const colNum = colLettersToNumber(colLetters);
        const vmIdx = parseInt(cvMatch[3], 10);

        // Map vmIdx to image index (vm is 1-based index)
        const imgIdx = vmIdx > 0 && vmIdx <= cellImagesList.length ? vmIdx - 1 : matchedCount;
        const imgUrl = cellImagesList[imgIdx];
        if (imgUrl) {
          // Check if not already in sheetImages at this coordinate
          if (!sheetImages.some(img => img.row === rowNum && img.col === colNum)) {
            sheetImages.push({
              sheetName: sheet.name,
              row: rowNum,
              col: colNum,
              dataUrl: imgUrl,
            });
          }
          matchedCount++;
        }
      }
    }

    if (sheetImages.length > 0) {
      // Sort images by row ascending
      sheetImages.sort((a, b) => a.row - b.row);
      result.set(sheet.name, sheetImages);
    }
  }

  // 5. Fallback: If no anchored images found at all, but xl/media has images
  if (result.size === 0) {
    const looseMediaPaths: string[] = [];
    zip.forEach((relativePath) => {
      if (relativePath.startsWith('xl/media/') && !relativePath.endsWith('/')) {
        looseMediaPaths.push(relativePath);
      }
    });

    if (looseMediaPaths.length > 0) {
      // Sort loose media files by name/number (e.g. image1, image2, image3...)
      looseMediaPaths.sort((a, b) => {
        const numA = parseInt((a.match(/\d+/) || ['0'])[0], 10);
        const numB = parseInt((b.match(/\d+/) || ['0'])[0], 10);
        return numA - numB;
      });

      const fallbackImages: ExtractedExcelImage[] = [];
      for (let i = 0; i < looseMediaPaths.length; i++) {
        const path = looseMediaPaths[i];
        const dataUrl = await getCachedMediaDataUrl(path);
        if (dataUrl) {
          fallbackImages.push({
            sheetName: sheetList[0]?.name || 'default',
            row: i + 1, // Assume row 1, 2, 3... (after header)
            col: 0,
            dataUrl,
          });
        }
      }

      if (fallbackImages.length > 0) {
        const primarySheet = sheetList.find(s => s.name.includes('獎'))?.name || sheetList[0]?.name || 'default';
        result.set(primarySheet, fallbackImages);
      }
    }
  }

  return result;
}

/**
 * Finds the best matching extracted image for a specific prize row in an Excel sheet.
 * Tries:
 * 1. Exact match (row and prizeImageCol)
 * 2. Exact row match (any column in that row)
 * 3. Range / span match (image spanning across row)
 * 4. Proximity match (near the row within ±1 row boundary)
 */
export function findMatchingImageForPrize(
  sheetImages: ExtractedExcelImage[] | undefined,
  rowIndex: number,
  imageColIndex: number
): string | undefined {
  if (!sheetImages || sheetImages.length === 0) return undefined;

  // 1. Exact match: row === rowIndex and col === imageColIndex
  if (imageColIndex !== -1) {
    const exact = sheetImages.find(img => img.row === rowIndex && img.col === imageColIndex);
    if (exact) return exact.dataUrl;
  }

  // 2. Row match: row === rowIndex (image is anywhere on this row)
  const rowMatch = sheetImages.find(img => img.row === rowIndex);
  if (rowMatch) return rowMatch.dataUrl;

  // 3. Span match: fromRow <= rowIndex and toRow >= rowIndex
  const spanMatch = sheetImages.find(img => 
    img.row <= rowIndex && 
    img.toRow !== undefined && 
    img.toRow >= rowIndex
  );
  if (spanMatch) return spanMatch.dataUrl;

  // 4. Proximity match: within 1 row if user placed floating picture slightly above or below
  if (imageColIndex !== -1) {
    const near = sheetImages.find(img => 
      Math.abs(img.row - rowIndex) <= 1 && 
      Math.abs(img.col - imageColIndex) <= 1
    );
    if (near) return near.dataUrl;
  }

  return undefined;
}
