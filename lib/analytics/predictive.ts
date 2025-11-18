// Task AN-003: Predictive Analytics Engine
// Analytics & Reporting Agent - Week 11-12

import * as tf from '@tensorflow/tfjs';
import { db } from '@/lib/db';

interface TrainingData {
  dueDate: Date;
  amountDue: number;
  fundName: string;
  paidAt: Date | null;
  status: string;
}

export class PaymentPredictionEngine {
  private model: tf.LayersModel | null = null;
  private fundEncoder: Map<string, number> = new Map();

  async train(historicalData: TrainingData[]) {
    // Prepare training data
    const features: number[][] = [];
    const labels: number[] = [];

    // Build fund encoder
    const uniqueFunds = [...new Set(historicalData.map(d => d.fundName))];
    uniqueFunds.forEach((fund, idx) => {
      this.fundEncoder.set(fund, idx);
    });

    for (const record of historicalData) {
      if (record.paidAt && record.status === 'PAID') {
        // Features: day of week, day of month, month, amount (log scale), fund (encoded)
        const dueDate = new Date(record.dueDate);
        features.push([
          dueDate.getDay(),
          dueDate.getDate(),
          dueDate.getMonth(),
          Math.log(record.amountDue + 1), // Log scale + 1 to avoid log(0)
          this.encodeFund(record.fundName),
        ]);

        // Label: days from due date to payment (negative = early, positive = late)
        const daysToPayment = Math.floor(
          (new Date(record.paidAt).getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)
        );
        labels.push(daysToPayment);
      }
    }

    if (features.length < 10) {
      throw new Error('Insufficient training data. Need at least 10 paid capital calls.');
    }

    // Normalize features
    const featureTensor = tf.tensor2d(features);
    const { normalizedFeatures, mean, std } = this.normalizeData(featureTensor);

    // Create labels tensor
    const labelsTensor = tf.tensor2d(labels, [labels.length, 1]);

    // Build model
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [5], units: 16, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1 }),
      ],
    });

    // Compile
    this.model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });

    // Train
    await this.model.fit(normalizedFeatures, labelsTensor, {
      epochs: 100,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}, mae = ${logs?.mae?.toFixed(4)}`);
          }
        },
      },
    });

    // Clean up tensors
    featureTensor.dispose();
    normalizedFeatures.dispose();
    labelsTensor.dispose();

    // Save model (in-memory for now, can be persisted to filesystem or IndexedDB)
    // await this.model.save('file://./models/payment-prediction');
  }

  async predictPaymentDate(capitalCall: {
    dueDate: Date;
    amountDue: number;
    fundName: string;
  }): Promise<{
    predictedDate: Date;
    confidence: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    if (!this.model) {
      throw new Error('Model not trained. Call train() first.');
    }

    // Prepare features
    const dueDate = new Date(capitalCall.dueDate);
    const features = tf.tensor2d([[
      dueDate.getDay(),
      dueDate.getDate(),
      dueDate.getMonth(),
      Math.log(capitalCall.amountDue + 1),
      this.encodeFund(capitalCall.fundName),
    ]]);

    // Predict days to payment
    const prediction = this.model.predict(features) as tf.Tensor;
    const daysToPayment = (await prediction.data())[0];

    // Clean up
    features.dispose();
    prediction.dispose();

    // Calculate predicted date
    const predictedDate = new Date(
      dueDate.getTime() + daysToPayment * 24 * 60 * 60 * 1000
    );

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    if (daysToPayment <= 0) {
      riskLevel = 'LOW'; // Paid early
    } else if (daysToPayment <= 7) {
      riskLevel = 'MEDIUM'; // Paid within a week after due
    } else {
      riskLevel = 'HIGH'; // Paid more than a week late
    }

    // Confidence based on model variance (simplified)
    // In production, use prediction intervals or ensemble methods
    const confidence = Math.max(0, 1 - Math.min(Math.abs(daysToPayment) / 30, 1));

    return {
      predictedDate,
      confidence,
      riskLevel,
    };
  }

  private normalizeData(data: tf.Tensor2D): {
    normalizedFeatures: tf.Tensor2D;
    mean: tf.Tensor1D;
    std: tf.Tensor1D;
  } {
    const mean = data.mean(0) as tf.Tensor1D;
    const std = data.sub(mean).square().mean(0).sqrt() as tf.Tensor1D;
    const normalizedFeatures = data.sub(mean).div(std.add(1e-7)) as tf.Tensor2D;

    return { normalizedFeatures, mean, std };
  }

  private encodeFund(fundName: string): number {
    // Simple hash-based encoding
    if (this.fundEncoder.has(fundName)) {
      return this.fundEncoder.get(fundName)!;
    }

    // For new funds not seen during training, use hash
    let hash = 0;
    for (let i = 0; i < fundName.length; i++) {
      hash = (hash << 5) - hash + fundName.charCodeAt(i);
    }
    return Math.abs(hash % 100);
  }

  async saveModel(path: string) {
    if (!this.model) {
      throw new Error('No model to save');
    }
    await this.model.save(path);
  }

  async loadModel(path: string) {
    this.model = await tf.loadLayersModel(path);
  }
}

// Cashflow forecasting service
export class CashflowForecastService {
  async forecastNextQuarter(userId: string): Promise<{
    months: Array<{
      month: string;
      expectedInflows: number;
      expectedOutflows: number;
      netCashflow: number;
      confidence: number;
    }>;
  }> {
    // Get historical data (last year)
    const historical = await db.capitalCall.findMany({
      where: {
        userId,
        dueDate: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Analyze seasonal patterns
    const monthlyAverages = this.calculateMonthlyAverages(historical);
    const monthlyVariances = this.calculateMonthlyVariances(historical, monthlyAverages);

    // Forecast next 3 months
    const forecast = [];
    for (let i = 0; i < 3; i++) {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + i + 1);
      const month = futureDate.getMonth();

      const expectedInflows = monthlyAverages[month] || 0;
      const variance = monthlyVariances[month] || 0;

      forecast.push({
        month: futureDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        expectedInflows,
        expectedOutflows: 0, // Would calculate distributions from fund level
        netCashflow: expectedInflows,
        confidence: this.calculateConfidence(historical, month, variance),
      });
    }

    return { months: forecast };
  }

  private calculateMonthlyAverages(data: any[]): Record<number, number> {
    const monthlyTotals: Record<number, number[]> = {};

    for (const call of data) {
      const month = new Date(call.dueDate).getMonth();
      if (!monthlyTotals[month]) {
        monthlyTotals[month] = [];
      }
      monthlyTotals[month].push(call.amountDue.toNumber());
    }

    const averages: Record<number, number> = {};
    for (const month in monthlyTotals) {
      const amounts = monthlyTotals[month];
      averages[month] = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    }

    return averages;
  }

  private calculateMonthlyVariances(
    data: any[],
    averages: Record<number, number>
  ): Record<number, number> {
    const monthlySquaredDiffs: Record<number, number[]> = {};

    for (const call of data) {
      const month = new Date(call.dueDate).getMonth();
      const avg = averages[month] || 0;
      const diff = call.amountDue.toNumber() - avg;

      if (!monthlySquaredDiffs[month]) {
        monthlySquaredDiffs[month] = [];
      }
      monthlySquaredDiffs[month].push(diff * diff);
    }

    const variances: Record<number, number> = {};
    for (const month in monthlySquaredDiffs) {
      const diffs = monthlySquaredDiffs[month];
      variances[month] = Math.sqrt(diffs.reduce((a, b) => a + b, 0) / diffs.length);
    }

    return variances;
  }

  private calculateConfidence(data: any[], month: number, variance: number): number {
    const monthData = data.filter(d => new Date(d.dueDate).getMonth() === month);

    // Confidence based on:
    // 1. Amount of historical data (more data = higher confidence)
    // 2. Low variance (consistent amounts = higher confidence)
    const dataConfidence = Math.min(monthData.length / 10, 1);
    const varianceConfidence = variance > 0 ? Math.max(0, 1 - Math.min(variance / 1000000, 1)) : 0.5;

    return (dataConfidence + varianceConfidence) / 2;
  }

  async detectSeasonalPatterns(userId: string): Promise<{
    patterns: Array<{
      month: string;
      avgAmount: number;
      callCount: number;
      peakActivity: boolean;
    }>;
  }> {
    const historical = await db.capitalCall.findMany({
      where: {
        userId,
        dueDate: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const monthlyStats: Record<number, { total: number; count: number }> = {};

    for (const call of historical) {
      const month = new Date(call.dueDate).getMonth();
      if (!monthlyStats[month]) {
        monthlyStats[month] = { total: 0, count: 0 };
      }
      monthlyStats[month].total += call.amountDue.toNumber();
      monthlyStats[month].count += 1;
    }

    // Calculate average across all months
    const allCounts = Object.values(monthlyStats).map(s => s.count);
    const avgCount = allCounts.reduce((a, b) => a + b, 0) / allCounts.length;

    const patterns = [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (let month = 0; month < 12; month++) {
      const stats = monthlyStats[month] || { total: 0, count: 0 };
      patterns.push({
        month: monthNames[month],
        avgAmount: stats.count > 0 ? stats.total / stats.count : 0,
        callCount: stats.count,
        peakActivity: stats.count > avgCount * 1.5, // 50% above average
      });
    }

    return { patterns };
  }
}
