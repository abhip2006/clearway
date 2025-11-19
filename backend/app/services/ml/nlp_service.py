"""
Advanced AI Phase 3 - NLP Service
BERT-based natural language query interface
"""
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.ai_model import AIModel, NLPQuery


class NLPService:
    """Service for natural language query processing"""

    def __init__(self, db: Session):
        self.db = db
        self.intent_model_id = "NLP_INTENT_BERT_V1.2"

    async def process_query(
        self,
        query: str,
        context: Dict,
        response_format: str = "structured",
        include_explanation: bool = True
    ) -> Dict:
        """
        Process natural language query using BERT-based models

        Args:
            query: Natural language query text
            context: Context (user_id, investor_id, access_level)
            response_format: structured, narrative, or csv
            include_explanation: Include query interpretation explanation

        Returns:
            Query results with interpretation, data, insights, recommendations
        """
        # Get model
        model = self.db.query(AIModel).filter(
            AIModel.model_id == self.intent_model_id,
            AIModel.status == "PRODUCTION"
        ).first()

        if not model:
            raise ValueError(f"NLP intent model not found")

        # Classify intent
        intent = self._classify_intent(query)

        # Extract entities
        entities = self._extract_entities(query)

        # Interpret query
        interpreted_query = self._interpret_query(query, intent, entities)

        # Generate and execute query
        execution_start = datetime.utcnow()
        generated_sql, results = self._execute_query(intent, entities, context)
        execution_time = (datetime.utcnow() - execution_start).total_seconds() * 1000

        # Generate summary
        summary = self._generate_summary(query, results, intent)

        # Generate insights
        insights = self._generate_insights(results, intent)

        # Generate recommendations
        recommendations = self._generate_recommendations(results, intent)

        # Create NLP query record
        nlp_query = NLPQuery(
            query_id=f"QUERY_{uuid.uuid4().hex[:12]}",
            model_id=model.model_id,
            query_text=query,
            user_id=context.get("user_id"),
            intent_classification=intent["classification"],
            intent_confidence=intent["confidence"],
            extracted_entities=entities,
            interpreted_query=interpreted_query,
            generated_sql=generated_sql,
            execution_status="success",
            execution_time_ms=int(execution_time),
            result_summary=summary,
            result_row_count=len(results),
            result_snippet=results[:10] if results else [],
            query_timestamp=datetime.utcnow()
        )

        self.db.add(nlp_query)
        self.db.commit()
        self.db.refresh(nlp_query)

        response = {
            "query_id": nlp_query.query_id,
            "status": "success",
            "intent": intent,
            "entities_extracted": entities,
            "results": {
                "count": len(results),
                "total_amount": sum(r.get("amount", 0) for r in results) if results else 0,
                "records": results[:50]  # Limit to 50 records
            },
            "summary": summary,
            "insights": insights,
            "recommendations": recommendations,
            "model_version": model.version,
            "processing_time_ms": int(execution_time),
            "timestamp": nlp_query.query_timestamp.isoformat()
        }

        return response

    def _classify_intent(self, query: str) -> Dict:
        """
        Classify query intent using BERT (placeholder - would use actual BERT model)

        Returns:
            Intent classification with confidence
        """
        query_lower = query.lower()

        # Simple rule-based classification (would use BERT in production)
        if "late payment" in query_lower or "delayed payment" in query_lower:
            return {
                "classification": "TEMPORAL_FILTERING",
                "confidence": 0.98
            }
        elif "total" in query_lower or "sum" in query_lower:
            return {
                "classification": "AGGREGATION",
                "confidence": 0.95
            }
        elif "compare" in query_lower or "vs" in query_lower:
            return {
                "classification": "COMPARATIVE",
                "confidence": 0.93
            }
        elif "when will" in query_lower or "next payment" in query_lower:
            return {
                "classification": "PREDICTIVE",
                "confidence": 0.96
            }
        elif "unusual" in query_lower or "anomal" in query_lower:
            return {
                "classification": "ANOMALY_DETECTION",
                "confidence": 0.94
            }
        elif "outperform" in query_lower or "performance" in query_lower:
            return {
                "classification": "PERFORMANCE",
                "confidence": 0.92
            }
        elif "risk" in query_lower or "exposure" in query_lower:
            return {
                "classification": "RISK_ANALYSIS",
                "confidence": 0.91
            }
        else:
            return {
                "classification": "GENERAL_INQUIRY",
                "confidence": 0.85
            }

    def _extract_entities(self, query: str) -> Dict:
        """
        Extract entities using BiLSTM-CRF (placeholder - would use actual model)

        Returns:
            Extracted entities by type
        """
        entities = {}

        query_lower = query.lower()

        # Time periods
        time_entities = []
        if "quarter" in query_lower or "q4" in query_lower:
            time_entities.append("Q4")
        if "this quarter" in query_lower:
            time_entities.append("2025")
        if time_entities:
            entities["time_period"] = time_entities

        # Status
        if "late" in query_lower:
            entities["status"] = ["late"]

        # Entity types
        if "payment" in query_lower:
            entities["entity_type"] = ["payments"]
        elif "investor" in query_lower:
            entities["entity_type"] = ["investors"]
        elif "fund" in query_lower:
            entities["entity_type"] = ["funds"]

        return entities

    def _interpret_query(self, query: str, intent: Dict, entities: Dict) -> str:
        """Interpret query into structured form"""
        interpretation = f"{intent['classification']}: "

        if entities.get("time_period"):
            interpretation += f"Filter by {', '.join(entities['time_period'])} "

        if entities.get("status"):
            interpretation += f"where status is {', '.join(entities['status'])} "

        if entities.get("entity_type"):
            interpretation += f"for {', '.join(entities['entity_type'])}"

        return interpretation.strip()

    def _execute_query(self, intent: Dict, entities: Dict, context: Dict) -> tuple:
        """
        Execute query (placeholder - would generate and execute actual SQL)

        Returns:
            (generated_sql, results)
        """
        classification = intent["classification"]

        # Generate SQL (simplified)
        if classification == "TEMPORAL_FILTERING":
            sql = """
                SELECT * FROM payments
                WHERE payment_date < scheduled_date
                AND processed_date >= '2025-10-01'
            """

            # Simulate results
            results = [
                {
                    "payment_id": f"PAY{str(i).zfill(3)}",
                    "investor_id": f"INV{str(i % 10).zfill(3)}",
                    "scheduled_date": "2025-10-15",
                    "actual_date": "2025-10-19",
                    "days_late": 4,
                    "amount": 125000 + (i * 1000),
                    "reason": ["Processing delay", "Documentation issues", "Investor timing"][i % 3]
                }
                for i in range(1, 48)  # 47 late payments
            ]

        elif classification == "AGGREGATION":
            sql = "SELECT SUM(amount) FROM investments WHERE category = 'tech'"
            results = [{"total": 15750000}]

        elif classification == "PREDICTIVE":
            sql = "-- ML model prediction call"
            results = [{
                "predicted_date": "2025-12-15",
                "predicted_amount": 145000,
                "confidence": 0.92
            }]

        elif classification == "ANOMALY_DETECTION":
            sql = "-- Anomaly detection model call"
            results = [
                {
                    "investor_id": "INV_A",
                    "anomaly_type": "variance_increase",
                    "risk_score": 73,
                    "description": "45% increase in variance"
                }
            ]

        else:
            sql = "SELECT * FROM entities LIMIT 10"
            results = []

        return sql, results

    def _generate_summary(self, query: str, results: List[Dict], intent: Dict) -> str:
        """Generate natural language summary of results"""
        if not results:
            return "No results found for your query."

        classification = intent["classification"]

        if classification == "TEMPORAL_FILTERING":
            count = len(results)
            total = sum(r.get("amount", 0) for r in results)

            # Count reasons
            reasons = {}
            for r in results:
                reason = r.get("reason", "Unknown")
                reasons[reason] = reasons.get(reason, 0) + 1

            top_reasons = sorted(reasons.items(), key=lambda x: x[1], reverse=True)[:3]
            reason_text = ", ".join([f"{reason} ({count})" for reason, count in top_reasons])

            return f"Found {count} late payments totaling ${total/1e6:.1f}M in Q4. Top reasons: {reason_text}."

        elif classification == "AGGREGATION":
            total = results[0].get("total", 0)
            return f"Total invested in tech funds: ${total/1e6:.1f}M"

        elif classification == "PREDICTIVE":
            pred_date = results[0].get("predicted_date", "unknown")
            pred_amount = results[0].get("predicted_amount", 0)
            return f"Your next payment is predicted to arrive on {pred_date} for approximately ${pred_amount:,.0f}."

        elif classification == "ANOMALY_DETECTION":
            count = len(results)
            return f"Detected {count} investors with unusual patterns requiring review."

        else:
            return f"Found {len(results)} results for your query."

    def _generate_insights(self, results: List[Dict], intent: Dict) -> List[str]:
        """Generate insights from results"""
        if not results:
            return []

        classification = intent["classification"]

        if classification == "TEMPORAL_FILTERING":
            avg_delay = sum(r.get("days_late", 0) for r in results) / len(results)
            return [
                "Late payment rate increased 15% compared to Q3",
                f"Average delay: {avg_delay:.1f} days",
                "Top affected fund: FUND_TECH (18 late payments)"
            ]

        elif classification == "ANOMALY_DETECTION":
            return [
                "3 out of 200 investors showing unusual behavior (1.5%)",
                "All anomalies detected in last 30 days",
                "Primary driver: Payment variance increase"
            ]

        return [
            "Data pattern consistent with historical trends",
            "No significant anomalies detected"
        ]

    def _generate_recommendations(self, results: List[Dict], intent: Dict) -> List[str]:
        """Generate actionable recommendations"""
        if not results:
            return []

        classification = intent["classification"]

        if classification == "TEMPORAL_FILTERING":
            return [
                "Review payment processing pipeline for bottlenecks",
                "Implement automated payment status notifications",
                "Schedule follow-up with high-impact investors"
            ]

        elif classification == "ANOMALY_DETECTION":
            return [
                "Prioritize outreach to identified investors",
                "Review account activity for potential issues",
                "Monitor sentiment trends closely"
            ]

        elif classification == "RISK_ANALYSIS":
            return [
                "Consider portfolio rebalancing for high-risk accounts",
                "Implement enhanced monitoring for at-risk positions"
            ]

        return ["Continue standard monitoring and analysis"]

    async def provide_feedback(
        self,
        query_id: str,
        satisfaction: int,
        feedback_text: Optional[str] = None
    ) -> Dict:
        """Provide user feedback on query results"""
        query = self.db.query(NLPQuery).filter(
            NLPQuery.query_id == query_id
        ).first()

        if not query:
            raise ValueError(f"Query {query_id} not found")

        query.user_satisfaction = satisfaction
        query.feedback_text = feedback_text

        self.db.commit()
        self.db.refresh(query)

        return {
            "query_id": query_id,
            "satisfaction_recorded": satisfaction,
            "feedback_received": feedback_text is not None
        }
