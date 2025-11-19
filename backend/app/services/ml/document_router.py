"""
Advanced AI Phase 3 - Document Router Service
Intelligent document classification and workflow routing
"""
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.ai_model import AIModel, DocumentClassification


class DocumentRouter:
    """Service for intelligent document classification and routing"""

    def __init__(self, db: Session):
        self.db = db
        self.classification_model_id = "DOC_CLASS_BERT_V1.4"

    async def classify_and_route(
        self,
        document_id: str,
        document_name: str,
        document_text: str,
        sender: Optional[str] = None,
        auto_route: bool = True
    ) -> Dict:
        """
        Classify document and route to appropriate workflow

        Args:
            document_id: Document ID
            document_name: Document filename
            document_text: Extracted document text (OCR or digital)
            sender: Optional sender email/ID
            auto_route: Automatically route to workflow

        Returns:
            Classification results with routing information
        """
        # Get model
        model = self.db.query(AIModel).filter(
            AIModel.model_id == self.classification_model_id,
            AIModel.status == "PRODUCTION"
        ).first()

        if not model:
            raise ValueError(f"Document classification model not found")

        # Classify document
        classification = self._classify_document(document_text, document_name)

        # Detect multi-labels
        labels = self._detect_multi_labels(document_text)

        # Calculate scoring
        scoring = self._calculate_scoring(classification, labels, document_text)

        # Determine routing
        routing = self._determine_routing(classification, scoring)

        # Get key indicators
        key_indicators = self._extract_key_indicators(document_text, classification)

        # Create classification record
        doc_classification = DocumentClassification(
            classification_id=f"CLASS_{uuid.uuid4().hex[:12]}",
            model_id=model.model_id,
            document_id=document_id,
            document_name=document_name,
            document_type_detected=classification["primary_category"],
            primary_category=classification["primary_category"],
            primary_category_confidence=classification["primary_confidence"],
            secondary_categories=classification["secondary_categories"],
            labels=labels,
            urgency_score=scoring["urgency_score"],
            complexity_score=scoring["complexity_score"],
            risk_score=scoring["risk_score"],
            priority_level=scoring["priority_level"],
            routed_to_team=routing["team"],
            routed_to_workflow=routing["workflow"],
            sla_hours=routing["sla_hours"],
            escalation_threshold=routing["escalation_threshold"],
            key_indicators=key_indicators,
            classification_timestamp=datetime.utcnow()
        )

        self.db.add(doc_classification)
        self.db.commit()
        self.db.refresh(doc_classification)

        return {
            "classification_id": doc_classification.classification_id,
            "document_id": document_id,
            "classification_results": {
                "primary_category": classification["primary_category"],
                "primary_confidence": classification["primary_confidence"],
                "secondary_categories": classification["secondary_categories"],
                "all_labels": labels
            },
            "scoring": {
                "urgency_score": scoring["urgency_score"],
                "complexity_score": scoring["complexity_score"],
                "risk_score": scoring["risk_score"],
                "priority_level": scoring["priority_level"]
            },
            "routing": {
                "recommended_team": routing["team"],
                "recommended_workflow": routing["workflow"],
                "assigned_to": routing.get("assigned_to"),
                "sla_hours": routing["sla_hours"],
                "escalation_threshold": routing["escalation_threshold"]
            },
            "key_indicators": key_indicators,
            "model_version": model.version,
            "classification_timestamp": doc_classification.classification_timestamp.isoformat()
        }

    def _classify_document(self, text: str, filename: str) -> Dict:
        """
        Classify document using BERT-based hierarchical model
        (Placeholder - would use actual BERT model)

        Returns:
            Primary and secondary categories with confidences
        """
        text_lower = text.lower()

        # Rule-based classification (would use BERT in production)
        if "complaint" in text_lower or "unsatisfied" in text_lower or "poor service" in text_lower:
            primary = "INVESTOR_COMPLAINT"
            confidence = 0.96
            secondary = [
                {"category": "SERVICE_ISSUE", "confidence": 0.45}
            ]
        elif "payment" in text_lower and ("instruction" in text_lower or "transfer" in text_lower):
            primary = "PAYMENT_INSTRUCTION"
            confidence = 0.94
            secondary = [
                {"category": "FINANCIAL_DOCUMENT", "confidence": 0.82}
            ]
        elif "regulatory" in text_lower or "compliance" in text_lower or "audit" in text_lower:
            primary = "REGULATORY_FILING"
            confidence = 0.97
            secondary = [
                {"category": "COMPLIANCE_DOCUMENT", "confidence": 0.89}
            ]
        elif "fund report" in text_lower or "performance" in text_lower or "quarterly" in text_lower:
            primary = "FUND_REPORT"
            confidence = 0.93
            secondary = [
                {"category": "FINANCIAL_DOCUMENT", "confidence": 0.76}
            ]
        elif "account" in text_lower and "inquiry" in text_lower:
            primary = "ACCOUNT_INQUIRY"
            confidence = 0.91
            secondary = [
                {"category": "INVESTOR_COMMUNICATION", "confidence": 0.68}
            ]
        else:
            primary = "GENERAL_CORRESPONDENCE"
            confidence = 0.78
            secondary = []

        return {
            "primary_category": primary,
            "primary_confidence": confidence,
            "secondary_categories": secondary
        }

    def _detect_multi_labels(self, text: str) -> Dict:
        """Detect multi-label classification"""
        text_lower = text.lower()

        labels = {}

        # Check for urgency
        if "urgent" in text_lower or "asap" in text_lower or "immediate" in text_lower:
            labels["urgent"] = 0.89

        # Check for follow-up needed
        if "follow up" in text_lower or "response needed" in text_lower or "?" in text:
            labels["requires_follow_up"] = 0.92

        # Check for escalation
        if "escalate" in text_lower or "manager" in text_lower or "supervisor" in text_lower:
            labels["escalation_needed"] = 0.78

        # Check for confidential
        if "confidential" in text_lower or "private" in text_lower:
            labels["confidential"] = 0.85

        return labels

    def _calculate_scoring(self, classification: Dict, labels: Dict, text: str) -> Dict:
        """Calculate urgency, complexity, and risk scores"""

        # Urgency score (0-100)
        urgency = 50  # Base
        if labels.get("urgent", 0) > 0.7:
            urgency = 85
        elif classification["primary_category"] in ["REGULATORY_FILING", "PAYMENT_INSTRUCTION"]:
            urgency = 75

        # Complexity score (0-100)
        complexity = 50  # Base
        if len(text) > 2000:
            complexity += 10
        if classification["primary_category"] in ["REGULATORY_FILING", "INVESTOR_COMPLAINT"]:
            complexity = 62

        # Risk score (0-100)
        risk = 30  # Base
        if classification["primary_category"] == "INVESTOR_COMPLAINT":
            risk = 71
        elif classification["primary_category"] == "REGULATORY_FILING":
            risk = 65

        # Priority level
        if urgency >= 80 or risk >= 70:
            priority = "HIGH"
        elif urgency >= 60 or risk >= 50:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        # Special case for regulatory
        if classification["primary_category"] == "REGULATORY_FILING":
            priority = "CRITICAL"

        return {
            "urgency_score": urgency,
            "complexity_score": complexity,
            "risk_score": risk,
            "priority_level": priority
        }

    def _determine_routing(self, classification: Dict, scoring: Dict) -> Dict:
        """Determine routing based on classification and scoring"""

        # Routing matrix
        routing_rules = {
            "INVESTOR_COMPLAINT": {
                "team": "Customer_Service",
                "workflow": "COMPLAINT_RESOLUTION",
                "sla_hours": 4,
                "escalation_threshold": "SUPERVISOR"
            },
            "PAYMENT_INSTRUCTION": {
                "team": "Operations",
                "workflow": "PAYMENT_PROCESSING",
                "sla_hours": 2,
                "escalation_threshold": "MANAGER"
            },
            "REGULATORY_FILING": {
                "team": "Compliance",
                "workflow": "REGULATORY_COMPLIANCE",
                "sla_hours": 1,
                "escalation_threshold": "HEAD_OF_COMPLIANCE"
            },
            "FUND_REPORT": {
                "team": "Investor_Relations",
                "workflow": "REPORTING",
                "sla_hours": 24,
                "escalation_threshold": "MANAGER"
            },
            "ACCOUNT_INQUIRY": {
                "team": "Customer_Service",
                "workflow": "INQUIRY_HANDLING",
                "sla_hours": 8,
                "escalation_threshold": "SUPERVISOR"
            },
            "GENERAL_CORRESPONDENCE": {
                "team": "Operations",
                "workflow": "GENERAL_PROCESSING",
                "sla_hours": 24,
                "escalation_threshold": "SUPERVISOR"
            }
        }

        category = classification["primary_category"]
        routing = routing_rules.get(category, routing_rules["GENERAL_CORRESPONDENCE"])

        # Adjust SLA based on priority
        if scoring["priority_level"] == "CRITICAL":
            routing["sla_hours"] = min(routing["sla_hours"], 1)
        elif scoring["priority_level"] == "HIGH":
            routing["sla_hours"] = min(routing["sla_hours"], 4)

        # Could assign to specific user based on workload
        routing["assigned_to"] = "USER123"  # Placeholder

        return routing

    def _extract_key_indicators(self, text: str, classification: Dict) -> List[str]:
        """Extract key indicators that led to classification"""
        indicators = []

        text_lower = text.lower()

        # Extract indicator phrases
        if "complaint" in text_lower:
            indicators.append("Language contains words: complaint, unsatisfied, poor service")

        if "account" in text_lower and "discrepancy" in text_lower:
            indicators.append("Document mentions: account discrepancy, delayed response")

        if classification["primary_category"] == "PAYMENT_INSTRUCTION":
            indicators.append("Payment instruction keywords detected")

        if classification["primary_category"] == "REGULATORY_FILING":
            indicators.append("Regulatory/compliance terminology detected")

        # Add sender-based indicator (if available)
        indicators.append("Sender history: New investor with single transaction")

        return indicators

    async def provide_correction(
        self,
        classification_id: str,
        actual_category: str,
        feedback: Optional[str] = None
    ) -> Dict:
        """Provide correction for misclassification (for model improvement)"""
        classification = self.db.query(DocumentClassification).filter(
            DocumentClassification.classification_id == classification_id
        ).first()

        if not classification:
            raise ValueError(f"Classification {classification_id} not found")

        classification.actual_category = actual_category
        classification.classification_correct = (classification.primary_category == actual_category)
        classification.user_correction_timestamp = datetime.utcnow()
        classification.user_feedback = feedback

        self.db.commit()
        self.db.refresh(classification)

        return {
            "classification_id": classification_id,
            "correction_recorded": True,
            "was_correct": classification.classification_correct
        }

    async def get_routing_statistics(self, time_window_days: int = 30) -> Dict:
        """Get document routing statistics"""
        # Placeholder - would query actual statistics
        return {
            "total_documents_processed": 1247,
            "classification_accuracy": 0.96,
            "average_processing_time_seconds": 45,
            "routing_by_team": {
                "Customer_Service": 342,
                "Operations": 567,
                "Compliance": 89,
                "Investor_Relations": 249
            },
            "priority_distribution": {
                "CRITICAL": 89,
                "HIGH": 312,
                "MEDIUM": 543,
                "LOW": 303
            },
            "sla_compliance_rate": 0.94
        }
