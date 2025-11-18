# Test Fixtures

This directory contains sample files for E2E testing.

## Required Files

### PDF Documents

Place sample capital call PDFs here for testing:

- `sample-capital-call.pdf` - Valid capital call document
- `large-document.pdf` - Document > 10MB (for size limit testing)
- `invalid-document.txt` - Non-PDF file (for type validation testing)
- `scanned-document.pdf` - Scanned/image-based PDF (for OCR testing)

## Creating Test Documents

### Sample Capital Call PDF

Create a sample capital call PDF with the following information:

```
CAPITAL CALL NOTICE

Fund Name: Apollo Fund XII
Investor: John Smith
Account Number: ACC-123456
Email: john.smith@example.com

Amount Due: $250,000.00
Due Date: December 31, 2025

Wire Instructions:
Bank Name: JP Morgan Chase Bank
Account Number: 9876543210
Routing Number: 021000021
Wire Reference: APOLLO-XII-CC-2025-Q4
```

### How to Generate Test PDFs

You can use various tools to create test PDFs:

1. **Online PDF generators**:
   - https://www.sejda.com/html-to-pdf
   - https://pdfcrowd.com/

2. **Command line** (macOS/Linux):
   ```bash
   # Convert text to PDF using enscript and ps2pdf
   enscript -B -o - sample.txt | ps2pdf - sample.pdf
   ```

3. **Microsoft Word/Google Docs**:
   - Create document with capital call information
   - Export/Save as PDF

## Ground Truth Data

For AI accuracy testing, document the expected values in:
`tests/accuracy/ground-truth.json`

Example format:
```json
[
  {
    "documentId": "doc_test_001",
    "fileName": "sample-capital-call.pdf",
    "expected": {
      "fundName": "Apollo Fund XII",
      "amountDue": 250000,
      "dueDate": "2025-12-31",
      "investorEmail": "john.smith@example.com",
      "investorAccount": "ACC-123456",
      "bankName": "JP Morgan Chase Bank",
      "accountNumber": "9876543210",
      "routingNumber": "021000021",
      "wireReference": "APOLLO-XII-CC-2025-Q4"
    }
  }
]
```

## Security Note

**Do not commit real documents with sensitive information!**

All test documents should use:
- Fake names
- Fake account numbers
- Fake amounts
- Test email addresses

## Additional Test Cases

Consider adding documents for edge cases:

1. **Different fund families**:
   - Blackstone Fund XIV
   - KKR Global Infrastructure Fund III
   - Carlyle Partners VIII

2. **Various formats**:
   - Single-page capital calls
   - Multi-page with wire instructions on page 2
   - Documents with logos and headers
   - Scanned documents (image-based PDFs)

3. **Edge cases**:
   - Non-standard date formats
   - Multiple currencies (EUR, GBP)
   - Missing optional fields
   - Partially obscured text

## File Naming Convention

Use descriptive names that indicate the test purpose:

- `valid-apollo-fund-xi.pdf` - Standard valid document
- `missing-wire-instructions.pdf` - Document without wire details
- `scanned-low-quality.pdf` - Low quality scan
- `multi-page-complex.pdf` - Complex multi-page document
- `wrong-type.docx` - Invalid file type for testing

## Usage in Tests

```typescript
// E2E test
await fileInput.setInputFiles('./tests/e2e/fixtures/sample-capital-call.pdf');

// AI accuracy test
const groundTruth = require('../accuracy/ground-truth.json');
```
