import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { generateMockCapitalCall } from '@/tests/utils/test-helpers';

/**
 * Unit tests for ExtractionForm component
 *
 * Tests cover:
 * - Pre-filled data display
 * - Confidence score indicators
 * - Form validation
 * - Approve/reject functionality
 * - Field editing
 *
 * Note: This is a template test. Update imports and component path when implementing.
 */

// Mock component (replace with actual component import when available)
const MockExtractionForm = ({
  documentId,
  initialData,
  onApprove,
  onReject,
}: {
  documentId: string;
  initialData: any;
  onApprove: (data: any) => void;
  onReject: () => void;
}) => {
  const [formData, setFormData] = vi.useState(initialData);
  const [errors, setErrors] = vi.useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    // Validation
    if (!formData.fundName) {
      newErrors.fundName = 'Fund name is required';
    }
    if (!formData.amountDue || formData.amountDue <= 0) {
      newErrors.amountDue = 'Amount due must be greater than 0';
    }
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onApprove(formData);
  };

  const getConfidenceBadgeColor = (score: number) => {
    if (score > 0.9) return 'green';
    if (score > 0.7) return 'yellow';
    return 'red';
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>
          Fund Name
          <span
            className={`badge-${getConfidenceBadgeColor(initialData.confidence?.fundName || 0)}`}
          >
            {((initialData.confidence?.fundName || 0) * 100).toFixed(0)}% confident
          </span>
        </label>
        <input
          name="fundName"
          value={formData.fundName}
          onChange={(e) => setFormData({ ...formData, fundName: e.target.value })}
        />
        {errors.fundName && <span role="alert">{errors.fundName}</span>}
      </div>

      <div>
        <label>
          Amount Due
          <span
            className={`badge-${getConfidenceBadgeColor(initialData.confidence?.amountDue || 0)}`}
          >
            {((initialData.confidence?.amountDue || 0) * 100).toFixed(0)}% confident
          </span>
        </label>
        <input
          name="amountDue"
          type="number"
          value={formData.amountDue}
          onChange={(e) => setFormData({ ...formData, amountDue: parseFloat(e.target.value) })}
        />
        {errors.amountDue && <span role="alert">{errors.amountDue}</span>}
      </div>

      <div>
        <label>
          Due Date
          <span
            className={`badge-${getConfidenceBadgeColor(initialData.confidence?.dueDate || 0)}`}
          >
            {((initialData.confidence?.dueDate || 0) * 100).toFixed(0)}% confident
          </span>
        </label>
        <input
          name="dueDate"
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
        />
        {errors.dueDate && <span role="alert">{errors.dueDate}</span>}
      </div>

      <div>
        <button type="submit">Approve</button>
        <button type="button" onClick={onReject}>
          Reject
        </button>
      </div>
    </form>
  );
};

describe('ExtractionForm', () => {
  const mockInitialData = {
    fundName: 'Apollo Fund XI',
    amountDue: 250000,
    dueDate: '2025-12-15',
    confidence: {
      fundName: 0.95,
      amountDue: 0.98,
      dueDate: 0.92,
    },
  };

  const mockOnApprove = vi.fn();
  const mockOnReject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays pre-filled data', () => {
    render(
      <MockExtractionForm
        documentId="doc_123"
        initialData={mockInitialData}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByDisplayValue('Apollo Fund XI')).toBeInTheDocument();
    expect(screen.getByDisplayValue('250000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025-12-15')).toBeInTheDocument();
  });

  it('shows confidence scores with correct badges', () => {
    render(
      <MockExtractionForm
        documentId="doc_123"
        initialData={mockInitialData}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText(/95% confident/i)).toBeInTheDocument();
    expect(screen.getByText(/98% confident/i)).toBeInTheDocument();
    expect(screen.getByText(/92% confident/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <MockExtractionForm
        documentId="doc_123"
        initialData={{
          ...mockInitialData,
          fundName: '',
        }}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const approveButton = screen.getByText(/approve/i);
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText(/fund name is required/i)).toBeInTheDocument();
    });

    expect(mockOnApprove).not.toHaveBeenCalled();
  });

  it('validates amount due is positive', async () => {
    render(
      <MockExtractionForm
        documentId="doc_123"
        initialData={{
          ...mockInitialData,
          amountDue: -100,
        }}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const approveButton = screen.getByText(/approve/i);
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText(/amount due must be greater than 0/i)).toBeInTheDocument();
    });

    expect(mockOnApprove).not.toHaveBeenCalled();
  });

  it('calls onApprove with form data when valid', async () => {
    render(
      <MockExtractionForm
        documentId="doc_123"
        initialData={mockInitialData}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const approveButton = screen.getByText(/approve/i);
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockOnApprove).toHaveBeenCalledWith(
        expect.objectContaining({
          fundName: 'Apollo Fund XI',
          amountDue: 250000,
          dueDate: '2025-12-15',
        })
      );
    });
  });

  it('calls onReject when reject button clicked', () => {
    render(
      <MockExtractionForm
        documentId="doc_123"
        initialData={mockInitialData}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const rejectButton = screen.getByText(/reject/i);
    fireEvent.click(rejectButton);

    expect(mockOnReject).toHaveBeenCalled();
  });

  it('allows editing of fields', async () => {
    render(
      <MockExtractionForm
        documentId="doc_123"
        initialData={mockInitialData}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const fundNameInput = screen.getByDisplayValue('Apollo Fund XI') as HTMLInputElement;
    fireEvent.change(fundNameInput, { target: { value: 'Blackstone Fund XII' } });

    expect(fundNameInput.value).toBe('Blackstone Fund XII');

    const approveButton = screen.getByText(/approve/i);
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockOnApprove).toHaveBeenCalledWith(
        expect.objectContaining({
          fundName: 'Blackstone Fund XII',
        })
      );
    });
  });

  it('shows green badge for high confidence', () => {
    render(
      <MockExtractionForm
        documentId="doc_123"
        initialData={{
          ...mockInitialData,
          confidence: {
            fundName: 0.95,
            amountDue: 0.98,
            dueDate: 0.92,
          },
        }}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const badges = screen.getAllByText(/confident/i);
    badges.forEach((badge) => {
      expect(badge.className).toContain('green');
    });
  });

  it('shows yellow badge for medium confidence', () => {
    render(
      <MockExtractionForm
        documentId="doc_123"
        initialData={{
          ...mockInitialData,
          confidence: {
            fundName: 0.75,
            amountDue: 0.80,
            dueDate: 0.85,
          },
        }}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const badges = screen.getAllByText(/confident/i);
    badges.forEach((badge) => {
      expect(badge.className).toContain('yellow');
    });
  });

  it('shows red badge for low confidence', () => {
    render(
      <MockExtractionForm
        documentId="doc_123"
        initialData={{
          ...mockInitialData,
          confidence: {
            fundName: 0.65,
            amountDue: 0.60,
            dueDate: 0.55,
          },
        }}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const badges = screen.getAllByText(/confident/i);
    badges.forEach((badge) => {
      expect(badge.className).toContain('red');
    });
  });
});
