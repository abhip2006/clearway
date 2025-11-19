/**
 * Advanced AI Phase 3 - Investor AI Dashboard
 *
 * Features:
 * - Payment predictions (date and amount)
 * - Portfolio risk assessment
 * - Sentiment analysis of communications
 * - Portfolio optimization recommendations
 * - Natural language query interface
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  LinearProgress,
  TextField,
  Alert,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  CalendarToday,
  Shield,
  Psychology,
  Analytics,
  QuestionAnswer,
  CheckCircle,
  Warning
} from '@mui/icons-material';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

interface PaymentPrediction {
  prediction_id: string;
  predicted_payment_date: string;
  predicted_days: number;
  confidence_score: number;
  probabilities: {
    on_time: number;
    early: number;
    late_1_7_days: number;
    late_8_14_days: number;
    late_15plus_days: number;
  };
  top_factors: Array<{
    factor: string;
    impact: number;
    direction?: string;
  }>;
}

interface RiskAssessment {
  prediction_id: string;
  risk_probability: number;
  risk_tier: string;
  risk_score: number;
  risk_trend: {
    previous_score: number;
    trend: string;
    magnitude: number;
  };
  top_risk_factors: Array<{
    factor: string;
    weight: number;
  }>;
  estimated_loss_exposure: {
    amount: number;
    percentage_of_portfolio: number;
  };
  recommended_actions: string[];
}

interface PortfolioRecommendation {
  recommendation_id: string;
  recommendation_type: string;
  reason: string;
  current_allocation: Record<string, number>;
  recommended_allocation: Record<string, number>;
  impact_analysis: {
    expected_return_improvement: number;
    expected_risk_reduction: number;
    diversification_improvement: number;
  };
  costs: {
    transaction_cost: number;
    tax_impact: number;
    total_cost: number;
  };
  probability_of_success: number;
}

const InvestorAIDashboard: React.FC = () => {
  const [paymentPrediction, setPaymentPrediction] = useState<PaymentPrediction | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [recommendations, setRecommendations] = useState<PortfolioRecommendation[]>([]);
  const [nlpQuery, setNlpQuery] = useState('');
  const [nlpResult, setNlpResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAIInsights();
  }, []);

  const fetchAIInsights = async () => {
    setLoading(true);
    try {
      // Fetch payment prediction
      const paymentRes = await fetch('/api/v1/ai/predictions/payment-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investor_id: 'INV001',
          include_factors: true
        })
      });
      const paymentData = await paymentRes.json();
      setPaymentPrediction(paymentData);

      // Fetch risk assessment
      const riskRes = await fetch('/api/v1/ai/predictions/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investor_id: 'INV001',
          risk_type: 'DEFAULT_RISK',
          include_trend: true
        })
      });
      const riskData = await riskRes.json();
      setRiskAssessment(riskData);

      // Fetch portfolio recommendations
      const recsRes = await fetch('/api/v1/ai/recommendations/portfolio-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investor_id: 'INV001',
          recommendation_count: 3
        })
      });
      const recsData = await recsRes.json();
      setRecommendations(recsData.recommendations || []);

    } catch (error) {
      console.error('Error fetching AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNLPQuery = async () => {
    if (!nlpQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/v1/ai/nlp/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: nlpQuery,
          context: {
            user_id: 'USER001',
            investor_id: 'INV001',
            data_access_level: 'investor'
          },
          include_explanation: true
        })
      });
      const data = await response.json();
      setNlpResult(data);
    } catch (error) {
      console.error('Error processing NLP query:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (tier: string) => {
    const colors: Record<string, string> = {
      'TIER_1': '#4caf50',
      'TIER_2': '#2196f3',
      'TIER_3': '#ff9800',
      'TIER_4': '#ff5722',
      'TIER_5': '#f44336'
    };
    return colors[tier] || '#9e9e9e';
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'IMPROVING' ? <TrendingUp color="success" /> :
           trend === 'DETERIORATING' ? <TrendingDown color="error" /> :
           <TrendingUp style={{ color: '#9e9e9e' }} />;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <Psychology sx={{ mr: 1, verticalAlign: 'middle' }} />
        AI-Powered Insights Dashboard
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Natural Language Query Interface */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <QuestionAnswer sx={{ mr: 1, verticalAlign: 'middle' }} />
            Ask AI Anything
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="e.g., 'When will my next payment arrive?' or 'Show me my portfolio risk'"
              value={nlpQuery}
              onChange={(e) => setNlpQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleNLPQuery()}
            />
            <Button variant="contained" onClick={handleNLPQuery} disabled={!nlpQuery.trim()}>
              Ask
            </Button>
          </Box>
          {nlpResult && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="subtitle2"><strong>Summary:</strong></Typography>
              <Typography variant="body2">{nlpResult.summary}</Typography>
              {nlpResult.insights && nlpResult.insights.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 1 }}><strong>Insights:</strong></Typography>
                  <ul>
                    {nlpResult.insights.map((insight: string, idx: number) => (
                      <li key={idx}><Typography variant="body2">{insight}</Typography></li>
                    ))}
                  </ul>
                </>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Payment Predictions */}
        {paymentPrediction && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Next Payment Prediction
                </Typography>
                <Box sx={{ textAlign: 'center', my: 2 }}>
                  <Typography variant="h3" color="primary">
                    {new Date(paymentPrediction.predicted_payment_date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    In {paymentPrediction.predicted_days} days
                  </Typography>
                  <Chip
                    label={`${(paymentPrediction.confidence_score * 100).toFixed(0)}% Confidence`}
                    color="primary"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>Probability Distribution</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { name: 'Early', value: paymentPrediction.probabilities.early * 100 },
                    { name: 'On Time', value: paymentPrediction.probabilities.on_time * 100 },
                    { name: 'Late 1-7d', value: paymentPrediction.probabilities.late_1_7_days * 100 },
                    { name: 'Late 8-14d', value: paymentPrediction.probabilities.late_8_14_days * 100 },
                    { name: 'Late 15+d', value: paymentPrediction.probabilities.late_15plus_days * 100 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#2196f3" />
                  </BarChart>
                </ResponsiveContainer>

                <Typography variant="subtitle2" sx={{ mt: 2 }}>Top Prediction Factors</Typography>
                <List dense>
                  {paymentPrediction.top_factors.map((factor, idx) => (
                    <ListItem key={idx}>
                      <ListItemText
                        primary={factor.factor.replace(/_/g, ' ').toUpperCase()}
                        secondary={`Impact: ${(factor.impact * 100).toFixed(0)}%`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Risk Assessment */}
        {riskAssessment && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Shield sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Risk Assessment
                </Typography>
                <Box sx={{ textAlign: 'center', my: 2 }}>
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      bgcolor: getRiskColor(riskAssessment.risk_tier),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      mb: 2
                    }}
                  >
                    <Typography variant="h3" color="white">
                      {riskAssessment.risk_score}
                    </Typography>
                  </Box>
                  <Chip
                    label={riskAssessment.risk_tier.replace('TIER_', 'Tier ')}
                    sx={{ bgcolor: getRiskColor(riskAssessment.risk_tier), color: 'white' }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                    {getTrendIcon(riskAssessment.risk_trend.trend)}
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {riskAssessment.risk_trend.trend}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>Top Risk Factors</Typography>
                <List dense>
                  {riskAssessment.top_risk_factors.map((factor, idx) => (
                    <ListItem key={idx}>
                      <ListItemText
                        primary={factor.factor.replace(/_/g, ' ').toUpperCase()}
                        secondary={
                          <LinearProgress
                            variant="determinate"
                            value={factor.weight * 100}
                            sx={{ mt: 0.5 }}
                          />
                        }
                      />
                    </ListItem>
                  ))}
                </List>

                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Loss Exposure:</strong> ${riskAssessment.estimated_loss_exposure.amount.toLocaleString()}
                    ({riskAssessment.estimated_loss_exposure.percentage_of_portfolio.toFixed(2)}% of portfolio)
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Portfolio Recommendations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />
                Portfolio Optimization Recommendations
              </Typography>
              <Grid container spacing={2}>
                {recommendations.map((rec, idx) => (
                  <Grid item xs={12} md={4} key={rec.recommendation_id}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Chip
                        label={rec.recommendation_type.replace(/_/g, ' ')}
                        color="primary"
                        size="small"
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="body2" gutterBottom>
                        {rec.reason}
                      </Typography>

                      <Box sx={{ my: 2 }}>
                        <Typography variant="caption" display="block">Expected Impact:</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TrendingUp fontSize="small" color="success" />
                          <Typography variant="body2">
                            Return: +{(rec.impact_analysis.expected_return_improvement * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Shield fontSize="small" color="primary" />
                          <Typography variant="body2">
                            Risk: -{(rec.impact_analysis.expected_risk_reduction * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 1 }} />

                      <Typography variant="caption" display="block" gutterBottom>
                        Transaction Cost: ${rec.costs.transaction_cost.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" display="block" gutterBottom>
                        Success Probability: {(rec.probability_of_success * 100).toFixed(0)}%
                      </Typography>

                      <Button
                        variant="contained"
                        size="small"
                        fullWidth
                        sx={{ mt: 2 }}
                        startIcon={<CheckCircle />}
                      >
                        Accept Recommendation
                      </Button>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InvestorAIDashboard;
