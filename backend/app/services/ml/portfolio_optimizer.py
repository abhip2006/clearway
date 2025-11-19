"""
Advanced AI Phase 3 - Portfolio Optimization Service
Modern Portfolio Theory with ML-based recommendations
"""
import uuid
from datetime import datetime
from typing import Dict, List, Optional
import numpy as np
from sqlalchemy.orm import Session

from app.models.ai_model import AIModel, PortfolioRecommendation


class PortfolioOptimizer:
    """Service for portfolio optimization using MPT and ML"""

    def __init__(self, db: Session):
        self.db = db
        self.optimization_model_id = "PORTFOLIO_OPT_MPT_V1.5"

    async def generate_recommendations(
        self,
        investor_id: str,
        portfolio_id: Optional[str] = None,
        recommendation_count: int = 3,
        constraint_type: str = "MODERATE_RISK"
    ) -> Dict:
        """
        Generate portfolio optimization recommendations

        Args:
            investor_id: Investor ID
            portfolio_id: Optional portfolio ID
            recommendation_count: Number of recommendations to generate
            constraint_type: CONSERVATIVE, MODERATE_RISK, AGGRESSIVE

        Returns:
            Portfolio recommendations with allocations, impact analysis, costs
        """
        # Get model
        model = self.db.query(AIModel).filter(
            AIModel.model_id == self.optimization_model_id,
            AIModel.status == "PRODUCTION"
        ).first()

        if not model:
            raise ValueError(f"Portfolio optimization model not found")

        # Get current portfolio
        current_allocation = await self._get_current_allocation(investor_id, portfolio_id)

        # Generate recommendations
        recommendations = []

        for i in range(recommendation_count):
            rec = await self._generate_single_recommendation(
                investor_id,
                portfolio_id,
                current_allocation,
                constraint_type,
                priority=i + 1
            )
            recommendations.append(rec)

        # Calculate portfolio summary
        portfolio_summary = self._calculate_portfolio_summary(current_allocation)

        return {
            "portfolio_id": portfolio_id or "PORT001",
            "recommendations": recommendations,
            "portfolio_summary": portfolio_summary,
            "model_version": model.version,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def _generate_single_recommendation(
        self,
        investor_id: str,
        portfolio_id: Optional[str],
        current_allocation: Dict,
        constraint_type: str,
        priority: int
    ) -> Dict:
        """Generate a single portfolio recommendation"""

        # Determine recommendation type based on priority
        rec_types = ["REBALANCING", "TACTICAL_SHIFT", "RISK_REDUCTION"]
        rec_type = rec_types[min(priority - 1, len(rec_types) - 1)]

        # Generate recommended allocation based on type
        if rec_type == "REBALANCING":
            recommended_allocation = self._optimize_rebalancing(current_allocation, constraint_type)
            reason = "Portfolio drift from target allocation due to market movements"
        elif rec_type == "TACTICAL_SHIFT":
            recommended_allocation = self._optimize_tactical_shift(current_allocation)
            reason = "Tactical opportunity based on current market conditions"
        else:  # RISK_REDUCTION
            recommended_allocation = self._optimize_risk_reduction(current_allocation)
            reason = "Risk reduction strategy to improve Sharpe ratio"

        # Calculate allocation changes
        changes = self._calculate_allocation_changes(current_allocation, recommended_allocation)

        # Calculate impact
        impact = self._calculate_impact_analysis(current_allocation, recommended_allocation)

        # Calculate costs
        costs = self._calculate_transaction_costs(changes)

        # Calculate probability of success
        prob_success = self._calculate_success_probability(rec_type, impact)

        # Create recommendation record
        recommendation = PortfolioRecommendation(
            recommendation_id=f"REC_{uuid.uuid4().hex[:12]}",
            model_id=self.optimization_model_id,
            investor_id=investor_id,
            portfolio_id=portfolio_id,
            recommendation_type=rec_type,
            current_allocation=current_allocation,
            recommended_allocation=recommended_allocation,
            allocation_changes=changes,
            reason_for_recommendation=reason,
            expected_return_improvement_pct=impact["return_improvement"],
            expected_risk_reduction_pct=impact["risk_reduction"],
            expected_diversification_improvement_pct=impact["diversification_improvement"],
            implementation_timeline="2 weeks",
            transaction_cost_usd=costs["transaction_cost"],
            estimated_tax_impact_usd=costs["tax_impact"],
            probability_of_success=prob_success,
            confidence_score=0.89,
            alternative_recommendations=[],
            created_timestamp=datetime.utcnow()
        )

        self.db.add(recommendation)
        self.db.commit()
        self.db.refresh(recommendation)

        return {
            "recommendation_id": recommendation.recommendation_id,
            "recommendation_type": rec_type,
            "priority": priority,
            "reason": reason,
            "current_allocation": current_allocation,
            "recommended_allocation": recommended_allocation,
            "changes": changes,
            "impact_analysis": {
                "expected_return_improvement": impact["return_improvement"],
                "expected_risk_reduction": impact["risk_reduction"],
                "diversification_improvement": impact["diversification_improvement"]
            },
            "costs": {
                "transaction_cost": float(costs["transaction_cost"]),
                "tax_impact": float(costs["tax_impact"]),
                "total_cost": float(costs["total_cost"])
            },
            "implementation_plan": {
                "timeline": "2 weeks",
                "suggested_execution_dates": [
                    (datetime.utcnow() + np.timedelta64(3, 'D')).isoformat(),
                    (datetime.utcnow() + np.timedelta64(10, 'D')).isoformat()
                ],
                "probability_of_success": prob_success
            },
            "confidence_score": 0.89
        }

    async def _get_current_allocation(self, investor_id: str, portfolio_id: Optional[str]) -> Dict:
        """Get current portfolio allocation"""
        # Placeholder - would query actual portfolio holdings
        return {
            "FUND001": 0.30,
            "FUND002": 0.45,
            "FUND003": 0.25
        }

    def _optimize_rebalancing(self, current: Dict, constraint_type: str) -> Dict:
        """Optimize portfolio through rebalancing"""
        # Simple rebalancing toward target allocations
        target = {
            "FUND001": 0.35,
            "FUND002": 0.40,
            "FUND003": 0.25
        }
        return target

    def _optimize_tactical_shift(self, current: Dict) -> Dict:
        """Generate tactical allocation shift"""
        # Slight tactical adjustments
        return {
            "FUND001": min(0.40, current.get("FUND001", 0.30) + 0.05),
            "FUND002": max(0.35, current.get("FUND002", 0.45) - 0.05),
            "FUND003": current.get("FUND003", 0.25)
        }

    def _optimize_risk_reduction(self, current: Dict) -> Dict:
        """Optimize for risk reduction"""
        # Shift toward more balanced allocation
        return {
            "FUND001": 0.33,
            "FUND002": 0.34,
            "FUND003": 0.33
        }

    def _calculate_allocation_changes(self, current: Dict, recommended: Dict) -> Dict:
        """Calculate changes in allocation"""
        changes = {}

        for fund_id in set(list(current.keys()) + list(recommended.keys())):
            current_pct = current.get(fund_id, 0)
            recommended_pct = recommended.get(fund_id, 0)
            diff = recommended_pct - current_pct

            if abs(diff) > 0.01:  # More than 1% change
                # Assuming $1M portfolio for calculation
                amount = diff * 1000000
                changes[fund_id] = {
                    "amount": abs(amount),
                    "direction": "increase" if diff > 0 else "decrease"
                }

        return changes

    def _calculate_impact_analysis(self, current: Dict, recommended: Dict) -> Dict:
        """Calculate expected impact of recommendation"""
        # Placeholder - would use historical returns and covariance matrix

        # Assume recommended allocation has better risk-adjusted returns
        return {
            "return_improvement": 0.015,  # 1.5%
            "risk_reduction": 0.022,      # 2.2%
            "diversification_improvement": 0.05  # 5%
        }

    def _calculate_transaction_costs(self, changes: Dict) -> Dict:
        """Calculate transaction costs and tax impact"""
        total_amount = sum(change["amount"] for change in changes.values())

        # Assume 0.5% transaction cost
        transaction_cost = total_amount * 0.005

        # Assume some tax impact from selling
        tax_impact = -total_amount * 0.002  # Negative = cost

        return {
            "transaction_cost": transaction_cost,
            "tax_impact": tax_impact,
            "total_cost": transaction_cost + abs(tax_impact)
        }

    def _calculate_success_probability(self, rec_type: str, impact: Dict) -> float:
        """Calculate probability of recommendation success"""
        # Higher impact = higher probability of achieving goals
        base_prob = {
            "REBALANCING": 0.92,
            "TACTICAL_SHIFT": 0.85,
            "RISK_REDUCTION": 0.90,
            "STRATEGIC_UPGRADE": 0.80
        }

        prob = base_prob.get(rec_type, 0.85)

        # Adjust based on expected impact
        if impact["return_improvement"] > 0.02:
            prob += 0.03

        return min(0.98, prob)

    def _calculate_portfolio_summary(self, allocation: Dict) -> Dict:
        """Calculate portfolio summary metrics"""
        # Placeholder - would calculate from actual holdings
        total_assets = 1500000.00

        return {
            "total_assets": total_assets,
            "current_sharpe_ratio": 0.95,
            "projected_sharpe_ratio": 1.08,
            "diversification_score": 0.75,
            "projected_diversification_score": 0.82
        }

    async def accept_recommendation(
        self,
        recommendation_id: str,
        acceptance_reason: Optional[str] = None
    ) -> Dict:
        """Accept a portfolio recommendation"""
        recommendation = self.db.query(PortfolioRecommendation).filter(
            PortfolioRecommendation.recommendation_id == recommendation_id
        ).first()

        if not recommendation:
            raise ValueError(f"Recommendation {recommendation_id} not found")

        recommendation.accepted = True
        recommendation.accepted_timestamp = datetime.utcnow()
        recommendation.acceptance_reason = acceptance_reason

        self.db.commit()
        self.db.refresh(recommendation)

        return {
            "recommendation_id": recommendation_id,
            "status": "accepted",
            "accepted_timestamp": recommendation.accepted_timestamp.isoformat()
        }

    async def start_implementation(self, recommendation_id: str) -> Dict:
        """Start implementation of accepted recommendation"""
        recommendation = self.db.query(PortfolioRecommendation).filter(
            PortfolioRecommendation.recommendation_id == recommendation_id
        ).first()

        if not recommendation:
            raise ValueError(f"Recommendation {recommendation_id} not found")

        if not recommendation.accepted:
            raise ValueError("Recommendation must be accepted before implementation")

        recommendation.implementation_started = True
        recommendation.implementation_start_date = datetime.utcnow()

        self.db.commit()
        self.db.refresh(recommendation)

        return {
            "recommendation_id": recommendation_id,
            "status": "implementation_started",
            "start_date": recommendation.implementation_start_date.isoformat()
        }
