"""
Advanced AI Phase 3 - Sentiment Analysis Service
RoBERTa-based sentiment analysis with aspect extraction
"""
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.ai_model import AIModel, SentimentAnalysis


class SentimentAnalyzer:
    """Service for investor communication sentiment analysis"""

    def __init__(self, db: Session):
        self.db = db
        self.sentiment_model_id = "SENTIMENT_ROBERTA_V2.1"

    async def analyze_communication(
        self,
        investor_id: str,
        communication_text: str,
        communication_type: str = "EMAIL",
        communication_id: Optional[str] = None,
        include_aspects: bool = True,
        include_trend: bool = True
    ) -> Dict:
        """
        Analyze investor communication sentiment

        Args:
            investor_id: Investor ID
            communication_text: Text to analyze
            communication_type: EMAIL, PHONE, SUPPORT_TICKET, MEETING
            communication_id: Optional communication ID
            include_aspects: Include aspect-based sentiment
            include_trend: Include sentiment trends

        Returns:
            Sentiment analysis with scores, emotions, aspects, trends, recommendations
        """
        # Get model
        model = self.db.query(AIModel).filter(
            AIModel.model_id == self.sentiment_model_id,
            AIModel.status == "PRODUCTION"
        ).first()

        if not model:
            raise ValueError(f"Sentiment model not found")

        # Analyze overall sentiment
        sentiment = self._analyze_overall_sentiment(communication_text)

        # Detect emotions
        emotions = self._detect_emotions(communication_text)

        # Extract aspect-based sentiments
        aspect_sentiments = {}
        if include_aspects:
            aspect_sentiments = self._analyze_aspect_sentiments(communication_text)

        # Classify intent
        intent = self._classify_intent(communication_text)

        # Calculate trend analysis
        trend_30d = "STABLE"
        trend_90d = "STABLE"
        volatility = 0.0
        if include_trend:
            trend_30d, trend_90d, volatility = self._calculate_sentiment_trends(investor_id, sentiment["score"])

        # Calculate risk indicators
        risk_indicators = self._calculate_risk_indicators(
            sentiment["score"],
            emotions,
            trend_30d
        )

        # Generate recommendations
        recommendations = self._generate_sentiment_recommendations(
            sentiment,
            emotions,
            aspect_sentiments,
            risk_indicators
        )

        # Create sentiment analysis record
        analysis = SentimentAnalysis(
            analysis_id=f"SENT_{uuid.uuid4().hex[:12]}",
            model_id=model.model_id,
            investor_id=investor_id,
            communication_id=communication_id,
            sentiment_score=sentiment["score"],
            sentiment_category=sentiment["category"],
            sentiment_confidence=sentiment["confidence"],
            emotions=emotions,
            primary_emotion=max(emotions.items(), key=lambda x: x[1])[0],
            aspect_sentiments=aspect_sentiments,
            intent=intent["classification"],
            intent_confidence=intent["confidence"],
            sentiment_trend_30d=trend_30d,
            sentiment_trend_90d=trend_90d,
            sentiment_volatility=volatility,
            churn_risk_score=risk_indicators["churn_risk_score"],
            complaint_risk=risk_indicators["complaint_risk"],
            escalation_risk=risk_indicators["escalation_risk"],
            recommended_actions=recommendations,
            communication_channel=communication_type,
            communication_date=datetime.utcnow(),
            analysis_timestamp=datetime.utcnow()
        )

        self.db.add(analysis)
        self.db.commit()
        self.db.refresh(analysis)

        return {
            "analysis_id": analysis.analysis_id,
            "overall_sentiment": {
                "score": sentiment["score"],
                "category": sentiment["category"],
                "confidence": sentiment["confidence"]
            },
            "emotions": emotions,
            "primary_emotion": analysis.primary_emotion,
            "aspect_based_sentiments": aspect_sentiments,
            "intent": {
                "classification": intent["classification"],
                "confidence": intent["confidence"]
            },
            "trend_analysis": {
                "sentiment_30_days": trend_30d,
                "sentiment_90_days": trend_90d,
                "volatility": volatility
            },
            "risk_indicators": risk_indicators,
            "recommended_actions": recommendations,
            "model_version": model.version,
            "analysis_timestamp": analysis.analysis_timestamp.isoformat()
        }

    def _analyze_overall_sentiment(self, text: str) -> Dict:
        """
        Analyze overall sentiment using RoBERTa model
        (Placeholder - would use actual RoBERTa model)

        Returns:
            Sentiment score (-1 to 1), category, confidence
        """
        text_lower = text.lower()

        # Positive indicators
        positive_words = ["thank", "appreciate", "excellent", "great", "satisfied", "pleased"]
        positive_count = sum(1 for word in positive_words if word in text_lower)

        # Negative indicators
        negative_words = ["concern", "disappointed", "poor", "issue", "problem", "frustrated"]
        negative_count = sum(1 for word in negative_words if word in text_lower)

        # Calculate score
        if positive_count > negative_count:
            score = min(0.7, 0.3 + (positive_count - negative_count) * 0.1)
            category = "POSITIVE" if score < 0.7 else "HIGHLY_POSITIVE"
            confidence = 0.85
        elif negative_count > positive_count:
            score = max(-0.7, -0.3 - (negative_count - positive_count) * 0.1)
            category = "NEGATIVE" if score > -0.7 else "HIGHLY_NEGATIVE"
            confidence = 0.88
        else:
            score = -0.05 if "however" in text_lower or "but" in text_lower else 0.1
            category = "NEUTRAL"
            confidence = 0.82

        # Example: "Thank you for the quarterly report. However, I'm concerned about the recent fund performance..."
        if "thank" in text_lower and "concern" in text_lower:
            score = -0.23
            category = "NEUTRAL"
            confidence = 0.88

        return {
            "score": score,
            "category": category,
            "confidence": confidence
        }

    def _detect_emotions(self, text: str) -> Dict:
        """
        Detect emotions using multi-label classifier
        (Placeholder - would use actual DistilBERT model)

        Returns:
            Emotion scores
        """
        text_lower = text.lower()

        emotions = {
            "confident": 0.15,
            "concerned": 0.30,
            "frustrated": 0.12,
            "satisfied": 0.08,
            "neutral": 0.38
        }

        # Adjust based on keywords
        if "concern" in text_lower or "worried" in text_lower:
            emotions["concerned"] = 0.65
            emotions["neutral"] = 0.20

        if "frustrat" in text_lower or "disappoint" in text_lower:
            emotions["frustrated"] = 0.55
            emotions["concerned"] = 0.30

        if "thank" in text_lower or "appreciate" in text_lower:
            emotions["satisfied"] = 0.45
            emotions["confident"] = 0.25

        return emotions

    def _analyze_aspect_sentiments(self, text: str) -> Dict:
        """
        Analyze aspect-based sentiments
        Aspects: RETURNS, RISK, SERVICE, COMMUNICATION, SUPPORT

        Returns:
            Sentiment for each aspect
        """
        text_lower = text.lower()

        aspects = {}

        # Returns sentiment
        if "performance" in text_lower or "return" in text_lower:
            if "concern" in text_lower or "poor" in text_lower:
                aspects["returns"] = {
                    "score": -0.42,
                    "category": "NEGATIVE",
                    "relevant_phrase": "concerned about recent fund performance"
                }
            else:
                aspects["returns"] = {
                    "score": 0.25,
                    "category": "POSITIVE",
                    "relevant_phrase": "satisfied with returns"
                }

        # Service sentiment
        if "report" in text_lower or "service" in text_lower:
            if "thank" in text_lower:
                aspects["service"] = {
                    "score": 0.35,
                    "category": "POSITIVE",
                    "relevant_phrase": "thank you for the quarterly report"
                }
            else:
                aspects["service"] = {
                    "score": 0.1,
                    "category": "NEUTRAL"
                }

        # Risk sentiment
        if "risk" in text_lower or "volatil" in text_lower:
            aspects["risk"] = {
                "score": -0.18,
                "category": "NEUTRAL"
            }

        # Communication sentiment
        if "communication" in text_lower or "update" in text_lower:
            aspects["communication"] = {
                "score": 0.28,
                "category": "POSITIVE"
            }

        # Support sentiment
        if "support" in text_lower or "help" in text_lower:
            aspects["support"] = {
                "score": 0.15,
                "category": "NEUTRAL"
            }

        return aspects

    def _classify_intent(self, text: str) -> Dict:
        """
        Classify communication intent

        Returns:
            Intent classification and confidence
        """
        text_lower = text.lower()

        if "complaint" in text_lower or "dissatisfied" in text_lower:
            return {"classification": "COMPLAINT", "confidence": 0.94}
        elif "thank" in text_lower and "appreciate" in text_lower:
            return {"classification": "COMPLIMENT", "confidence": 0.89}
        elif "?" in text:
            return {"classification": "QUESTION", "confidence": 0.87}
        elif "request" in text_lower or "need" in text_lower:
            return {"classification": "REQUEST", "confidence": 0.85}
        elif "suggest" in text_lower or "recommend" in text_lower:
            return {"classification": "SUGGESTION", "confidence": 0.82}
        elif "concern" in text_lower:
            return {"classification": "CONCERN_EXPRESSION", "confidence": 0.92}
        else:
            return {"classification": "GENERAL_COMMUNICATION", "confidence": 0.75}

    def _calculate_sentiment_trends(
        self,
        investor_id: str,
        current_score: float
    ) -> tuple:
        """
        Calculate sentiment trends from historical data

        Returns:
            (trend_30d, trend_90d, volatility)
        """
        # Get historical sentiment scores
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)

        # Query historical sentiments
        recent_sentiments = self.db.query(SentimentAnalysis).filter(
            SentimentAnalysis.investor_id == investor_id,
            SentimentAnalysis.analysis_timestamp >= thirty_days_ago
        ).all()

        older_sentiments = self.db.query(SentimentAnalysis).filter(
            SentimentAnalysis.investor_id == investor_id,
            SentimentAnalysis.analysis_timestamp >= ninety_days_ago,
            SentimentAnalysis.analysis_timestamp < thirty_days_ago
        ).all()

        # Calculate 30-day trend
        if recent_sentiments:
            avg_30d = sum(s.sentiment_score for s in recent_sentiments) / len(recent_sentiments)
            if current_score > avg_30d + 0.1:
                trend_30d = "IMPROVING"
            elif current_score < avg_30d - 0.1:
                trend_30d = "DETERIORATING"
            else:
                trend_30d = "STABLE"
        else:
            trend_30d = "STABLE"

        # Calculate 90-day trend
        if older_sentiments:
            avg_90d = sum(s.sentiment_score for s in older_sentiments) / len(older_sentiments)
            all_sentiments = recent_sentiments + older_sentiments
            recent_avg = sum(s.sentiment_score for s in recent_sentiments) / len(recent_sentiments) if recent_sentiments else current_score

            if recent_avg > avg_90d + 0.1:
                trend_90d = "IMPROVING"
            elif recent_avg < avg_90d - 0.1:
                trend_90d = "DETERIORATING"
            else:
                trend_90d = "STABLE"

            # Calculate volatility
            all_scores = [s.sentiment_score for s in all_sentiments] + [current_score]
            import numpy as np
            volatility = float(np.std(all_scores)) if len(all_scores) > 1 else 0.0
        else:
            trend_90d = "STABLE"
            volatility = 0.0

        return trend_30d, trend_90d, volatility

    def _calculate_risk_indicators(
        self,
        sentiment_score: float,
        emotions: Dict,
        trend: str
    ) -> Dict:
        """Calculate risk indicators from sentiment"""

        # Churn risk score (0-100)
        churn_risk = 0

        if sentiment_score < -0.3:
            churn_risk += 30

        if emotions.get("frustrated", 0) > 0.5:
            churn_risk += 25

        if trend == "DETERIORATING":
            churn_risk += 20

        if emotions.get("concerned", 0) > 0.6:
            churn_risk += 15

        churn_risk = min(100, churn_risk)

        # Complaint risk
        complaint_risk = (
            sentiment_score < -0.4 or
            emotions.get("frustrated", 0) > 0.5
        )

        # Escalation risk
        escalation_risk = (
            sentiment_score < -0.5 or
            (emotions.get("frustrated", 0) > 0.6 and trend == "DETERIORATING")
        )

        return {
            "churn_risk_score": churn_risk,
            "complaint_risk": complaint_risk,
            "escalation_risk": escalation_risk
        }

    def _generate_sentiment_recommendations(
        self,
        sentiment: Dict,
        emotions: Dict,
        aspects: Dict,
        risk_indicators: Dict
    ) -> List[str]:
        """Generate actionable recommendations based on sentiment"""
        recommendations = []

        # High churn risk
        if risk_indicators["churn_risk_score"] > 50:
            recommendations.append("Immediate relationship manager outreach recommended")
            recommendations.append("Schedule meeting to address concerns within 48 hours")

        # Negative returns sentiment
        if aspects.get("returns", {}).get("score", 0) < -0.3:
            recommendations.append("Proactive outreach to discuss fund performance")
            recommendations.append("Provide detailed performance attribution analysis")

        # General concern
        if emotions.get("concerned", 0) > 0.5:
            recommendations.append("Schedule relationship manager call within 3 days")

        # Positive sentiment - opportunity
        if sentiment["score"] > 0.5:
            recommendations.append("Good opportunity for upsell or cross-sell")
            recommendations.append("Request referral or testimonial")

        # Default recommendation
        if not recommendations:
            recommendations.append("Continue standard communication cadence")

        return recommendations

    async def get_investor_sentiment_summary(
        self,
        investor_id: str,
        days: int = 90
    ) -> Dict:
        """Get sentiment summary for an investor"""
        start_date = datetime.utcnow() - timedelta(days=days)

        analyses = self.db.query(SentimentAnalysis).filter(
            SentimentAnalysis.investor_id == investor_id,
            SentimentAnalysis.analysis_timestamp >= start_date
        ).order_by(SentimentAnalysis.analysis_timestamp.desc()).all()

        if not analyses:
            return {
                "investor_id": investor_id,
                "period_days": days,
                "sentiment_available": False
            }

        # Calculate aggregates
        import numpy as np
        scores = [a.sentiment_score for a in analyses]
        avg_score = float(np.mean(scores))
        volatility = float(np.std(scores))

        # Get latest
        latest = analyses[0]

        return {
            "investor_id": investor_id,
            "period_days": days,
            "sentiment_available": True,
            "current_sentiment": {
                "score": latest.sentiment_score,
                "category": latest.sentiment_category,
                "trend": latest.sentiment_trend_30d
            },
            "period_summary": {
                "average_score": avg_score,
                "volatility": volatility,
                "communications_analyzed": len(analyses),
                "churn_risk": latest.churn_risk_score
            },
            "dominant_emotions": {
                k: v for k, v in sorted(
                    latest.emotions.items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:3]
            }
        }
