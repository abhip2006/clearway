"""
Advanced AI Phase 3 - Document Classification API Routes
API endpoints for intelligent document classification and routing
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.services.ml.document_router import DocumentRouter

router = APIRouter()


# Request/Response Models
class DocumentClassificationRequest(BaseModel):
    document_id: str
    document_name: str
    document_text: str
    sender: Optional[str] = None
    auto_route: bool = True


class DocumentCorrectionRequest(BaseModel):
    classification_id: str
    actual_category: str
    feedback: Optional[str] = None


@router.post("/classify-route")
async def classify_and_route_document(
    document_id: str = Form(...),
    document_name: str = Form(...),
    document_text: str = Form(...),
    sender: Optional[str] = Form(None),
    auto_route: bool = Form(True),
    db: Session = Depends(get_db)
):
    """
    Classify document and route to appropriate workflow

    Document Types Supported:
    - Investor Communications (inquiries, complaints, amendments)
    - Regulatory Documents (filings, compliance reports, audits)
    - Financial Documents (payment instructions, confirmations, reports)
    - Operational Documents (memos, process updates, escalations)

    Returns:
    - Primary and secondary classifications with confidence
    - Multi-label classifications
    - Urgency, complexity, and risk scores
    - Routing information (team, workflow, SLA)
    - Key indicators for classification
    """
    try:
        service = DocumentRouter(db)
        result = await service.classify_and_route(
            document_id=document_id,
            document_name=document_name,
            document_text=document_text,
            sender=sender,
            auto_route=auto_route
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classify-route-file")
async def classify_document_file(
    document: UploadFile = File(...),
    sender: Optional[str] = Form(None),
    auto_route: bool = Form(True),
    db: Session = Depends(get_db)
):
    """
    Upload and classify a document file

    Supports: PDF, TXT, DOCX
    Automatically extracts text using OCR if needed
    """
    try:
        # Read file content
        content = await document.read()

        # Extract text (placeholder - would use OCR/text extraction)
        # For now, assuming text file
        document_text = content.decode('utf-8', errors='ignore')

        # Generate document ID
        import uuid
        document_id = f"DOC_{uuid.uuid4().hex[:12]}"

        service = DocumentRouter(db)
        result = await service.classify_and_route(
            document_id=document_id,
            document_name=document.filename,
            document_text=document_text,
            sender=sender,
            auto_route=auto_route
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/correction")
async def provide_classification_correction(
    request: DocumentCorrectionRequest,
    db: Session = Depends(get_db)
):
    """Provide correction for misclassification (for model improvement)"""
    try:
        service = DocumentRouter(db)
        result = await service.provide_correction(
            classification_id=request.classification_id,
            actual_category=request.actual_category,
            feedback=request.feedback
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/classification/{classification_id}")
async def get_classification(
    classification_id: str,
    db: Session = Depends(get_db)
):
    """Get document classification by ID"""
    from app.models.ai_model import DocumentClassification

    classification = db.query(DocumentClassification).filter(
        DocumentClassification.classification_id == classification_id
    ).first()

    if not classification:
        raise HTTPException(status_code=404, detail="Classification not found")

    return {
        "classification_id": classification.classification_id,
        "document_id": classification.document_id,
        "document_name": classification.document_name,
        "primary_category": classification.primary_category,
        "primary_confidence": classification.primary_category_confidence,
        "secondary_categories": classification.secondary_categories,
        "labels": classification.labels,
        "urgency_score": classification.urgency_score,
        "complexity_score": classification.complexity_score,
        "risk_score": classification.risk_score,
        "priority_level": classification.priority_level,
        "routed_to_team": classification.routed_to_team,
        "routed_to_workflow": classification.routed_to_workflow,
        "sla_hours": classification.sla_hours,
        "classification_correct": classification.classification_correct,
        "actual_category": classification.actual_category,
        "classification_timestamp": classification.classification_timestamp.isoformat()
    }


@router.get("/document/{document_id}/classifications")
async def get_document_classifications(
    document_id: str,
    db: Session = Depends(get_db)
):
    """Get all classifications for a document"""
    from app.models.ai_model import DocumentClassification

    classifications = db.query(DocumentClassification).filter(
        DocumentClassification.document_id == document_id
    ).order_by(DocumentClassification.classification_timestamp.desc()).all()

    return {
        "document_id": document_id,
        "count": len(classifications),
        "classifications": [
            {
                "classification_id": c.classification_id,
                "primary_category": c.primary_category,
                "confidence": c.primary_category_confidence,
                "priority_level": c.priority_level,
                "routed_to_team": c.routed_to_team,
                "classification_correct": c.classification_correct,
                "timestamp": c.classification_timestamp.isoformat()
            }
            for c in classifications
        ]
    }


@router.get("/routing-statistics")
async def get_routing_statistics(
    time_window_days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get document routing statistics
    (total processed, accuracy, processing time, team distribution, SLA compliance)
    """
    try:
        service = DocumentRouter(db)
        result = await service.get_routing_statistics(
            time_window_days=time_window_days
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{team_name}/documents")
async def get_team_documents(
    team_name: str,
    priority: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get documents routed to a specific team"""
    from app.models.ai_model import DocumentClassification

    query = db.query(DocumentClassification).filter(
        DocumentClassification.routed_to_team == team_name
    )

    if priority:
        query = query.filter(DocumentClassification.priority_level == priority)

    documents = query.order_by(
        DocumentClassification.classification_timestamp.desc()
    ).limit(limit).all()

    return {
        "team_name": team_name,
        "priority_filter": priority,
        "count": len(documents),
        "documents": [
            {
                "classification_id": d.classification_id,
                "document_id": d.document_id,
                "document_name": d.document_name,
                "primary_category": d.primary_category,
                "priority_level": d.priority_level,
                "urgency_score": d.urgency_score,
                "sla_hours": d.sla_hours,
                "routed_workflow": d.routed_to_workflow,
                "classification_timestamp": d.classification_timestamp.isoformat()
            }
            for d in documents
        ]
    }


@router.get("/analytics/classification-accuracy")
async def get_classification_accuracy(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Get classification accuracy metrics with user corrections"""
    from app.models.ai_model import DocumentClassification
    from datetime import datetime, timedelta

    start_date = datetime.utcnow() - timedelta(days=days)

    classifications = db.query(DocumentClassification).filter(
        DocumentClassification.classification_timestamp >= start_date
    ).all()

    total = len(classifications)
    with_corrections = [c for c in classifications if c.actual_category is not None]
    correct = [c for c in with_corrections if c.classification_correct]

    accuracy = len(correct) / len(with_corrections) if with_corrections else 0

    # Category breakdown
    category_stats = {}
    for c in with_corrections:
        cat = c.primary_category
        if cat not in category_stats:
            category_stats[cat] = {"total": 0, "correct": 0}
        category_stats[cat]["total"] += 1
        if c.classification_correct:
            category_stats[cat]["correct"] += 1

    return {
        "period_days": days,
        "total_classifications": total,
        "classifications_with_feedback": len(with_corrections),
        "overall_accuracy": accuracy,
        "feedback_rate": len(with_corrections) / total if total > 0 else 0,
        "category_accuracy": {
            cat: {
                "accuracy": stats["correct"] / stats["total"] if stats["total"] > 0 else 0,
                "sample_size": stats["total"]
            }
            for cat, stats in category_stats.items()
        }
    }
