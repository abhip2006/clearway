"""
Advanced AI Phase 3 - Sentiment Analysis API Routes
API endpoints for investor communication sentiment analysis
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.services.ml.sentiment_analyzer import SentimentAnalyzer

router = APIRouter()


# Request/Response Models
class SentimentAnalysisRequest(BaseModel):
    investor_id: str
    communication_text: str
    communication_type: str = "EMAIL"  # EMAIL, PHONE, SUPPORT_TICKET, MEETING
    communication_id: Optional[str] = None
    include_aspects: bool = True
    include_trend: bool = True


@router.post("/analyze")
async def analyze_sentiment(
    request: SentimentAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze investor communication sentiment using RoBERTa

    Returns:
    - Overall sentiment (score -1 to 1, category, confidence)
    - Emotions (confident, concerned, frustrated, satisfied, neutral)
    - Aspect-based sentiments (returns, risk, service, communication, support)
    - Intent classification (complaint, compliment, question, request, suggestion)
    - Sentiment trends (30-day, 90-day, volatility)
    - Risk indicators (churn risk, complaint risk, escalation risk)
    - Recommended actions
    """
    try:
        service = SentimentAnalyzer(db)
        result = await service.analyze_communication(
            investor_id=request.investor_id,
            communication_text=request.communication_text,
            communication_type=request.communication_type,
            communication_id=request.communication_id,
            include_aspects=request.include_aspects,
            include_trend=request.include_trend
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/{analysis_id}")
async def get_sentiment_analysis(
    analysis_id: str,
    db: Session = Depends(get_db)
):
    """Get sentiment analysis by ID"""
    from app.models.ai_model import SentimentAnalysis

    analysis = db.query(SentimentAnalysis).filter(
        SentimentAnalysis.analysis_id == analysis_id
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Sentiment analysis not found")

    return {
        "analysis_id": analysis.analysis_id,
        "investor_id": analysis.investor_id,
        "sentiment_score": analysis.sentiment_score,
        "sentiment_category": analysis.sentiment_category,
        "sentiment_confidence": analysis.sentiment_confidence,
        "emotions": analysis.emotions,
        "primary_emotion": analysis.primary_emotion,
        "aspect_sentiments": analysis.aspect_sentiments,
        "intent": analysis.intent,
        "intent_confidence": analysis.intent_confidence,
        "sentiment_trend_30d": analysis.sentiment_trend_30d,
        "sentiment_trend_90d": analysis.sentiment_trend_90d,
        "churn_risk_score": analysis.churn_risk_score,
        "complaint_risk": analysis.complaint_risk,
        "escalation_risk": analysis.escalation_risk,
        "recommended_actions": analysis.recommended_actions,
        "communication_channel": analysis.communication_channel,
        "analysis_timestamp": analysis.analysis_timestamp.isoformat()
    }


@router.get("/investor/{investor_id}/sentiment")
async def get_investor_sentiment(
    investor_id: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get sentiment analysis history for an investor"""
    from app.models.ai_model import SentimentAnalysis

    analyses = db.query(SentimentAnalysis).filter(
        SentimentAnalysis.investor_id == investor_id
    ).order_by(SentimentAnalysis.analysis_timestamp.desc()).limit(limit).all()

    return {
        "investor_id": investor_id,
        "count": len(analyses),
        "sentiment_history": [
            {
                "analysis_id": a.analysis_id,
                "sentiment_score": a.sentiment_score,
                "sentiment_category": a.sentiment_category,
                "primary_emotion": a.primary_emotion,
                "intent": a.intent,
                "churn_risk_score": a.churn_risk_score,
                "communication_channel": a.communication_channel,
                "timestamp": a.analysis_timestamp.isoformat()
            }
            for a in analyses
        ]
    }


@router.get("/investor/{investor_id}/sentiment-summary")
async def get_investor_sentiment_summary(
    investor_id: str,
    days: int = 90,
    db: Session = Depends(get_db)
):
    """
    Get comprehensive sentiment summary for an investor
    (current sentiment, trends, aggregates, churn risk)
    """
    try:
        service = SentimentAnalyzer(db)
        result = await service.get_investor_sentiment_summary(
            investor_id=investor_id,
            days=days
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/high-risk-investors")
async def get_high_risk_investors(
    churn_risk_threshold: int = 50,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get investors with high churn risk based on sentiment analysis
    """
    from app.models.ai_model import SentimentAnalysis
    from sqlalchemy import func

    # Get latest sentiment analysis for each investor
    subquery = db.query(
        SentimentAnalysis.investor_id,
        func.max(SentimentAnalysis.analysis_timestamp).label('latest_timestamp')
    ).group_by(SentimentAnalysis.investor_id).subquery()

    high_risk_analyses = db.query(SentimentAnalysis).join(
        subquery,
        (SentimentAnalysis.investor_id == subquery.c.investor_id) &
        (SentimentAnalysis.analysis_timestamp == subquery.c.latest_timestamp)
    ).filter(
        SentimentAnalysis.churn_risk_score >= churn_risk_threshold
    ).order_by(
        SentimentAnalysis.churn_risk_score.desc()
    ).limit(limit).all()

    return {
        "churn_risk_threshold": churn_risk_threshold,
        "count": len(high_risk_analyses),
        "high_risk_investors": [
            {
                "investor_id": a.investor_id,
                "churn_risk_score": a.churn_risk_score,
                "sentiment_score": a.sentiment_score,
                "sentiment_category": a.sentiment_category,
                "sentiment_trend_30d": a.sentiment_trend_30d,
                "primary_emotion": a.primary_emotion,
                "complaint_risk": a.complaint_risk,
                "escalation_risk": a.escalation_risk,
                "recommended_actions": a.recommended_actions,
                "last_analysis": a.analysis_timestamp.isoformat()
            }
            for a in high_risk_analyses
        ]
    }


@router.get("/sentiment-trends")
async def get_sentiment_trends(
    days: int = 90,
    db: Session = Depends(get_db)
):
    """
    Get overall sentiment trends across all investors
    """
    from app.models.ai_model import SentimentAnalysis
    from datetime import datetime, timedelta
    from sqlalchemy import func

    start_date = datetime.utcnow() - timedelta(days=days)

    analyses = db.query(SentimentAnalysis).filter(
        SentimentAnalysis.analysis_timestamp >= start_date
    ).all()

    if not analyses:
        return {
            "period_days": days,
            "total_analyses": 0
        }

    # Calculate aggregates
    total = len(analyses)
    avg_sentiment = sum(a.sentiment_score for a in analyses) / total
    avg_churn_risk = sum(a.churn_risk_score for a in analyses) / total

    # Category distribution
    category_counts = {}
    for a in analyses:
        cat = a.sentiment_category
        category_counts[cat] = category_counts.get(cat, 0) + 1

    # Intent distribution
    intent_counts = {}
    for a in analyses:
        intent = a.intent
        intent_counts[intent] = intent_counts.get(intent, 0) + 1

    # Risk indicators
    high_churn_risk = len([a for a in analyses if a.churn_risk_score >= 50])
    complaint_risk_count = len([a for a in analyses if a.complaint_risk])
    escalation_risk_count = len([a for a in analyses if a.escalation_risk])

    return {
        "period_days": days,
        "total_analyses": total,
        "average_sentiment_score": avg_sentiment,
        "average_churn_risk_score": avg_churn_risk,
        "sentiment_distribution": {
            "HIGHLY_POSITIVE": category_counts.get("HIGHLY_POSITIVE", 0) / total if total > 0 else 0,
            "POSITIVE": category_counts.get("POSITIVE", 0) / total if total > 0 else 0,
            "NEUTRAL": category_counts.get("NEUTRAL", 0) / total if total > 0 else 0,
            "NEGATIVE": category_counts.get("NEGATIVE", 0) / total if total > 0 else 0,
            "HIGHLY_NEGATIVE": category_counts.get("HIGHLY_NEGATIVE", 0) / total if total > 0 else 0
        },
        "intent_distribution": intent_counts,
        "risk_indicators": {
            "high_churn_risk_count": high_churn_risk,
            "high_churn_risk_percentage": high_churn_risk / total if total > 0 else 0,
            "complaint_risk_count": complaint_risk_count,
            "escalation_risk_count": escalation_risk_count
        }
    }


@router.get("/aspect-sentiments")
async def get_aspect_sentiments(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get aggregated aspect-based sentiments
    (Returns, Risk, Service, Communication, Support)
    """
    from app.models.ai_model import SentimentAnalysis
    from datetime import datetime, timedelta

    start_date = datetime.utcnow() - timedelta(days=days)

    analyses = db.query(SentimentAnalysis).filter(
        SentimentAnalysis.analysis_timestamp >= start_date,
        SentimentAnalysis.aspect_sentiments.isnot(None)
    ).all()

    if not analyses:
        return {
            "period_days": days,
            "analyses_with_aspects": 0
        }

    # Aggregate aspect sentiments
    aspect_aggregates = {
        "returns": [],
        "risk": [],
        "service": [],
        "communication": [],
        "support": []
    }

    for a in analyses:
        aspects = a.aspect_sentiments or {}
        for aspect_name, aspect_data in aspects.items():
            if aspect_name in aspect_aggregates and isinstance(aspect_data, dict):
                score = aspect_data.get("score")
                if score is not None:
                    aspect_aggregates[aspect_name].append(score)

    # Calculate averages
    aspect_results = {}
    for aspect, scores in aspect_aggregates.items():
        if scores:
            avg_score = sum(scores) / len(scores)
            category = (
                "POSITIVE" if avg_score > 0.3 else
                "NEGATIVE" if avg_score < -0.3 else
                "NEUTRAL"
            )
            aspect_results[aspect] = {
                "average_score": avg_score,
                "category": category,
                "sample_size": len(scores)
            }
        else:
            aspect_results[aspect] = {
                "average_score": 0,
                "category": "NEUTRAL",
                "sample_size": 0
            }

    return {
        "period_days": days,
        "analyses_with_aspects": len(analyses),
        "aspect_sentiments": aspect_results
    }
