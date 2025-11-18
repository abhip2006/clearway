// lib/ai/ocr.ts
// Task AI-001: Azure Document Intelligence OCR Pipeline

import {
  DocumentAnalysisClient,
  AzureKeyCredential,
} from '@azure/ai-form-recognizer';

const client = new DocumentAnalysisClient(
  process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT!,
  new AzureKeyCredential(process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY!)
);

/**
 * Extract text from PDF using Azure Document Intelligence
 *
 * @param pdfUrl - URL to the PDF document
 * @returns Extracted text with tables included
 * @throws Error if OCR extraction fails
 */
export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    // Download PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();

    // Analyze with Azure DI (prebuilt-layout model)
    const poller = await client.beginAnalyzeDocument(
      'prebuilt-layout',
      Buffer.from(buffer),
      {
        locale: 'en-US',
      }
    );

    const result = await poller.pollUntilDone();

    // Extract text in reading order
    let fullText = '';

    if (result.pages) {
      for (const page of result.pages) {
        if (page.lines) {
          for (const line of page.lines) {
            fullText += line.content + '\n';
          }
        }
      }
    }

    // Also extract tables (capital calls often have tables)
    if (result.tables) {
      fullText += '\n\n--- TABLES ---\n';
      for (const table of result.tables) {
        fullText += `Table with ${table.rowCount} rows and ${table.columnCount} columns:\n`;
        if (table.cells) {
          for (const cell of table.cells) {
            fullText += `  [Row ${cell.rowIndex}, Col ${cell.columnIndex}]: ${cell.content}\n`;
          }
        }
      }
    }

    return fullText;
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw new Error(`OCR failed: ${(error as Error).message}`);
  }
}
