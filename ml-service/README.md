# Distribution Forecasting ML Service

FastAPI microservice for ML-based distribution amount predictions.

## Features

- Distribution amount forecasting using statistical models
- Seasonality detection and trend analysis
- Multiple scenario predictions (base, bull, bear cases)
- RESTful API for easy integration
- Health check and monitoring endpoints

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

The service will start on `http://localhost:3001`

## API Endpoints

### POST /forecast/distributions
Generate distribution forecasts

**Request:**
```json
{
  "historicalData": [
    {
      "date": "2024-01-15",
      "amount": 1000000,
      "month": 0,
      "quarter": 0
    }
  ],
  "fundMetrics": {
    "aum": 50000000,
    "nav": 100.50,
    "ytdReturn": 0.12
  },
  "months": 12,
  "includeScenarios": true
}
```

**Response:**
```json
[
  {
    "amount": 1050000,
    "confidence": 0.85,
    "bullAmount": 1260000,
    "bearAmount": 840000,
    "reasoning": "ML forecast based on 24 historical data points with stable trend"
  }
]
```

### GET /health
Health check endpoint

## Production Enhancements

For production deployment, consider:

1. **ML Models**: Integrate TensorFlow, XGBoost, or Prophet for advanced forecasting
2. **Model Training**: Implement automated retraining pipelines
3. **Feature Engineering**: Add more sophisticated features (volatility, market indicators, etc.)
4. **Model Versioning**: Track and manage different model versions
5. **Performance Monitoring**: Track prediction accuracy and model drift
6. **Scaling**: Deploy with Kubernetes for horizontal scaling
7. **Caching**: Add Redis for caching frequent predictions

## Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 3001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3001"]
```

## Testing

```bash
# Test the service
curl -X POST http://localhost:3001/forecast/distributions \
  -H "Content-Type: application/json" \
  -d '{"historicalData": [...], "months": 12}'
```
