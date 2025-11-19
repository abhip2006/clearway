"""
Advanced AI Phase 3 - NLP API Routes
API endpoints for natural language queries
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict
from pydantic import BaseModel

from app.db.session import get_db
from app.services.ml.nlp_service import NLPService

router = APIRouter()


# Request/Response Models
class NLPQueryRequest(BaseModel):
    query: str
    context: Dict
    response_format: str = "structured"  # structured, narrative, csv
    include_explanation: bool = True


class NLPFeedbackRequest(BaseModel):
    query_id: str
    satisfaction: int  # 1-5 stars
    feedback_text: Optional[str] = None


@router.post("/query")
async def process_nlp_query(
    request: NLPQueryRequest,
    db: Session = Depends(get_db)
):
    """
    Process natural language query using BERT-based models

    Supports query types:
    - Temporal queries: "Show me all late payments this quarter"
    - Aggregation queries: "What's the total invested in tech funds?"
    - Comparative queries: "How do US funds compare to international?"
    - Predictive queries: "When will my next payment arrive?"
    - Anomaly queries: "Which investors have unusual payment patterns?"
    - Performance queries: "Which funds outperformed benchmarks?"
    - Risk queries: "What's my exposure to default risk?"
    - Trend queries: "How has investor sentiment changed?"

    Returns:
    - Query interpretation (intent, entities)
    - Results (data matching query)
    - Natural language summary
    - Insights and recommendations
    - Processing time
    """
    try:
        service = NLPService(db)
        result = await service.process_query(
            query=request.query,
            context=request.context,
            response_format=request.response_format,
            include_explanation=request.include_explanation
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback")
async def provide_query_feedback(
    request: NLPFeedbackRequest,
    db: Session = Depends(get_db)
):
    """Provide user feedback on query results for model improvement"""
    try:
        service = NLPService(db)
        result = await service.provide_feedback(
            query_id=request.query_id,
            satisfaction=request.satisfaction,
            feedback_text=request.feedback_text
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/query/{query_id}")
async def get_query_result(
    query_id: str,
    db: Session = Depends(get_db)
):
    """Get NLP query results by ID"""
    from app.models.ai_model import NLPQuery

    query = db.query(NLPQuery).filter(
        NLPQuery.query_id == query_id
    ).first()

    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    return {
        "query_id": query.query_id,
        "query_text": query.query_text,
        "intent_classification": query.intent_classification,
        "intent_confidence": query.intent_confidence,
        "extracted_entities": query.extracted_entities,
        "execution_status": query.execution_status,
        "result_summary": query.result_summary,
        "result_row_count": query.result_row_count,
        "result_snippet": query.result_snippet,
        "user_satisfaction": query.user_satisfaction,
        "execution_time_ms": query.execution_time_ms,
        "query_timestamp": query.query_timestamp.isoformat()
    }


@router.get("/user/{user_id}/queries")
async def get_user_queries(
    user_id: str,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get query history for a user"""
    from app.models.ai_model import NLPQuery

    queries = db.query(NLPQuery).filter(
        NLPQuery.user_id == user_id
    ).order_by(NLPQuery.query_timestamp.desc()).limit(limit).all()

    return {
        "user_id": user_id,
        "count": len(queries),
        "queries": [
            {
                "query_id": q.query_id,
                "query_text": q.query_text,
                "intent": q.intent_classification,
                "status": q.execution_status,
                "result_count": q.result_row_count,
                "satisfaction": q.user_satisfaction,
                "timestamp": q.query_timestamp.isoformat()
            }
            for q in queries
        ]
    }


@router.get("/analytics/query-performance")
async def get_query_performance_analytics(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get NLP query performance analytics
    (accuracy, popular intents, user satisfaction, etc.)
    """
    from app.models.ai_model import NLPQuery
    from datetime import datetime, timedelta

    start_date = datetime.utcnow() - timedelta(days=days)

    queries = db.query(NLPQuery).filter(
        NLPQuery.query_timestamp >= start_date
    ).all()

    if not queries:
        return {
            "period_days": days,
            "total_queries": 0
        }

    # Calculate metrics
    total_queries = len(queries)
    successful_queries = len([q for q in queries if q.execution_status == "success"])
    queries_with_feedback = [q for q in queries if q.user_satisfaction is not None]

    avg_satisfaction = (
        sum(q.user_satisfaction for q in queries_with_feedback) / len(queries_with_feedback)
        if queries_with_feedback else 0
    )

    avg_execution_time = (
        sum(q.execution_time_ms for q in queries) / len(queries)
        if queries else 0
    )

    # Intent distribution
    intent_counts = {}
    for q in queries:
        intent = q.intent_classification
        intent_counts[intent] = intent_counts.get(intent, 0) + 1

    return {
        "period_days": days,
        "total_queries": total_queries,
        "success_rate": successful_queries / total_queries if total_queries > 0 else 0,
        "average_satisfaction": avg_satisfaction,
        "feedback_rate": len(queries_with_feedback) / total_queries if total_queries > 0 else 0,
        "average_execution_time_ms": avg_execution_time,
        "intent_distribution": dict(sorted(intent_counts.items(), key=lambda x: x[1], reverse=True)),
        "top_intents": list(dict(sorted(intent_counts.items(), key=lambda x: x[1], reverse=True)[:5]).keys())
    }


@router.get("/popular-queries")
async def get_popular_queries(
    days: int = 30,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get most popular query patterns"""
    from app.models.ai_model import NLPQuery
    from datetime import datetime, timedelta

    start_date = datetime.utcnow() - timedelta(days=days)

    queries = db.query(NLPQuery).filter(
        NLPQuery.query_timestamp >= start_date
    ).all()

    # Group similar queries (simplified - would use clustering in production)
    query_patterns = {}
    for q in queries:
        # Simplify to first few words
        pattern = ' '.join(q.query_text.lower().split()[:5])
        if pattern not in query_patterns:
            query_patterns[pattern] = {
                "example": q.query_text,
                "count": 0,
                "intent": q.intent_classification
            }
        query_patterns[pattern]["count"] += 1

    # Sort by frequency
    popular = sorted(query_patterns.items(), key=lambda x: x[1]["count"], reverse=True)[:limit]

    return {
        "period_days": days,
        "popular_queries": [
            {
                "pattern": pattern,
                "example": data["example"],
                "count": data["count"],
                "intent": data["intent"]
            }
            for pattern, data in popular
        ]
    }
