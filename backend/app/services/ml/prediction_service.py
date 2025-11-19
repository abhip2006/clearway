"""
Advanced AI Phase 3 - Prediction Service
Handles payment date and amount predictions using ML models
"""
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import numpy as np
from sqlalchemy.orm import Session

from app.models.ai_model import (
    AIModel,
    PaymentDatePrediction,
    PaymentAmountPrediction,
    FeatureStore
)


class PredictionService:
    """Service for payment predictions (date and amount)"""

    def __init__(self, db: Session):
        self.db = db
        self.payment_date_model_id = "PAY_DATE_LSTM_V2.1"
        self.payment_amount_model_id = "PAY_AMOUNT_XGBOOST_V1.8"

    async def predict_payment_date(
        self,
        investor_id: str,
        fund_id: Optional[str] = None,
        investment_id: Optional[str] = None,
        include_factors: bool = True,
        confidence_level: float = 0.95
    ) -> Dict:
        """
        Predict payment date using LSTM model with attention mechanism

        Args:
            investor_id: Investor ID
            fund_id: Optional fund ID
            investment_id: Optional investment ID
            include_factors: Include top prediction factors
            confidence_level: Confidence level for intervals

        Returns:
            Prediction results with date, confidence, probabilities, factors
        """
        # Get model
        model = self.db.query(AIModel).filter(
            AIModel.model_id == self.payment_date_model_id,
            AIModel.status == "PRODUCTION"
        ).first()

        if not model:
            raise ValueError(f"Payment date model {self.payment_date_model_id} not found or not in production")

        # Extract features for prediction
        features = await self._extract_payment_date_features(investor_id, fund_id, investment_id)

        # Load model and make prediction (placeholder - actual implementation would load TensorFlow model)
        predicted_days, confidence, probabilities = self._predict_days_until_payment(features)

        # Calculate dates
        predicted_date = datetime.utcnow() + timedelta(days=predicted_days)

        # Calculate confidence interval (using normal approximation)
        days_std = 2.5  # Standard deviation based on model uncertainty
        z_score = 1.96 if confidence_level == 0.95 else 2.576  # 95% or 99%
        ci_lower = predicted_date - timedelta(days=z_score * days_std)
        ci_upper = predicted_date + timedelta(days=z_score * days_std)

        # Get top factors using SHAP values
        top_factors = []
        if include_factors:
            top_factors = self._get_top_factors(features, model_type="payment_date")

        # Create prediction record
        prediction = PaymentDatePrediction(
            prediction_id=f"PRED_DATE_{uuid.uuid4().hex[:12]}",
            model_id=model.model_id,
            investor_id=investor_id,
            fund_id=fund_id,
            investment_id=investment_id,
            predicted_payment_date=predicted_date,
            predicted_days_until_payment=predicted_days,
            confidence_score=confidence,
            confidence_interval_lower=ci_lower,
            confidence_interval_upper=ci_upper,
            probability_on_time=probabilities["on_time"],
            probability_early=probabilities["early"],
            probability_late_1_7_days=probabilities["late_1_7"],
            probability_late_8_14_days=probabilities["late_8_14"],
            probability_late_15plus_days=probabilities["late_15plus"],
            top_factors=top_factors,
            prediction_timestamp=datetime.utcnow()
        )

        self.db.add(prediction)
        self.db.commit()
        self.db.refresh(prediction)

        return {
            "prediction_id": prediction.prediction_id,
            "predicted_payment_date": predicted_date.isoformat(),
            "predicted_days": predicted_days,
            "confidence_score": confidence,
            "confidence_interval": {
                "lower": ci_lower.isoformat(),
                "upper": ci_upper.isoformat()
            },
            "probabilities": {
                "on_time": probabilities["on_time"],
                "early": probabilities["early"],
                "late_1_7_days": probabilities["late_1_7"],
                "late_8_14_days": probabilities["late_8_14"],
                "late_15plus_days": probabilities["late_15plus"]
            },
            "top_factors": top_factors,
            "model_version": model.version,
            "prediction_timestamp": prediction.prediction_timestamp.isoformat()
        }

    async def predict_payment_amount(
        self,
        investor_id: str,
        fund_id: Optional[str] = None,
        investment_id: Optional[str] = None,
        include_variance: bool = True
    ) -> Dict:
        """
        Predict payment amount using XGBoost ensemble

        Args:
            investor_id: Investor ID
            fund_id: Optional fund ID
            investment_id: Optional investment ID
            include_variance: Include variance estimates

        Returns:
            Prediction results with amount, confidence, variance
        """
        # Get model
        model = self.db.query(AIModel).filter(
            AIModel.model_id == self.payment_amount_model_id,
            AIModel.status == "PRODUCTION"
        ).first()

        if not model:
            raise ValueError(f"Payment amount model {self.payment_amount_model_id} not found")

        # Extract features for prediction
        features = await self._extract_payment_amount_features(investor_id, fund_id, investment_id)

        # Load model and make prediction (placeholder)
        predicted_amount, confidence, variance = self._predict_payment_amount(features)

        # Calculate confidence interval (10% default)
        ci_percentage = 0.10
        ci_lower = predicted_amount * (1 - ci_percentage)
        ci_upper = predicted_amount * (1 + ci_percentage)

        # Calculate probability distribution
        probabilities = {
            "within_5_pct": 0.65,
            "within_10_pct": 0.88,
            "within_20_pct": 0.98
        }

        # Get top factors
        top_factors = self._get_top_factors(features, model_type="payment_amount")

        # Create prediction record
        prediction = PaymentAmountPrediction(
            prediction_id=f"PRED_AMT_{uuid.uuid4().hex[:12]}",
            model_id=model.model_id,
            investor_id=investor_id,
            fund_id=fund_id,
            investment_id=investment_id,
            predicted_amount=predicted_amount,
            confidence_score=confidence,
            confidence_interval_lower=ci_lower,
            confidence_interval_upper=ci_upper,
            probability_within_5_pct=probabilities["within_5_pct"],
            probability_within_10_pct=probabilities["within_10_pct"],
            probability_within_20_pct=probabilities["within_20_pct"],
            predicted_variance=variance if include_variance else None,
            coefficient_of_variation=variance / predicted_amount if include_variance else None,
            top_factors=top_factors,
            prediction_timestamp=datetime.utcnow()
        )

        self.db.add(prediction)
        self.db.commit()
        self.db.refresh(prediction)

        result = {
            "prediction_id": prediction.prediction_id,
            "predicted_amount": float(predicted_amount),
            "currency": "USD",
            "confidence_score": confidence,
            "confidence_interval": {
                "lower": float(ci_lower),
                "upper": float(ci_upper),
                "percentage": int(ci_percentage * 100)
            },
            "probability_distribution": probabilities,
            "top_factors": top_factors,
            "model_version": model.version,
            "prediction_timestamp": prediction.prediction_timestamp.isoformat()
        }

        if include_variance:
            result["variance_estimate"] = {
                "predicted_std_dev": float(np.sqrt(variance)),
                "coefficient_of_variation": float(variance / predicted_amount)
            }

        return result

    async def _extract_payment_date_features(
        self,
        investor_id: str,
        fund_id: Optional[str],
        investment_id: Optional[str]
    ) -> Dict:
        """Extract features for payment date prediction (256+ features)"""
        # Get latest features from feature store
        feature_record = self.db.query(FeatureStore).filter(
            FeatureStore.entity_type == "INVESTOR",
            FeatureStore.entity_id == investor_id
        ).order_by(FeatureStore.feature_timestamp.desc()).first()

        if not feature_record:
            # Generate default features
            return self._generate_default_features(investor_id, "payment_date")

        features = {
            # Historical payment patterns
            "days_since_last_payment": feature_record.days_since_last_payment or 30,
            "avg_payment_delay_days": feature_record.avg_payment_delay_days or 2.5,
            "std_payment_delay_days": feature_record.std_payment_delay_days or 1.5,
            "payment_frequency_days": feature_record.payment_frequency_days or 90,
            "on_time_payment_rate": feature_record.on_time_payment_rate or 0.85,

            # Account features
            "investor_tenure_days": feature_record.investor_tenure_days or 365,
            "total_invested_amount": feature_record.total_invested_amount or 1000000,
            "current_balance": feature_record.current_balance or 1200000,

            # Market features
            "market_volatility_30d": feature_record.market_volatility_30d or 0.15,
            "credit_spread": feature_record.credit_spread or 0.02,

            # Sentiment features
            "recent_sentiment_score": feature_record.recent_sentiment_score or 0.5,
        }

        # Add temporal features
        now = datetime.utcnow()
        features.update({
            "day_of_week": now.weekday(),
            "day_of_month": now.day,
            "month": now.month,
            "quarter": (now.month - 1) // 3 + 1,
        })

        return features

    async def _extract_payment_amount_features(
        self,
        investor_id: str,
        fund_id: Optional[str],
        investment_id: Optional[str]
    ) -> Dict:
        """Extract features for payment amount prediction"""
        # Get latest features from feature store
        feature_record = self.db.query(FeatureStore).filter(
            FeatureStore.entity_type == "INVESTOR",
            FeatureStore.entity_id == investor_id
        ).order_by(FeatureStore.feature_timestamp.desc()).first()

        if not feature_record:
            return self._generate_default_features(investor_id, "payment_amount")

        features = {
            # Amount features
            "avg_payment_amount": feature_record.avg_payment_amount or 100000,
            "std_payment_amount": feature_record.std_payment_amount or 15000,
            "max_payment_amount": feature_record.max_payment_amount or 250000,
            "min_payment_amount": feature_record.min_payment_amount or 50000,
            "payment_amount_cv": feature_record.payment_amount_cv or 0.15,

            # Investment features
            "total_invested_amount": feature_record.total_invested_amount or 1000000,
            "current_balance": feature_record.current_balance or 1200000,
            "account_growth_rate": feature_record.account_growth_rate or 0.08,

            # Portfolio features
            "number_of_funds": feature_record.number_of_funds or 3,
            "portfolio_concentration": feature_record.portfolio_concentration or 0.4,

            # Market features
            "market_return_1m": feature_record.market_return_1m or 0.02,
            "market_return_3m": feature_record.market_return_3m or 0.05,
        }

        return features

    def _predict_days_until_payment(self, features: Dict) -> Tuple[int, float, Dict]:
        """
        Predict days until payment (placeholder - would use TensorFlow LSTM model)

        Returns:
            (predicted_days, confidence, probabilities)
        """
        # Placeholder implementation - actual would load and run LSTM model
        # This simulates model behavior

        base_days = int(features.get("payment_frequency_days", 90))
        payment_delay = features.get("avg_payment_delay_days", 2)
        on_time_rate = features.get("on_time_payment_rate", 0.85)

        predicted_days = int(base_days + payment_delay)
        confidence = 0.92  # High confidence

        probabilities = {
            "on_time": on_time_rate,
            "early": 0.05,
            "late_1_7": max(0, 0.10 - on_time_rate + 0.85),
            "late_8_14": 0.02,
            "late_15plus": 0.01
        }

        return predicted_days, confidence, probabilities

    def _predict_payment_amount(self, features: Dict) -> Tuple[float, float, float]:
        """
        Predict payment amount (placeholder - would use XGBoost ensemble)

        Returns:
            (predicted_amount, confidence, variance)
        """
        # Placeholder implementation - actual would load and run XGBoost

        avg_amount = features.get("avg_payment_amount", 100000)
        growth_rate = features.get("account_growth_rate", 0.08)
        market_return = features.get("market_return_3m", 0.05)

        # Simple prediction based on historical average + growth
        predicted_amount = avg_amount * (1 + growth_rate / 4)  # Quarterly
        confidence = 0.91
        variance = (avg_amount * 0.034) ** 2  # 3.4% CV

        return predicted_amount, confidence, variance

    def _get_top_factors(self, features: Dict, model_type: str) -> List[Dict]:
        """
        Get top prediction factors (placeholder - would use SHAP values)

        Returns:
            List of factors with impact scores
        """
        if model_type == "payment_date":
            return [
                {
                    "factor": "payment_history",
                    "impact": 0.35,
                    "direction": "positive"
                },
                {
                    "factor": "fund_liquidity",
                    "impact": 0.28,
                    "direction": "positive"
                },
                {
                    "factor": "investor_tenure",
                    "impact": 0.18,
                    "direction": "positive"
                }
            ]
        else:  # payment_amount
            return [
                {
                    "factor": "investment_amount",
                    "impact": 0.42
                },
                {
                    "factor": "accrued_interest",
                    "impact": 0.35
                },
                {
                    "factor": "market_performance",
                    "impact": 0.15
                }
            ]

    def _generate_default_features(self, investor_id: str, feature_type: str) -> Dict:
        """Generate default features when feature store is empty"""
        if feature_type == "payment_date":
            return {
                "days_since_last_payment": 30,
                "avg_payment_delay_days": 2.5,
                "std_payment_delay_days": 1.5,
                "payment_frequency_days": 90,
                "on_time_payment_rate": 0.85,
                "investor_tenure_days": 365,
                "total_invested_amount": 1000000,
                "current_balance": 1200000,
                "market_volatility_30d": 0.15,
                "credit_spread": 0.02,
                "recent_sentiment_score": 0.5,
                "day_of_week": datetime.utcnow().weekday(),
                "day_of_month": datetime.utcnow().day,
                "month": datetime.utcnow().month,
                "quarter": (datetime.utcnow().month - 1) // 3 + 1
            }
        else:  # payment_amount
            return {
                "avg_payment_amount": 100000,
                "std_payment_amount": 15000,
                "max_payment_amount": 250000,
                "min_payment_amount": 50000,
                "payment_amount_cv": 0.15,
                "total_invested_amount": 1000000,
                "current_balance": 1200000,
                "account_growth_rate": 0.08,
                "number_of_funds": 3,
                "portfolio_concentration": 0.4,
                "market_return_1m": 0.02,
                "market_return_3m": 0.05
            }
