'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CapitalCallSchema, type CapitalCall } from '@/lib/schemas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface ConfidenceScores {
  fundName: number;
  amountDue: number;
  dueDate: number;
  overall?: number;
}

interface ExtractionFormProps {
  documentId: string;
  initialData: Partial<CapitalCall> & { confidence?: ConfidenceScores };
  onApprove: (data: CapitalCall) => Promise<void>;
  onReject: () => Promise<void>;
}

export function ExtractionForm({
  documentId,
  initialData,
  onApprove,
  onReject,
}: ExtractionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CapitalCall>({
    resolver: zodResolver(CapitalCallSchema),
    defaultValues: {
      ...initialData,
      dueDate: initialData.dueDate
        ? typeof initialData.dueDate === 'string'
          ? initialData.dueDate
          : initialData.dueDate.toISOString().split('T')[0]
        : '',
    },
  });

  const confidenceColor = (score: number) => {
    if (score > 0.9) return 'success';
    if (score > 0.7) return 'warning';
    return 'error';
  };

  const onSubmit = async (data: CapitalCall) => {
    setIsSubmitting(true);
    try {
      await onApprove(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onReject();
    } finally {
      setIsSubmitting(false);
    }
  };

  const confidence = initialData.confidence || {
    fundName: 0.5,
    amountDue: 0.5,
    dueDate: 0.5,
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Fund Name */}
      <div>
        <Label htmlFor="fundName" className="flex items-center gap-2">
          Fund Name
          <Badge variant={confidenceColor(confidence.fundName)}>
            {(confidence.fundName * 100).toFixed(0)}% confident
          </Badge>
        </Label>
        <Input
          id="fundName"
          {...register('fundName')}
          aria-invalid={errors.fundName ? 'true' : 'false'}
          aria-describedby={errors.fundName ? 'fundName-error' : undefined}
        />
        {errors.fundName && (
          <p
            id="fundName-error"
            className="text-sm text-destructive mt-1"
            role="alert"
          >
            {errors.fundName.message}
          </p>
        )}
      </div>

      {/* Amount Due */}
      <div>
        <Label htmlFor="amountDue" className="flex items-center gap-2">
          Amount Due (USD)
          <Badge variant={confidenceColor(confidence.amountDue)}>
            {(confidence.amountDue * 100).toFixed(0)}% confident
          </Badge>
        </Label>
        <Input
          id="amountDue"
          type="number"
          step="0.01"
          {...register('amountDue', { valueAsNumber: true })}
          aria-invalid={errors.amountDue ? 'true' : 'false'}
          aria-describedby={errors.amountDue ? 'amountDue-error' : undefined}
        />
        {errors.amountDue && (
          <p
            id="amountDue-error"
            className="text-sm text-destructive mt-1"
            role="alert"
          >
            {errors.amountDue.message}
          </p>
        )}
      </div>

      {/* Due Date */}
      <div>
        <Label htmlFor="dueDate" className="flex items-center gap-2">
          Due Date
          <Badge variant={confidenceColor(confidence.dueDate)}>
            {(confidence.dueDate * 100).toFixed(0)}% confident
          </Badge>
        </Label>
        <Input
          id="dueDate"
          type="date"
          {...register('dueDate')}
          aria-invalid={errors.dueDate ? 'true' : 'false'}
          aria-describedby={errors.dueDate ? 'dueDate-error' : undefined}
        />
        {errors.dueDate && (
          <p
            id="dueDate-error"
            className="text-sm text-destructive mt-1"
            role="alert"
          >
            {errors.dueDate.message}
          </p>
        )}
      </div>

      {/* Wire Instructions Section */}
      <div className="border-t pt-4 mt-4">
        <h3 className="font-semibold mb-4">Wire Instructions</h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="bankName">Bank Name</Label>
            <Input id="bankName" {...register('bankName')} />
          </div>

          <div>
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input id="accountNumber" {...register('accountNumber')} />
          </div>

          <div>
            <Label htmlFor="routingNumber">Routing Number</Label>
            <Input id="routingNumber" {...register('routingNumber')} />
          </div>

          <div>
            <Label htmlFor="wireReference">Wire Reference</Label>
            <Input id="wireReference" {...register('wireReference')} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting ? 'Approving...' : 'Approve'}
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="flex-1"
          onClick={handleReject}
          disabled={isSubmitting}
        >
          Reject
        </Button>
      </div>
    </form>
  );
}
