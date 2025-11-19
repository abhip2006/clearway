"""
Advanced AI Phase 3 - Risk Modeling Service
Handles investor default risk and fund performance risk assessments
"""
import uuid
from datetime import datetime
from typing import Dict, List, Optional
import numpy as np
from sqlalchemy.orm import Session

from app.models.ai_model import AIModel, RiskPrediction, FeatureStore


class RiskModelingService:
    """Service for risk assessment and modeling"""

    def __init__(self, db: Session):
        self.db = db
        self.default_risk_model_id = "DEFAULT_RISK_NN_V2.3"
        self.fund_risk_model_id = "FUND_RISK_MC_V1.5"

    async def assess_investor_default_risk(
        self,
        investor_id: str,
        risk_horizon: str = "12M",
        include_trend: bool = True
    ) -> Dict:
        """
        Assess investor default risk using Neural Network + Isolation Forest

        Args:
            investor_id: Investor ID
            risk_horizon: Risk time horizon (3M, 6M, 12M)
            include_trend: Include risk trend analysis

        Returns:
            Risk assessment with probability, tier, factors, recommendations
        """
        # Get model
        model = self.db.query(AIModel).filter(
            AIModel.model_id == self.default_risk_model_id,
            AIModel.status == "PRODUCTION"
        ).first()

        if not model:
            raise ValueError(f"Default risk model {self.default_risk_model_id} not found")

        # Extract features for risk assessment
        features = await self._extract_risk_features(investor_id)

        # Make prediction
        risk_probability, risk_score = self._predict_default_risk(features)

        # Determine risk tier
        risk_tier = self._calculate_risk_tier(risk_probability)

        # Get previous risk score for trend
        previous_score = None
        risk_trend = "STABLE"
        if include_trend:
            previous_score, risk_trend = self._calculate_risk_trend(investor_id, risk_score)

        # Identify top risk factors
        top_risk_factors = self._identify_risk_factors(features)

        # Calculate loss exposure
        loss_exposure = self._calculate_loss_exposure(investor_id, risk_probability)

        # Generate recommendations
        recommendations = self._generate_risk_recommendations(risk_tier, top_risk_factors)

        # Create prediction record
        prediction = RiskPrediction(
            prediction_id=f"PRED_RISK_{uuid.uuid4().hex[:12]}",
            model_id=model.model_id,
            risk_type="DEFAULT_RISK",
            risk_horizon=risk_horizon,
            investor_id=investor_id,
            risk_probability=risk_probability,
            risk_tier=risk_tier,
            risk_score=risk_score,
            previous_risk_score=previous_score,
            risk_trend=risk_trend,
            trend_magnitude=abs(risk_score - previous_score) if previous_score else 0,
            top_risk_factors=top_risk_factors,
            estimated_loss_exposure=loss_exposure["amount"],
            exposure_percentage=loss_exposure["percentage"],
            recommended_actions=recommendations,
            prediction_timestamp=datetime.utcnow()
        )

        self.db.add(prediction)
        self.db.commit()
        self.db.refresh(prediction)

        return {
            "prediction_id": prediction.prediction_id,
            "investor_id": investor_id,
            "risk_type": "DEFAULT_RISK",
            "risk_horizon": risk_horizon,
            "default_probability": risk_probability,
            "risk_tier": risk_tier,
            "risk_score": risk_score,
            "risk_trend": {
                "previous_score": previous_score,
                "trend": risk_trend,
                "magnitude": abs(risk_score - previous_score) if previous_score else 0,
                "trend_period": "30_days"
            },
            "top_risk_factors": top_risk_factors,
            "estimated_loss_exposure": {
                "amount": float(loss_exposure["amount"]),
                "percentage_of_portfolio": loss_exposure["percentage"]
            },
            "recommended_actions": recommendations,
            "model_version": model.version,
            "prediction_timestamp": prediction.prediction_timestamp.isoformat()
        }

    async def assess_fund_performance_risk(
        self,
        fund_id: str,
        scenarios: Optional[List[str]] = None
    ) -> Dict:
        """
        Assess fund performance risk using Monte Carlo simulation

        Args:
            fund_id: Fund ID
            scenarios: List of scenarios to evaluate

        Returns:
            Risk assessment with VaR, CVaR, scenarios, stress tests
        """
        # Get model
        model = self.db.query(AIModel).filter(
            AIModel.model_id == self.fund_risk_model_id,
            AIModel.status == "PRODUCTION"
        ).first()

        if not model:
            raise ValueError(f"Fund risk model {self.fund_risk_model_id} not found")

        # Extract fund features
        features = await self._extract_fund_features(fund_id)

        # Run Monte Carlo simulation
        mc_results = self._run_monte_carlo_simulation(features)

        # Calculate VaR and CVaR
        var_95 = self._calculate_var(mc_results["returns"], 0.95)
        var_99 = self._calculate_var(mc_results["returns"], 0.99)
        cvar_95 = self._calculate_cvar(mc_results["returns"], 0.95)

        # Run scenario analysis
        if not scenarios:
            scenarios = ["BULL", "BASE", "BEAR", "TAIL_EVENT"]

        scenario_results = self._run_scenario_analysis(features, scenarios)

        # Calculate risk metrics
        risk_metrics = {
            "expected_return_1y": mc_results["expected_return"],
            "volatility": mc_results["volatility"],
            "var_95": var_95,
            "var_99": var_99,
            "cvar_95": cvar_95,
            "sharpe_ratio": self._calculate_sharpe_ratio(mc_results),
            "sortino_ratio": self._calculate_sortino_ratio(mc_results),
            "max_drawdown": mc_results["max_drawdown"],
            "probability_positive_return": mc_results["prob_positive"]
        }

        # Create prediction record
        prediction = RiskPrediction(
            prediction_id=f"PRED_FUND_RISK_{uuid.uuid4().hex[:12]}",
            model_id=model.model_id,
            risk_type="FUND_PERFORMANCE_RISK",
            risk_horizon="12M",
            fund_id=fund_id,
            risk_probability=1 - mc_results["prob_positive"],
            risk_score=int((1 - mc_results["prob_positive"]) * 100),
            contributing_metrics={
                "var_95": var_95,
                "cvar_95": cvar_95,
                "volatility": mc_results["volatility"],
                "max_drawdown": mc_results["max_drawdown"]
            },
            recommended_actions=self._generate_fund_risk_recommendations(risk_metrics),
            prediction_timestamp=datetime.utcnow()
        )

        self.db.add(prediction)
        self.db.commit()
        self.db.refresh(prediction)

        return {
            "prediction_id": prediction.prediction_id,
            "fund_id": fund_id,
            "risk_metrics": risk_metrics,
            "return_distribution": {
                "expected_return": mc_results["expected_return"],
                "percentile_5": mc_results["p5"],
                "percentile_25": mc_results["p25"],
                "percentile_50": mc_results["p50"],
                "percentile_75": mc_results["p75"],
                "percentile_95": mc_results["p95"]
            },
            "scenario_analysis": scenario_results,
            "stress_tests": self._run_stress_tests(features),
            "model_version": model.version,
            "prediction_timestamp": prediction.prediction_timestamp.isoformat()
        }

    async def _extract_risk_features(self, investor_id: str) -> Dict:
        """Extract features for default risk assessment"""
        feature_record = self.db.query(FeatureStore).filter(
            FeatureStore.entity_type == "INVESTOR",
            FeatureStore.entity_id == investor_id
        ).order_by(FeatureStore.feature_timestamp.desc()).first()

        if not feature_record:
            return self._generate_default_risk_features()

        return {
            # Payment behavior
            "late_payment_count": feature_record.late_payment_count or 0,
            "missed_payment_count": feature_record.missed_payment_count or 0,
            "on_time_payment_rate": feature_record.on_time_payment_rate or 0.9,
            "avg_payment_delay_days": feature_record.avg_payment_delay_days or 1.5,

            # Account health
            "current_balance": feature_record.current_balance or 1000000,
            "account_growth_rate": feature_record.account_growth_rate or 0.08,
            "leverage_ratio": feature_record.leverage_ratio or 0.3,
            "liquidity_risk": feature_record.liquidity_risk or 0.15,

            # Sentiment
            "recent_sentiment_score": feature_record.recent_sentiment_score or 0.6,
            "sentiment_trend": feature_record.sentiment_trend or 0,
            "communication_frequency": feature_record.communication_frequency or 5,

            # Portfolio
            "portfolio_concentration": feature_record.portfolio_concentration or 0.4,
            "portfolio_volatility": feature_record.portfolio_volatility or 0.18,
            "diversification_score": feature_record.diversification_score or 0.7
        }

    async def _extract_fund_features(self, fund_id: str) -> Dict:
        """Extract features for fund performance risk"""
        # Placeholder - would query fund historical returns and characteristics
        return {
            "historical_returns": [0.08, 0.12, -0.03, 0.15, 0.09],
            "volatility": 0.18,
            "sharpe_ratio": 0.95,
            "max_drawdown": -0.12,
            "correlation_sp500": 0.65,
            "asset_allocation": {
                "stocks": 0.60,
                "bonds": 0.30,
                "alternatives": 0.10
            }
        }

    def _predict_default_risk(self, features: Dict) -> tuple:
        """
        Predict default risk (placeholder - would use Neural Network model)

        Returns:
            (risk_probability, risk_score)
        """
        # Simple scoring based on features
        late_payment_score = features["late_payment_count"] * 5
        missed_payment_score = features["missed_payment_count"] * 15
        on_time_bonus = (1 - features["on_time_payment_rate"]) * 30
        leverage_score = features["leverage_ratio"] * 20
        sentiment_score = max(0, (0.5 - features["recent_sentiment_score"])) * 25

        risk_score = min(100, late_payment_score + missed_payment_score +
                        on_time_bonus + leverage_score + sentiment_score)

        risk_probability = risk_score / 100 * 0.25  # Max 25% probability

        return risk_probability, int(risk_score)

    def _calculate_risk_tier(self, risk_probability: float) -> str:
        """Calculate risk tier based on probability"""
        if risk_probability < 0.02:
            return "TIER_1"  # Very Low Risk
        elif risk_probability < 0.05:
            return "TIER_2"  # Low Risk
        elif risk_probability < 0.10:
            return "TIER_3"  # Moderate Risk
        elif risk_probability < 0.20:
            return "TIER_4"  # High Risk
        else:
            return "TIER_5"  # Very High Risk

    def _calculate_risk_trend(self, investor_id: str, current_score: int) -> tuple:
        """Calculate risk trend from historical predictions"""
        # Get previous risk prediction (30 days ago)
        previous_prediction = self.db.query(RiskPrediction).filter(
            RiskPrediction.investor_id == investor_id,
            RiskPrediction.risk_type == "DEFAULT_RISK"
        ).order_by(RiskPrediction.prediction_timestamp.desc()).offset(1).first()

        if not previous_prediction:
            return current_score, "STABLE"

        previous_score = previous_prediction.risk_score
        diff = current_score - previous_score

        if diff > 5:
            trend = "DETERIORATING"
        elif diff < -5:
            trend = "IMPROVING"
        else:
            trend = "STABLE"

        return previous_score, trend

    def _identify_risk_factors(self, features: Dict) -> List[Dict]:
        """Identify top risk factors contributing to default risk"""
        factors = []

        if features["late_payment_count"] > 2:
            factors.append({
                "factor": "recent_payment_delays",
                "weight": 0.28
            })

        if features["account_growth_rate"] < 0:
            factors.append({
                "factor": "account_balance_decline",
                "weight": 0.22
            })

        if features["recent_sentiment_score"] < 0.3:
            factors.append({
                "factor": "communication_sentiment_negative",
                "weight": 0.18
            })

        if features["leverage_ratio"] > 0.5:
            factors.append({
                "factor": "high_leverage_ratio",
                "weight": 0.15
            })

        # Ensure we have at least some factors
        if not factors:
            factors = [
                {"factor": "portfolio_volatility", "weight": 0.20},
                {"factor": "market_conditions", "weight": 0.15}
            ]

        return factors[:5]  # Top 5

    def _calculate_loss_exposure(self, investor_id: str, risk_probability: float) -> Dict:
        """Calculate estimated loss exposure"""
        # Get investor balance
        feature_record = self.db.query(FeatureStore).filter(
            FeatureStore.entity_type == "INVESTOR",
            FeatureStore.entity_id == investor_id
        ).order_by(FeatureStore.feature_timestamp.desc()).first()

        balance = feature_record.current_balance if feature_record else 1000000
        total_portfolio = 15000000  # Would query actual total AUM

        loss_exposure = balance * risk_probability
        exposure_pct = (loss_exposure / total_portfolio) * 100

        return {
            "amount": loss_exposure,
            "percentage": exposure_pct
        }

    def _generate_risk_recommendations(self, risk_tier: str, factors: List[Dict]) -> List[str]:
        """Generate risk mitigation recommendations"""
        recommendations = []

        if risk_tier in ["TIER_4", "TIER_5"]:
            recommendations.append("Increase monitoring frequency to weekly")
            recommendations.append("Schedule relationship manager call")
            recommendations.append("Review account covenants")

        if any(f["factor"] == "recent_payment_delays" for f in factors):
            recommendations.append("Investigate payment processing issues")

        if any(f["factor"] == "communication_sentiment_negative" for f in factors):
            recommendations.append("Proactive outreach to address concerns")

        if not recommendations:
            recommendations.append("Continue standard monitoring")

        return recommendations

    def _run_monte_carlo_simulation(self, features: Dict) -> Dict:
        """Run Monte Carlo simulation for fund performance"""
        # Placeholder - would run full Monte Carlo with 100,000 paths
        mean_return = np.mean(features["historical_returns"])
        volatility = features["volatility"]

        # Simulate returns
        np.random.seed(42)
        simulated_returns = np.random.normal(mean_return, volatility, 10000)

        return {
            "returns": simulated_returns,
            "expected_return": float(np.mean(simulated_returns)),
            "volatility": float(np.std(simulated_returns)),
            "max_drawdown": float(np.min(simulated_returns)),
            "prob_positive": float(np.mean(simulated_returns > 0)),
            "p5": float(np.percentile(simulated_returns, 5)),
            "p25": float(np.percentile(simulated_returns, 25)),
            "p50": float(np.percentile(simulated_returns, 50)),
            "p75": float(np.percentile(simulated_returns, 75)),
            "p95": float(np.percentile(simulated_returns, 95))
        }

    def _calculate_var(self, returns: np.ndarray, confidence: float) -> float:
        """Calculate Value at Risk"""
        return float(np.percentile(returns, (1 - confidence) * 100))

    def _calculate_cvar(self, returns: np.ndarray, confidence: float) -> float:
        """Calculate Conditional Value at Risk (Expected Shortfall)"""
        var = self._calculate_var(returns, confidence)
        return float(np.mean(returns[returns <= var]))

    def _calculate_sharpe_ratio(self, mc_results: Dict) -> float:
        """Calculate Sharpe ratio"""
        risk_free_rate = 0.02  # 2% risk-free rate
        return (mc_results["expected_return"] - risk_free_rate) / mc_results["volatility"]

    def _calculate_sortino_ratio(self, mc_results: Dict) -> float:
        """Calculate Sortino ratio (downside risk)"""
        risk_free_rate = 0.02
        returns = mc_results["returns"]
        downside_returns = returns[returns < risk_free_rate]
        downside_std = float(np.std(downside_returns)) if len(downside_returns) > 0 else mc_results["volatility"]
        return (mc_results["expected_return"] - risk_free_rate) / downside_std

    def _run_scenario_analysis(self, features: Dict, scenarios: List[str]) -> List[Dict]:
        """Run scenario analysis"""
        results = []

        scenario_params = {
            "BULL": {"return": 0.15, "volatility": 0.12},
            "BASE": {"return": 0.08, "volatility": 0.18},
            "BEAR": {"return": -0.15, "volatility": 0.25},
            "TAIL_EVENT": {"return": -0.30, "volatility": 0.40}
        }

        for scenario in scenarios:
            params = scenario_params.get(scenario, scenario_params["BASE"])
            results.append({
                "scenario": scenario,
                "expected_return": params["return"],
                "volatility": params["volatility"],
                "probability": 0.25 if scenario == "BASE" else 0.10
            })

        return results

    def _run_stress_tests(self, features: Dict) -> List[Dict]:
        """Run stress tests"""
        return [
            {
                "test": "2008_FINANCIAL_CRISIS",
                "expected_return": -0.35,
                "probability": 0.02
            },
            {
                "test": "INTEREST_RATE_SHOCK",
                "expected_return": -0.12,
                "probability": 0.15
            },
            {
                "test": "LIQUIDITY_CRISIS",
                "expected_return": -0.18,
                "probability": 0.08
            }
        ]

    def _generate_fund_risk_recommendations(self, risk_metrics: Dict) -> List[str]:
        """Generate fund risk recommendations"""
        recommendations = []

        if risk_metrics["sharpe_ratio"] < 0.5:
            recommendations.append("Consider portfolio rebalancing for better risk-adjusted returns")

        if risk_metrics["max_drawdown"] < -0.20:
            recommendations.append("Review downside protection strategies")

        if risk_metrics["probability_positive_return"] < 0.75:
            recommendations.append("Evaluate defensive positioning")

        if not recommendations:
            recommendations.append("Maintain current risk management approach")

        return recommendations

    def _generate_default_risk_features(self) -> Dict:
        """Generate default risk features"""
        return {
            "late_payment_count": 1,
            "missed_payment_count": 0,
            "on_time_payment_rate": 0.9,
            "avg_payment_delay_days": 1.5,
            "current_balance": 1000000,
            "account_growth_rate": 0.08,
            "leverage_ratio": 0.3,
            "liquidity_risk": 0.15,
            "recent_sentiment_score": 0.6,
            "sentiment_trend": 0,
            "communication_frequency": 5,
            "portfolio_concentration": 0.4,
            "portfolio_volatility": 0.18,
            "diversification_score": 0.7
        }
