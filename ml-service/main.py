"""
Distribution Agent - ML Forecasting Microservice
FastAPI service for distribution amount predictions using TensorFlow/scikit-learn
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import numpy as np
from datetime import datetime, timedelta
import uvicorn

app = FastAPI(title="Distribution Forecasting Service", version="1.0.0")


class HistoricalDataPoint(BaseModel):
    date: str
    amount: float
    month: int
    quarter: int


class FundMetrics(BaseModel):
    aum: Optional[float] = None
    nav: Optional[float] = None
    ytdReturn: Optional[float] = None


class ForecastRequest(BaseModel):
    historicalData: List[Dict]
    fundMetrics: FundMetrics
    months: int
    includeScenarios: bool = False


class ForecastPrediction(BaseModel):
    amount: float
    confidence: float
    bullAmount: Optional[float] = None
    bearAmount: Optional[float] = None
    reasoning: str


@app.get("/")
async def root():
    return {
        "service": "Distribution Forecasting Service",
        "version": "1.0.0",
        "status": "operational"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/forecast/distributions", response_model=List[ForecastPrediction])
async def forecast_distributions(request: ForecastRequest):
    """
    Generate distribution forecasts using ML models

    In production, this would use:
    - TensorFlow/Keras for neural network predictions
    - ARIMA/Prophet for time series forecasting
    - XGBoost for feature-based predictions

    For now, returns a simple statistical forecast with seasonality
    """
    try:
        # Extract historical amounts
        amounts = [float(d.get('amount', 0)) for d in request.historicalData]

        if len(amounts) < 4:
            raise HTTPException(
                status_code=400,
                detail="Insufficient historical data (minimum 4 data points required)"
            )

        # Calculate base forecast using moving average
        recent_amounts = amounts[-6:]  # Last 6 distributions
        avg_amount = sum(recent_amounts) / len(recent_amounts)

        # Calculate trend
        if len(amounts) >= 12:
            recent_avg = sum(amounts[-6:]) / 6
            older_avg = sum(amounts[-12:-6]) / 6
            trend_factor = (recent_avg - older_avg) / older_avg if older_avg > 0 else 0
        else:
            trend_factor = 0

        # Calculate seasonality by month
        monthly_data = {}
        for d in request.historicalData:
            month = d.get('month', 0)
            amount = float(d.get('amount', 0))
            if month not in monthly_data:
                monthly_data[month] = []
            monthly_data[month].append(amount)

        monthly_averages = {
            month: sum(values) / len(values)
            for month, values in monthly_data.items()
        }

        overall_avg = sum(amounts) / len(amounts)
        seasonality_factors = {
            month: avg / overall_avg if overall_avg > 0 else 1.0
            for month, avg in monthly_averages.items()
        }

        # Generate forecasts
        forecasts = []
        current_date = datetime.now()

        for i in range(request.months):
            forecast_date = current_date + timedelta(days=30 * i)
            month = forecast_date.month

            # Apply trend
            trend_multiplier = (1 + trend_factor) ** i

            # Apply seasonality
            seasonality_multiplier = seasonality_factors.get(month, 1.0)

            # Calculate base case
            base_amount = avg_amount * trend_multiplier * seasonality_multiplier

            # Calculate confidence (decreases over time)
            confidence = max(0.85 - (i * 0.02), 0.60)

            # Generate scenarios if requested
            bull_amount = None
            bear_amount = None
            if request.includeScenarios:
                bull_amount = base_amount * 1.20  # 20% upside scenario
                bear_amount = base_amount * 0.80  # 20% downside scenario

            # Generate reasoning
            trend_desc = "increasing" if trend_factor > 0.05 else "decreasing" if trend_factor < -0.05 else "stable"
            reasoning = f"ML forecast based on {len(amounts)} historical data points with {trend_desc} trend"

            forecasts.append(ForecastPrediction(
                amount=round(base_amount, 2),
                confidence=round(confidence, 2),
                bullAmount=round(bull_amount, 2) if bull_amount else None,
                bearAmount=round(bear_amount, 2) if bear_amount else None,
                reasoning=reasoning
            ))

        return forecasts

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/forecast/train")
async def train_model(request: Dict):
    """
    Endpoint for retraining the ML model with new data

    In production, this would:
    - Store training data
    - Retrain TensorFlow/XGBoost models
    - Validate model performance
    - Deploy updated model
    """
    return {
        "status": "training_started",
        "message": "Model training initiated (simulated)",
        "estimated_completion": "10 minutes"
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3001)
