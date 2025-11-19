"""
Advanced AI Phase 3 - Prediction API Routes
API endpoints for payment predictions and risk assessments
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.services.ml.prediction_service import PredictionService
from app.services.ml.risk_modeling_service import RiskModelingService

router = APIRouter()


# Request/Response Models
class PaymentDatePredictionRequest(BaseModel):
    investor_id: str
    fund_id: Optional[str] = None
    investment_id: Optional[str] = None
    include_factors: bool = True
    confidence_level: float = 0.95


class PaymentAmountPredictionRequest(BaseModel):
    investor_id: str
    fund_id: Optional[str] = None
    investment_id: Optional[str] = None
    include_variance: bool = True


class RiskAssessmentRequest(BaseModel):
    investor_id: Optional[str] = None
    fund_id: Optional[str] = None
    risk_type: str = "DEFAULT_RISK"  # DEFAULT_RISK, FUND_PERFORMANCE_RISK
    risk_horizon: str = "12M"  # 3M, 6M, 12M
    include_trend: bool = True


# Payment Date Prediction Endpoints
@router.post("/payment-date")
async def predict_payment_date(
    request: PaymentDatePredictionRequest,
    db: Session = Depends(get_db)
):
    """
    Predict payment date using LSTM model

    Returns:
    - Predicted payment date with confidence interval
    - Probability distribution (on-time, early, late)
    - Top prediction factors (SHAP values)
    - Confidence score
    """
    try:
        service = PredictionService(db)
        result = await service.predict_payment_date(
            investor_id=request.investor_id,
            fund_id=request.fund_id,
            investment_id=request.investment_id,
            include_factors=request.include_factors,
            confidence_level=request.confidence_level
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payment-amount")
async def predict_payment_amount(
    request: PaymentAmountPredictionRequest,
    db: Session = Depends(get_db)
):
    """
    Predict payment amount using XGBoost ensemble

    Returns:
    - Predicted amount with confidence interval
    - Probability distribution
    - Variance estimate
    - Top prediction factors
    """
    try:
        service = PredictionService(db)
        result = await service.predict_payment_amount(
            investor_id=request.investor_id,
            fund_id=request.fund_id,
            investment_id=request.investment_id,
            include_variance=request.include_variance
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/risk-assessment")
async def assess_risk(
    request: RiskAssessmentRequest,
    db: Session = Depends(get_db)
):
    """
    Assess investor or fund risk

    For DEFAULT_RISK:
    - Returns probability of default, risk tier, risk factors
    - Estimated loss exposure
    - Recommended monitoring actions

    For FUND_PERFORMANCE_RISK:
    - Returns VaR, CVaR, scenario analysis
    - Stress test results
    - Risk-adjusted return metrics
    """
    try:
        service = RiskModelingService(db)

        if request.risk_type == "DEFAULT_RISK":
            if not request.investor_id:
                raise HTTPException(status_code=400, detail="investor_id required for DEFAULT_RISK")

            result = await service.assess_investor_default_risk(
                investor_id=request.investor_id,
                risk_horizon=request.risk_horizon,
                include_trend=request.include_trend
            )
        elif request.risk_type == "FUND_PERFORMANCE_RISK":
            if not request.fund_id:
                raise HTTPException(status_code=400, detail="fund_id required for FUND_PERFORMANCE_RISK")

            result = await service.assess_fund_performance_risk(
                fund_id=request.fund_id
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid risk_type")

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payment-date/{prediction_id}")
async def get_payment_date_prediction(
    prediction_id: str,
    db: Session = Depends(get_db)
):
    """Get payment date prediction by ID"""
    from app.models.ai_model import PaymentDatePrediction

    prediction = db.query(PaymentDatePrediction).filter(
        PaymentDatePrediction.prediction_id == prediction_id
    ).first()

    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    return {
        "prediction_id": prediction.prediction_id,
        "investor_id": prediction.investor_id,
        "predicted_payment_date": prediction.predicted_payment_date.isoformat(),
        "predicted_days": prediction.predicted_days_until_payment,
        "confidence_score": prediction.confidence_score,
        "actual_payment_date": prediction.actual_payment_date.isoformat() if prediction.actual_payment_date else None,
        "prediction_accuracy": prediction.prediction_accuracy
    }


@router.get("/risk/{prediction_id}")
async def get_risk_prediction(
    prediction_id: str,
    db: Session = Depends(get_db)
):
    """Get risk prediction by ID"""
    from app.models.ai_model import RiskPrediction

    prediction = db.query(RiskPrediction).filter(
        RiskPrediction.prediction_id == prediction_id
    ).first()

    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    return {
        "prediction_id": prediction.prediction_id,
        "risk_type": prediction.risk_type,
        "risk_probability": prediction.risk_probability,
        "risk_tier": prediction.risk_tier,
        "risk_score": prediction.risk_score,
        "risk_trend": prediction.risk_trend,
        "top_risk_factors": prediction.top_risk_factors,
        "estimated_loss_exposure": float(prediction.estimated_loss_exposure) if prediction.estimated_loss_exposure else None
    }


@router.get("/investor/{investor_id}/predictions")
async def get_investor_predictions(
    investor_id: str,
    prediction_type: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get all predictions for an investor"""
    from app.models.ai_model import PaymentDatePrediction, PaymentAmountPrediction, RiskPrediction

    result = {"investor_id": investor_id}

    if prediction_type in [None, "payment_date"]:
        payment_date_predictions = db.query(PaymentDatePrediction).filter(
            PaymentDatePrediction.investor_id == investor_id
        ).order_by(PaymentDatePrediction.prediction_timestamp.desc()).limit(limit).all()

        result["payment_date_predictions"] = [
            {
                "prediction_id": p.prediction_id,
                "predicted_date": p.predicted_payment_date.isoformat(),
                "confidence": p.confidence_score,
                "timestamp": p.prediction_timestamp.isoformat()
            }
            for p in payment_date_predictions
        ]

    if prediction_type in [None, "payment_amount"]:
        amount_predictions = db.query(PaymentAmountPrediction).filter(
            PaymentAmountPrediction.investor_id == investor_id
        ).order_by(PaymentAmountPrediction.prediction_timestamp.desc()).limit(limit).all()

        result["payment_amount_predictions"] = [
            {
                "prediction_id": p.prediction_id,
                "predicted_amount": float(p.predicted_amount),
                "confidence": p.confidence_score,
                "timestamp": p.prediction_timestamp.isoformat()
            }
            for p in amount_predictions
        ]

    if prediction_type in [None, "risk"]:
        risk_predictions = db.query(RiskPrediction).filter(
            RiskPrediction.investor_id == investor_id
        ).order_by(RiskPrediction.prediction_timestamp.desc()).limit(limit).all()

        result["risk_predictions"] = [
            {
                "prediction_id": p.prediction_id,
                "risk_type": p.risk_type,
                "risk_score": p.risk_score,
                "risk_tier": p.risk_tier,
                "timestamp": p.prediction_timestamp.isoformat()
            }
            for p in risk_predictions
        ]

    return result


@router.post("/batch/payment-date")
async def batch_predict_payment_dates(
    investor_ids: list[str],
    db: Session = Depends(get_db)
):
    """Batch prediction for multiple investors"""
    try:
        service = PredictionService(db)
        results = []

        for investor_id in investor_ids:
            result = await service.predict_payment_date(
                investor_id=investor_id,
                include_factors=False  # Faster for batch
            )
            results.append(result)

        return {
            "count": len(results),
            "predictions": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
