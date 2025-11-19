/**
 * Advanced AI Phase 3 - Fund Manager AI Dashboard
 *
 * Features:
 * - Payment prediction accuracy tracking
 * - Risk landscape (investor default risks, fund performance risk)
 * - Investor sentiment overview
 * - Document routing status
 * - Model performance metrics
 * - Anomaly detection alerts
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
  Button
} from '@mui/material';
import {
  Dashboard,
  Assessment,
  Psychology,
  TrendingUp,
  Warning,
  CheckCircle,
  ErrorOutline,
  SentimentSatisfied,
  SentimentNeutral,
  SentimentDissatisfied
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const FundManagerAIDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [highRiskInvestors, setHighRiskInvestors] = useState<any[]>([]);
  const [sentimentTrends, setSentimentTrends] = useState<any>(null);
  const [documentStats, setDocumentStats] = useState<any>(null);
  const [predictionMetrics, setPredictionMetrics] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch high-risk investors
      const riskRes = await fetch('/api/v1/ai/sentiment/high-risk-investors?churn_risk_threshold=50');
      const riskData = await riskRes.json();
      setHighRiskInvestors(riskData.high_risk_investors || []);

      // Fetch sentiment trends
      const sentimentRes = await fetch('/api/v1/ai/sentiment/sentiment-trends?days=90');
      const sentimentData = await sentimentRes.json();
      setSentimentTrends(sentimentData);

      // Fetch document routing stats
      const docRes = await fetch('/api/v1/ai/documents/routing-statistics?time_window_days=30');
      const docData = await docRes.json();
      setDocumentStats(docData);

      // Simulated prediction metrics
      setPredictionMetrics({
        payment_date: {
          mae: 2.8,
          rmse: 4.5,
          accuracy_within_3_days: 0.91
        },
        payment_amount: {
          mape: 4.2,
          accuracy_within_10_pct: 0.95
        },
        risk_assessment: {
          auc: 0.96,
          precision: 0.90,
          recall: 0.85
        }
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return '#f44336';
    if (score >= 60) return '#ff9800';
    if (score >= 40) return '#ff9800';
    if (score >= 20) return '#2196f3';
    return '#4caf50';
  };

  const getSentimentIcon = (category: string) => {
    if (category.includes('POSITIVE')) return <SentimentSatisfied color="success" />;
    if (category.includes('NEGATIVE')) return <SentimentDissatisfied color="error" />;
    return <SentimentNeutral color="action" />;
  };

  const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#ff5722', '#f44336'];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <Dashboard sx={{ mr: 1, verticalAlign: 'middle' }} />
        Fund Manager AI Dashboard
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                High Risk Investors
              </Typography>
              <Typography variant="h4" color="error">
                {highRiskInvestors.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Churn risk ≥ 50
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Avg Sentiment Score
              </Typography>
              <Typography variant="h4" color={sentimentTrends?.average_sentiment_score > 0 ? 'success.main' : 'error.main'}>
                {sentimentTrends?.average_sentiment_score?.toFixed(2) || 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Last 90 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Document Classification
              </Typography>
              <Typography variant="h4" color="primary">
                {documentStats?.classification_accuracy ? (documentStats.classification_accuracy * 100).toFixed(1) : 'N/A'}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Accuracy
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Prediction Accuracy
              </Typography>
              <Typography variant="h4" color="success.main">
                {predictionMetrics?.payment_date?.accuracy_within_3_days ? (predictionMetrics.payment_date.accuracy_within_3_days * 100).toFixed(0) : 'N/A'}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Payment dates ±3 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabbed Content */}
      <Card>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Risk Overview" />
          <Tab label="Sentiment Analysis" />
          <Tab label="Document Routing" />
          <Tab label="Model Performance" />
        </Tabs>

        {/* Risk Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
            High-Risk Investors
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Investor ID</TableCell>
                  <TableCell>Churn Risk Score</TableCell>
                  <TableCell>Sentiment</TableCell>
                  <TableCell>Trend</TableCell>
                  <TableCell>Primary Emotion</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {highRiskInvestors.map((investor) => (
                  <TableRow key={investor.investor_id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {investor.investor_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: getRiskColor(investor.churn_risk_score),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        >
                          {investor.churn_risk_score}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getSentimentIcon(investor.sentiment_category)}
                        label={investor.sentiment_category}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={investor.sentiment_trend_30d}
                        size="small"
                        color={investor.sentiment_trend_30d === 'DETERIORATING' ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{investor.primary_emotion}</TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {highRiskInvestors.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Recommended Actions:</strong>
                <ul>
                  {highRiskInvestors[0]?.recommended_actions?.map((action: string, idx: number) => (
                    <li key={idx}>{action}</li>
                  ))}
                </ul>
              </Typography>
            </Alert>
          )}
        </TabPanel>

        {/* Sentiment Analysis Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Sentiment Distribution
              </Typography>
              {sentimentTrends && (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Highly Positive', value: sentimentTrends.sentiment_distribution.HIGHLY_POSITIVE * 100 },
                        { name: 'Positive', value: sentimentTrends.sentiment_distribution.POSITIVE * 100 },
                        { name: 'Neutral', value: sentimentTrends.sentiment_distribution.NEUTRAL * 100 },
                        { name: 'Negative', value: sentimentTrends.sentiment_distribution.NEGATIVE * 100 },
                        { name: 'Highly Negative', value: sentimentTrends.sentiment_distribution.HIGHLY_NEGATIVE * 100 }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Intent Distribution
              </Typography>
              {sentimentTrends?.intent_distribution && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(sentimentTrends.intent_distribution).map(([name, value]) => ({
                      name,
                      value: value as number
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2196f3" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Risk Indicators:</strong> {sentimentTrends?.risk_indicators?.high_churn_risk_count || 0} investors with high churn risk
                  ({((sentimentTrends?.risk_indicators?.high_churn_risk_percentage || 0) * 100).toFixed(1)}%),
                  {sentimentTrends?.risk_indicators?.complaint_risk_count || 0} with complaint risk,
                  {sentimentTrends?.risk_indicators?.escalation_risk_count || 0} with escalation risk
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Document Routing Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Documents by Team
              </Typography>
              {documentStats?.routing_by_team && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(documentStats.routing_by_team).map(([name, value]) => ({
                      name,
                      value: value as number
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#4caf50" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Priority Distribution
              </Typography>
              {documentStats?.priority_distribution && (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(documentStats.priority_distribution).map(([name, value]) => ({
                        name,
                        value: value as number
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Grid>

            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="text.secondary">Total Processed</Typography>
                      <Typography variant="h5">{documentStats?.total_documents_processed || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="text.secondary">Accuracy</Typography>
                      <Typography variant="h5" color="success.main">
                        {documentStats?.classification_accuracy ? (documentStats.classification_accuracy * 100).toFixed(1) : 'N/A'}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="text.secondary">Avg Processing Time</Typography>
                      <Typography variant="h5">{documentStats?.average_processing_time_seconds || 0}s</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="text.secondary">SLA Compliance</Typography>
                      <Typography variant="h5" color="success.main">
                        {documentStats?.sla_compliance_rate ? (documentStats.sla_compliance_rate * 100).toFixed(0) : 'N/A'}%
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Model Performance Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
            ML Model Performance Metrics
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" color="primary">Payment Date Prediction</Typography>
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">MAE (Mean Absolute Error)</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {predictionMetrics?.payment_date?.mae} days
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">RMSE</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {predictionMetrics?.payment_date?.rmse} days
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Accuracy (±3 days)</Typography>
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        {predictionMetrics?.payment_date?.accuracy_within_3_days ? (predictionMetrics.payment_date.accuracy_within_3_days * 100).toFixed(0) : 'N/A'}%
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    icon={<CheckCircle />}
                    label="ON TARGET"
                    color="success"
                    size="small"
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" color="primary">Payment Amount Prediction</Typography>
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">MAPE</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {predictionMetrics?.payment_amount?.mape}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Accuracy (±10%)</Typography>
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        {predictionMetrics?.payment_amount?.accuracy_within_10_pct ? (predictionMetrics.payment_amount.accuracy_within_10_pct * 100).toFixed(0) : 'N/A'}%
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    icon={<CheckCircle />}
                    label="ON TARGET"
                    color="success"
                    size="small"
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" color="primary">Risk Assessment</Typography>
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">AUC Score</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {predictionMetrics?.risk_assessment?.auc?.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Precision</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {predictionMetrics?.risk_assessment?.precision?.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Recall</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {predictionMetrics?.risk_assessment?.recall?.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    icon={<CheckCircle />}
                    label="ON TARGET"
                    color="success"
                    size="small"
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default FundManagerAIDashboard;
