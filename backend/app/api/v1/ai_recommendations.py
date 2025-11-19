"""
Advanced AI Phase 3 - Recommendation API Routes
API endpoints for portfolio optimization recommendations
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.services.ml.portfolio_optimizer import PortfolioOptimizer

router = APIRouter()


# Request/Response Models
class PortfolioOptimizationRequest(BaseModel):
    investor_id: str
    portfolio_id: Optional[str] = None
    recommendation_count: int = 3
    constraint_type: str = "MODERATE_RISK"  # CONSERVATIVE, MODERATE_RISK, AGGRESSIVE


class RecommendationAcceptanceRequest(BaseModel):
    recommendation_id: str
    acceptance_reason: Optional[str] = None


@router.post("/portfolio-optimization")
async def generate_portfolio_recommendations(
    request: PortfolioOptimizationRequest,
    db: Session = Depends(get_db)
):
    """
    Generate portfolio optimization recommendations using MPT + ML

    Returns:
    - Multiple recommendation options (rebalancing, tactical shifts, risk reduction)
    - Current vs recommended allocations
    - Expected impact analysis (return improvement, risk reduction, diversification)
    - Transaction costs and tax impact
    - Implementation plan with probability of success
    - Portfolio summary metrics
    """
    try:
        service = PortfolioOptimizer(db)
        result = await service.generate_recommendations(
            investor_id=request.investor_id,
            portfolio_id=request.portfolio_id,
            recommendation_count=request.recommendation_count,
            constraint_type=request.constraint_type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/accept-recommendation")
async def accept_recommendation(
    request: RecommendationAcceptanceRequest,
    db: Session = Depends(get_db)
):
    """Accept a portfolio recommendation"""
    try:
        service = PortfolioOptimizer(db)
        result = await service.accept_recommendation(
            recommendation_id=request.recommendation_id,
            acceptance_reason=request.acceptance_reason
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/start-implementation/{recommendation_id}")
async def start_recommendation_implementation(
    recommendation_id: str,
    db: Session = Depends(get_db)
):
    """Start implementation of an accepted recommendation"""
    try:
        service = PortfolioOptimizer(db)
        result = await service.start_implementation(
            recommendation_id=recommendation_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recommendation/{recommendation_id}")
async def get_recommendation(
    recommendation_id: str,
    db: Session = Depends(get_db)
):
    """Get recommendation details by ID"""
    from app.models.ai_model import PortfolioRecommendation

    recommendation = db.query(PortfolioRecommendation).filter(
        PortfolioRecommendation.recommendation_id == recommendation_id
    ).first()

    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    return {
        "recommendation_id": recommendation.recommendation_id,
        "investor_id": recommendation.investor_id,
        "recommendation_type": recommendation.recommendation_type,
        "reason": recommendation.reason_for_recommendation,
        "current_allocation": recommendation.current_allocation,
        "recommended_allocation": recommendation.recommended_allocation,
        "expected_return_improvement": recommendation.expected_return_improvement_pct,
        "expected_risk_reduction": recommendation.expected_risk_reduction_pct,
        "transaction_cost": float(recommendation.transaction_cost_usd) if recommendation.transaction_cost_usd else None,
        "accepted": recommendation.accepted,
        "implementation_started": recommendation.implementation_started,
        "implementation_completed": recommendation.implementation_completed,
        "actual_return_improvement": recommendation.actual_return_improvement_pct,
        "created_timestamp": recommendation.created_timestamp.isoformat()
    }


@router.get("/investor/{investor_id}/recommendations")
async def get_investor_recommendations(
    investor_id: str,
    status: Optional[str] = None,  # accepted, pending, implemented
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get all recommendations for an investor"""
    from app.models.ai_model import PortfolioRecommendation

    query = db.query(PortfolioRecommendation).filter(
        PortfolioRecommendation.investor_id == investor_id
    )

    # Filter by status if specified
    if status == "accepted":
        query = query.filter(PortfolioRecommendation.accepted == True)
    elif status == "pending":
        query = query.filter(PortfolioRecommendation.accepted == False)
    elif status == "implemented":
        query = query.filter(PortfolioRecommendation.implementation_completed == True)

    recommendations = query.order_by(
        PortfolioRecommendation.created_timestamp.desc()
    ).limit(limit).all()

    return {
        "investor_id": investor_id,
        "count": len(recommendations),
        "recommendations": [
            {
                "recommendation_id": r.recommendation_id,
                "recommendation_type": r.recommendation_type,
                "reason": r.reason_for_recommendation,
                "expected_return_improvement": r.expected_return_improvement_pct,
                "expected_risk_reduction": r.expected_risk_reduction_pct,
                "probability_of_success": r.probability_of_success,
                "accepted": r.accepted,
                "implementation_started": r.implementation_started,
                "created_timestamp": r.created_timestamp.isoformat()
            }
            for r in recommendations
        ]
    }


@router.get("/recommendations/performance-summary")
async def get_recommendations_performance_summary(
    days: int = 90,
    db: Session = Depends(get_db)
):
    """
    Get performance summary of recommendations
    (acceptance rate, implementation success, actual vs expected returns)
    """
    from app.models.ai_model import PortfolioRecommendation
    from datetime import datetime, timedelta

    start_date = datetime.utcnow() - timedelta(days=days)

    recommendations = db.query(PortfolioRecommendation).filter(
        PortfolioRecommendation.created_timestamp >= start_date
    ).all()

    total_recommendations = len(recommendations)
    accepted_recommendations = len([r for r in recommendations if r.accepted])
    implemented_recommendations = len([r for r in recommendations if r.implementation_completed])

    # Calculate actual performance for implemented recommendations
    implemented_with_results = [
        r for r in recommendations
        if r.implementation_completed and r.actual_return_improvement_pct is not None
    ]

    avg_expected_return = (
        sum(r.expected_return_improvement_pct for r in implemented_with_results) / len(implemented_with_results)
        if implemented_with_results else 0
    )

    avg_actual_return = (
        sum(r.actual_return_improvement_pct for r in implemented_with_results) / len(implemented_with_results)
        if implemented_with_results else 0
    )

    return {
        "period_days": days,
        "total_recommendations": total_recommendations,
        "acceptance_rate": accepted_recommendations / total_recommendations if total_recommendations > 0 else 0,
        "implementation_rate": implemented_recommendations / accepted_recommendations if accepted_recommendations > 0 else 0,
        "performance": {
            "recommendations_with_results": len(implemented_with_results),
            "average_expected_return_improvement": avg_expected_return,
            "average_actual_return_improvement": avg_actual_return,
            "prediction_accuracy": (avg_actual_return / avg_expected_return) if avg_expected_return > 0 else 0
        },
        "recommendation_types": {
            "REBALANCING": len([r for r in recommendations if r.recommendation_type == "REBALANCING"]),
            "TACTICAL_SHIFT": len([r for r in recommendations if r.recommendation_type == "TACTICAL_SHIFT"]),
            "RISK_REDUCTION": len([r for r in recommendations if r.recommendation_type == "RISK_REDUCTION"]),
            "STRATEGIC_UPGRADE": len([r for r in recommendations if r.recommendation_type == "STRATEGIC_UPGRADE"])
        }
    }
