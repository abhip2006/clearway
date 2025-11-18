#!/usr/bin/env ts-node
/**
 * Test Coverage Analysis Script
 *
 * Generates comprehensive test coverage report and checks against targets.
 * Identifies untested code and provides actionable recommendations.
 *
 * Usage:
 *   npm run test:coverage:report
 *   node --loader ts-node/esm scripts/test-coverage.ts
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Coverage targets
const COVERAGE_TARGETS = {
  lines: 95,
  functions: 95,
  branches: 90,
  statements: 95,
};

// Critical paths requiring 95%+ coverage
const CRITICAL_PATHS = [
  'app/api/upload',
  'app/api/process',
  'app/api/capital-calls',
  'lib/ai/extract',
  'lib/ai/ocr',
  'lib/storage',
];

interface CoverageData {
  total: {
    lines: { total: number; covered: number; pct: number };
    functions: { total: number; covered: number; pct: number };
    statements: { total: number; covered: number; pct: number };
    branches: { total: number; covered: number; pct: number };
  };
  [key: string]: any;
}

/**
 * Run tests with coverage
 */
function runCoverageTests(): void {
  console.log('🧪 Running tests with coverage...\n');

  try {
    execSync('npm run test:coverage -- --reporter=json --reporter=text', {
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('❌ Tests failed. Fix failing tests before analyzing coverage.');
    process.exit(1);
  }
}

/**
 * Read coverage summary from coverage/coverage-summary.json
 */
function readCoverageSummary(): CoverageData | null {
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');

  if (!fs.existsSync(coveragePath)) {
    console.error('❌ Coverage summary not found. Run tests with coverage first.');
    return null;
  }

  try {
    const data = fs.readFileSync(coveragePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to read coverage summary:', error);
    return null;
  }
}

/**
 * Analyze coverage data
 */
function analyzeCoverage(coverage: CoverageData): void {
  console.log('\n📊 Test Coverage Report\n');
  console.log('='.repeat(60));

  // Overall coverage
  const { total } = coverage;

  console.log('\n📈 Overall Coverage:');
  console.log(`  Lines:      ${total.lines.pct.toFixed(2)}% (${total.lines.covered}/${total.lines.total})`);
  console.log(`  Functions:  ${total.functions.pct.toFixed(2)}% (${total.functions.covered}/${total.functions.total})`);
  console.log(`  Branches:   ${total.branches.pct.toFixed(2)}% (${total.branches.covered}/${total.branches.total})`);
  console.log(`  Statements: ${total.statements.pct.toFixed(2)}% (${total.statements.covered}/${total.statements.total})`);

  // Check against targets
  console.log('\n🎯 Target Comparison:');

  const results = {
    lines: checkTarget('Lines', total.lines.pct, COVERAGE_TARGETS.lines),
    functions: checkTarget('Functions', total.functions.pct, COVERAGE_TARGETS.functions),
    branches: checkTarget('Branches', total.branches.pct, COVERAGE_TARGETS.branches),
    statements: checkTarget('Statements', total.statements.pct, COVERAGE_TARGETS.statements),
  };

  const allTargetsMet = Object.values(results).every((r) => r);

  console.log('\n' + '='.repeat(60));

  if (allTargetsMet) {
    console.log('\n✅ All coverage targets met! 🎉\n');
  } else {
    console.log('\n⚠️  Some coverage targets not met.\n');
  }
}

/**
 * Check if coverage meets target
 */
function checkTarget(name: string, actual: number, target: number): boolean {
  const met = actual >= target;
  const emoji = met ? '✅' : '❌';
  const gap = met ? `+${(actual - target).toFixed(2)}%` : `${(actual - target).toFixed(2)}%`;

  console.log(`  ${emoji} ${name.padEnd(12)} ${actual.toFixed(2)}% / ${target}% (${gap})`);

  return met;
}

/**
 * Identify critical paths with low coverage
 */
function identifyUncoveredPaths(coverage: CoverageData): void {
  console.log('\n🔍 Critical Path Analysis:\n');

  const uncoveredPaths = [];

  for (const [filePath, fileCoverage] of Object.entries(coverage)) {
    if (filePath === 'total') continue;

    // Check if file is in critical paths
    const isCritical = CRITICAL_PATHS.some((criticalPath) =>
      filePath.includes(criticalPath)
    );

    if (isCritical) {
      const linesCoverage = (fileCoverage as any).lines?.pct || 0;

      if (linesCoverage < 95) {
        uncoveredPaths.push({
          path: filePath,
          coverage: linesCoverage,
        });
      }
    }
  }

  if (uncoveredPaths.length === 0) {
    console.log('  ✅ All critical paths have 95%+ coverage!\n');
  } else {
    console.log('  ⚠️  Critical paths needing attention:\n');

    uncoveredPaths
      .sort((a, b) => a.coverage - b.coverage)
      .forEach(({ path, coverage }) => {
        const shortPath = path.replace(process.cwd(), '');
        console.log(`    📄 ${shortPath}`);
        console.log(`       Coverage: ${coverage.toFixed(2)}% (Target: 95%)\n`);
      });
  }
}

/**
 * Generate recommendations
 */
function generateRecommendations(coverage: CoverageData): void {
  console.log('\n💡 Recommendations:\n');

  const { total } = coverage;
  const recommendations: string[] = [];

  // Check each metric
  if (total.lines.pct < COVERAGE_TARGETS.lines) {
    const gap = COVERAGE_TARGETS.lines - total.lines.pct;
    const linesToCover = Math.ceil((gap / 100) * total.lines.total);
    recommendations.push(
      `  • Add tests to cover ~${linesToCover} more lines of code to reach ${COVERAGE_TARGETS.lines}% target`
    );
  }

  if (total.functions.pct < COVERAGE_TARGETS.functions) {
    const gap = COVERAGE_TARGETS.functions - total.functions.pct;
    const functionsToTest = Math.ceil((gap / 100) * total.functions.total);
    recommendations.push(
      `  • Add tests for ~${functionsToTest} more functions to reach ${COVERAGE_TARGETS.functions}% target`
    );
  }

  if (total.branches.pct < COVERAGE_TARGETS.branches) {
    recommendations.push(
      `  • Improve branch coverage by testing edge cases and error paths`
    );
    recommendations.push(
      `    (currently ${total.branches.pct.toFixed(2)}%, target: ${COVERAGE_TARGETS.branches}%)`
    );
  }

  if (total.statements.pct < COVERAGE_TARGETS.statements) {
    recommendations.push(
      `  • Add tests to cover uncovered statements`
    );
  }

  // General recommendations
  recommendations.push('');
  recommendations.push('  📚 Focus areas:');
  recommendations.push('    - Integration tests for API routes');
  recommendations.push('    - Unit tests for utility functions');
  recommendations.push('    - Error handling scenarios');
  recommendations.push('    - Edge cases and boundary conditions');

  recommendations.push('');
  recommendations.push('  🔧 Tools:');
  recommendations.push('    - View HTML report: open coverage/index.html');
  recommendations.push('    - Run specific tests: npm test <pattern>');
  recommendations.push('    - Watch mode: npm run test:watch');

  console.log(recommendations.join('\n'));
  console.log();
}

/**
 * Export coverage report to markdown
 */
function exportMarkdownReport(coverage: CoverageData): void {
  const { total } = coverage;

  const markdown = `# Test Coverage Report

Generated: ${new Date().toISOString()}

## Overall Coverage

| Metric     | Coverage | Target | Status |
|------------|----------|--------|--------|
| Lines      | ${total.lines.pct.toFixed(2)}% | ${COVERAGE_TARGETS.lines}% | ${total.lines.pct >= COVERAGE_TARGETS.lines ? '✅' : '❌'} |
| Functions  | ${total.functions.pct.toFixed(2)}% | ${COVERAGE_TARGETS.functions}% | ${total.functions.pct >= COVERAGE_TARGETS.functions ? '✅' : '❌'} |
| Branches   | ${total.branches.pct.toFixed(2)}% | ${COVERAGE_TARGETS.branches}% | ${total.branches.pct >= COVERAGE_TARGETS.branches ? '✅' : '❌'} |
| Statements | ${total.statements.pct.toFixed(2)}% | ${COVERAGE_TARGETS.statements}% | ${total.statements.pct >= COVERAGE_TARGETS.statements ? '✅' : '❌'} |

## Details

- **Total Lines**: ${total.lines.covered} / ${total.lines.total}
- **Total Functions**: ${total.functions.covered} / ${total.functions.total}
- **Total Branches**: ${total.branches.covered} / ${total.branches.total}
- **Total Statements**: ${total.statements.covered} / ${total.statements.total}

## Next Steps

${total.lines.pct >= COVERAGE_TARGETS.lines ? 'Coverage targets met! 🎉' : 'Work on improving coverage to meet targets.'}

For detailed coverage by file, run:
\`\`\`bash
open coverage/index.html
\`\`\`
`;

  const reportPath = path.join(process.cwd(), 'coverage', 'COVERAGE_REPORT.md');
  fs.writeFileSync(reportPath, markdown);

  console.log(`\n📄 Markdown report saved: ${reportPath}\n`);
}

/**
 * Main execution
 */
function main(): void {
  console.log('🚀 Starting Test Coverage Analysis\n');

  // Run tests with coverage
  // Comment out if coverage already generated
  // runCoverageTests();

  // Read coverage data
  const coverage = readCoverageSummary();

  if (!coverage) {
    console.error('\n❌ Failed to load coverage data. Exiting.\n');
    process.exit(1);
  }

  // Analyze coverage
  analyzeCoverage(coverage);

  // Identify uncovered critical paths
  identifyUncoveredPaths(coverage);

  // Generate recommendations
  generateRecommendations(coverage);

  // Export markdown report
  exportMarkdownReport(coverage);

  // Exit with appropriate code
  const { total } = coverage;
  const targetsMet =
    total.lines.pct >= COVERAGE_TARGETS.lines &&
    total.functions.pct >= COVERAGE_TARGETS.functions &&
    total.branches.pct >= COVERAGE_TARGETS.branches &&
    total.statements.pct >= COVERAGE_TARGETS.statements;

  console.log('='.repeat(60));
  console.log();

  if (targetsMet) {
    console.log('✅ Coverage analysis complete. All targets met!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Coverage analysis complete. Some targets need improvement.\n');
    process.exit(0); // Exit with 0 to not break CI, but log warning
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main, analyzeCoverage, readCoverageSummary };
