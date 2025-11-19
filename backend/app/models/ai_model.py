"""
Advanced AI Phase 3 - AI Model Management Database Models
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, Index, JSON, DECIMAL
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class AIModel(Base):
    """Registry for all ML models"""
    __tablename__ = "ai_models"

    model_id = Column(String(64), primary_key=True)
    model_name = Column(String(256), nullable=False)
    model_type = Column(String(50), nullable=False)  # REGRESSION, CLASSIFICATION, CLUSTERING, NLP
    description = Column(Text)
    algorithm = Column(String(100))
    framework = Column(String(50))  # TensorFlow, PyTorch, XGBoost, Scikit-learn
    version = Column(String(20))
    parent_model_id = Column(String(64), ForeignKey('ai_models.model_id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(100))
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    updated_by = Column(String(100))
    status = Column(String(20))  # DEVELOPMENT, STAGING, PRODUCTION, ARCHIVED
    production_date = Column(DateTime)
    archived_date = Column(DateTime)

    # Model Metadata (JSON)
    input_features = Column(JSON)  # Feature names and types
    output_features = Column(JSON)  # Output structure
    hyperparameters = Column(JSON)  # Hyperparameter values
    training_config = Column(JSON)  # Training configuration

    # Model Performance
    training_accuracy = Column(Float)
    validation_accuracy = Column(Float)
    test_accuracy = Column(Float)
    training_rmse = Column(Float)
    validation_rmse = Column(Float)
    test_rmse = Column(Float)
    auc_score = Column(Float)
    f1_score = Column(Float)
    precision = Column(Float)
    recall = Column(Float)

    # Model Storage
    model_path = Column(String(512))  # Path to model file (S3/GCS)
    model_size_mb = Column(Float)
    serialization_format = Column(String(20))  # HDF5, ONNX, SavedModel, Pickle

    # Dependencies
    training_dataset_id = Column(String(64))
    feature_set_id = Column(String(64))

    # Relationships
    training_history = relationship("ModelTrainingHistory", back_populates="model")
    ab_tests_as_a = relationship("ModelABTest", foreign_keys="ModelABTest.model_a_id")
    ab_tests_as_b = relationship("ModelABTest", foreign_keys="ModelABTest.model_b_id")
    payment_date_predictions = relationship("PaymentDatePrediction", back_populates="model")
    payment_amount_predictions = relationship("PaymentAmountPrediction", back_populates="model")
    risk_predictions = relationship("RiskPrediction", back_populates="model")
    portfolio_recommendations = relationship("PortfolioRecommendation", back_populates="model")
    nlp_queries = relationship("NLPQuery", back_populates="model")
    document_classifications = relationship("DocumentClassification", back_populates="model")
    sentiment_analyses = relationship("SentimentAnalysis", back_populates="model")
    performance_monitoring = relationship("ModelPerformanceMonitoring", back_populates="model")
    drift_detections = relationship("DataDriftDetection", back_populates="model")

    __table_args__ = (
        Index('idx_ai_models_status', 'status'),
        Index('idx_ai_models_created_at', 'created_at'),
        Index('idx_ai_models_model_type', 'model_type'),
    )


class ModelTrainingHistory(Base):
    """History of model training runs"""
    __tablename__ = "model_training_history"

    training_id = Column(String(64), primary_key=True)
    model_id = Column(String(64), ForeignKey('ai_models.model_id'), nullable=False)
    training_start = Column(DateTime)
    training_end = Column(DateTime)
    duration_minutes = Column(Integer)

    # Data Information
    training_rows = Column(Integer)
    validation_rows = Column(Integer)
    test_rows = Column(Integer)
    data_date_from = Column(DateTime)
    data_date_to = Column(DateTime)

    # Training Metrics
    final_loss = Column(Float)
    best_validation_loss = Column(Float)
    epochs_trained = Column(Integer)
    early_stopping_epoch = Column(Integer)

    # Performance Metrics (JSON)
    metrics = Column(JSON)

    # Hyperparameters Used (JSON)
    hyperparameters = Column(JSON)

    # Execution Details
    training_environment = Column(String(100))  # GPU type, instance
    training_cost_usd = Column(Float)
    training_notes = Column(Text)
    status = Column(String(20))  # SUCCESS, FAILED, INCOMPLETE
    error_message = Column(Text)

    # Relationships
    model = relationship("AIModel", back_populates="training_history")

    __table_args__ = (
        Index('idx_training_history_model_id', 'model_id'),
        Index('idx_training_history_training_start', 'training_start'),
    )


class ModelABTest(Base):
    """A/B tests comparing model performance"""
    __tablename__ = "model_ab_tests"

    test_id = Column(String(64), primary_key=True)
    test_name = Column(String(256))
    description = Column(Text)
    model_a_id = Column(String(64), ForeignKey('ai_models.model_id'), nullable=False)
    model_b_id = Column(String(64), ForeignKey('ai_models.model_id'), nullable=False)

    # Test Configuration
    test_start_date = Column(DateTime)
    test_end_date = Column(DateTime)
    traffic_split_a = Column(Float)  # 0-1
    traffic_split_b = Column(Float)

    # Results
    metric_name = Column(String(100))
    model_a_metric_value = Column(Float)
    model_b_metric_value = Column(Float)
    metric_improvement_pct = Column(Float)
    statistical_significance = Column(Float)  # p-value

    # Decisions
    winner_model_id = Column(String(64), ForeignKey('ai_models.model_id'))
    decision_timestamp = Column(DateTime)
    decision_notes = Column(Text)
    status = Column(String(20))  # RUNNING, COMPLETED, INCONCLUSIVE

    __table_args__ = (
        Index('idx_ab_tests_status', 'status'),
    )


class PaymentDatePrediction(Base):
    """Payment date predictions"""
    __tablename__ = "ai_predictions_payment_date"

    prediction_id = Column(String(64), primary_key=True)
    model_id = Column(String(64), ForeignKey('ai_models.model_id'), nullable=False)

    # Entity Information
    investor_id = Column(String(32), nullable=False)
    fund_id = Column(String(32))
    investment_id = Column(String(32))

    # Prediction Details
    predicted_payment_date = Column(DateTime)
    predicted_days_until_payment = Column(Integer)
    confidence_score = Column(Float)  # 0-1
    confidence_interval_lower = Column(DateTime)  # 95% CI
    confidence_interval_upper = Column(DateTime)

    # Probability Distribution
    probability_on_time = Column(Float)  # P(payment by scheduled date)
    probability_early = Column(Float)
    probability_late_1_7_days = Column(Float)
    probability_late_8_14_days = Column(Float)
    probability_late_15plus_days = Column(Float)

    # Prediction Explanation (JSON)
    top_factors = Column(JSON)  # [{"factor": "payment_history", "impact": 0.35}, ...]
    shap_values = Column(JSON)  # Detailed SHAP values for each feature

    # Reference Information
    actual_payment_date = Column(DateTime)  # Populated when payment received
    actual_days_late = Column(Integer)
    prediction_accuracy = Column(String(20))  # ON_TIME, EARLY, LATE_1_7, LATE_8_14, LATE_15plus

    # Metadata
    prediction_timestamp = Column(DateTime, default=datetime.utcnow)
    scheduled_payment_date = Column(DateTime)
    features_version = Column(String(20))

    # Relationships
    model = relationship("AIModel", back_populates="payment_date_predictions")

    __table_args__ = (
        Index('idx_payment_date_investor_id', 'investor_id'),
        Index('idx_payment_date_predicted_date', 'predicted_payment_date'),
        Index('idx_payment_date_timestamp', 'prediction_timestamp'),
        Index('idx_payment_date_confidence', 'confidence_score'),
    )


class PaymentAmountPrediction(Base):
    """Payment amount predictions"""
    __tablename__ = "ai_predictions_payment_amount"

    prediction_id = Column(String(64), primary_key=True)
    model_id = Column(String(64), ForeignKey('ai_models.model_id'), nullable=False)

    # Entity Information
    investor_id = Column(String(32), nullable=False)
    fund_id = Column(String(32))
    investment_id = Column(String(32))

    # Prediction Details
    predicted_amount = Column(DECIMAL(18, 2))
    confidence_score = Column(Float)
    confidence_interval_lower = Column(DECIMAL(18, 2))  # 95% CI
    confidence_interval_upper = Column(DECIMAL(18, 2))

    # Probability Distribution
    probability_within_5_pct = Column(Float)
    probability_within_10_pct = Column(Float)
    probability_within_20_pct = Column(Float)

    # Prediction Explanation (JSON)
    top_factors = Column(JSON)
    shap_values = Column(JSON)

    # Variance Estimate
    predicted_variance = Column(Float)
    coefficient_of_variation = Column(Float)

    # Reference Information
    actual_amount = Column(DECIMAL(18, 2))  # Populated after payment
    actual_error_pct = Column(Float)

    # Metadata
    prediction_timestamp = Column(DateTime, default=datetime.utcnow)
    scheduled_amount = Column(DECIMAL(18, 2))

    # Relationships
    model = relationship("AIModel", back_populates="payment_amount_predictions")

    __table_args__ = (
        Index('idx_payment_amount_investor_id', 'investor_id'),
        Index('idx_payment_amount_timestamp', 'prediction_timestamp'),
    )


class RiskPrediction(Base):
    """Risk assessment predictions"""
    __tablename__ = "ai_predictions_risk"

    prediction_id = Column(String(64), primary_key=True)
    model_id = Column(String(64), ForeignKey('ai_models.model_id'), nullable=False)

    # Risk Type
    risk_type = Column(String(50))  # DEFAULT_RISK, FUND_PERFORMANCE_RISK, LIQUIDITY_RISK
    risk_horizon = Column(String(20))  # 3M, 6M, 12M

    # Entity Information
    investor_id = Column(String(32))
    fund_id = Column(String(32))

    # Risk Assessment
    risk_probability = Column(Float)  # 0-1
    risk_tier = Column(String(20))  # TIER_1, TIER_2, TIER_3, TIER_4, TIER_5
    risk_score = Column(Integer)  # 0-100

    # Risk Trend
    previous_risk_score = Column(Integer)
    risk_trend = Column(String(20))  # IMPROVING, STABLE, DETERIORATING
    trend_magnitude = Column(Float)

    # Detailed Factors (JSON)
    top_risk_factors = Column(JSON)  # [{"factor": "payment_delay", "weight": 0.35}, ...]
    contributing_metrics = Column(JSON)  # Relevant metrics

    # Estimated Impact
    estimated_loss_exposure = Column(DECIMAL(18, 2))  # Expected loss amount
    exposure_percentage = Column(Float)  # % of portfolio

    # Recommended Actions (JSON)
    recommended_actions = Column(JSON)  # Suggested interventions

    # Metadata
    prediction_timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    model = relationship("AIModel", back_populates="risk_predictions")

    __table_args__ = (
        Index('idx_risk_type', 'risk_type'),
        Index('idx_risk_investor_id', 'investor_id'),
        Index('idx_risk_timestamp', 'prediction_timestamp'),
        Index('idx_risk_tier', 'risk_tier'),
    )


class PortfolioRecommendation(Base):
    """Portfolio optimization recommendations"""
    __tablename__ = "ai_recommendations_portfolio"

    recommendation_id = Column(String(64), primary_key=True)
    model_id = Column(String(64), ForeignKey('ai_models.model_id'), nullable=False)

    # Entity Information
    investor_id = Column(String(32), nullable=False)
    portfolio_id = Column(String(32))

    # Recommendation Details
    recommendation_type = Column(String(50))  # REBALANCING, TACTICAL_SHIFT, STRATEGIC_UPGRADE, etc.

    # Current & Recommended Allocation (JSON)
    current_allocation = Column(JSON)  # {fund_id: percentage}
    recommended_allocation = Column(JSON)
    allocation_changes = Column(JSON)  # {fund_id: change_percentage}

    # Impact Analysis
    reason_for_recommendation = Column(Text)
    expected_return_improvement_pct = Column(Float)
    expected_risk_reduction_pct = Column(Float)
    expected_diversification_improvement_pct = Column(Float)

    # Implementation Details
    implementation_timeline = Column(String(100))
    transaction_cost_usd = Column(DECIMAL(12, 2))
    estimated_tax_impact_usd = Column(DECIMAL(12, 2))

    # Probability & Confidence
    probability_of_success = Column(Float)
    confidence_score = Column(Float)

    # Alternative Recommendations (JSON)
    alternative_recommendations = Column(JSON)

    # Acceptance & Outcome
    accepted = Column(Boolean)
    accepted_timestamp = Column(DateTime)
    acceptance_reason = Column(Text)

    implementation_started = Column(Boolean)
    implementation_start_date = Column(DateTime)
    implementation_completed = Column(Boolean)
    implementation_completion_date = Column(DateTime)

    actual_return_improvement_pct = Column(Float)  # Populated post-implementation
    actual_risk_reduction_pct = Column(Float)

    # Metadata
    created_timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    model = relationship("AIModel", back_populates="portfolio_recommendations")

    __table_args__ = (
        Index('idx_portfolio_investor_id', 'investor_id'),
        Index('idx_portfolio_recommendation_type', 'recommendation_type'),
        Index('idx_portfolio_created_timestamp', 'created_timestamp'),
        Index('idx_portfolio_accepted', 'accepted'),
    )


class NLPQuery(Base):
    """NLP query results"""
    __tablename__ = "ai_nlp_queries"

    query_id = Column(String(64), primary_key=True)
    model_id = Column(String(64), ForeignKey('ai_models.model_id'), nullable=False)

    # Query Information
    query_text = Column(Text)
    user_id = Column(String(32))

    # NLP Processing
    intent_classification = Column(String(50))
    intent_confidence = Column(Float)

    # Entities Extracted (JSON)
    extracted_entities = Column(JSON)  # {entity_type: [values]}

    # Query Interpretation
    interpreted_query = Column(Text)
    query_normalization = Column(Text)
    ambiguity_resolved = Column(Boolean)

    # Execution Details
    generated_sql = Column(Text)  # If applicable
    generated_code = Column(Text)  # If applicable
    execution_status = Column(String(20))  # SUCCESS, FAILED, INVALID
    execution_time_ms = Column(Integer)

    # Results
    result_summary = Column(Text)
    result_row_count = Column(Integer)
    result_snippet = Column(JSON)  # First few rows as JSON

    # User Feedback
    user_satisfaction = Column(Integer)  # 1-5 stars
    feedback_text = Column(Text)

    # Metadata
    query_timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    model = relationship("AIModel", back_populates="nlp_queries")

    __table_args__ = (
        Index('idx_nlp_user_id', 'user_id'),
        Index('idx_nlp_intent', 'intent_classification'),
        Index('idx_nlp_query_timestamp', 'query_timestamp'),
    )


class DocumentClassification(Base):
    """Document classification & routing"""
    __tablename__ = "ai_document_classifications"

    classification_id = Column(String(64), primary_key=True)
    model_id = Column(String(64), ForeignKey('ai_models.model_id'), nullable=False)

    # Document Information
    document_id = Column(String(64), nullable=False)
    document_name = Column(String(256))
    document_type_detected = Column(String(100))

    # Classification Results
    primary_category = Column(String(100))
    primary_category_confidence = Column(Float)
    secondary_categories = Column(JSON)  # [{category, confidence}]

    # Multi-label Classification (JSON)
    labels = Column(JSON)  # {label: confidence}

    # Routing Information
    urgency_score = Column(Integer)  # 0-100
    complexity_score = Column(Integer)
    risk_score = Column(Integer)
    priority_level = Column(String(20))  # CRITICAL, HIGH, MEDIUM, LOW

    # Workflow Routing
    routed_to_team = Column(String(100))
    routed_to_workflow = Column(String(100))
    routed_workflow_id = Column(String(64))
    sla_hours = Column(Integer)
    escalation_threshold = Column(String(20))

    # Classification Explanation (JSON)
    key_indicators = Column(JSON)  # Classification reasoning

    # Outcome Tracking
    actual_category = Column(String(100))
    classification_correct = Column(Boolean)
    user_correction_timestamp = Column(DateTime)
    user_feedback = Column(Text)

    # Metadata
    classification_timestamp = Column(DateTime, default=datetime.utcnow)
    processed_by_ocr = Column(Boolean)
    ocr_confidence = Column(Float)

    # Relationships
    model = relationship("AIModel", back_populates="document_classifications")

    __table_args__ = (
        Index('idx_doc_class_document_id', 'document_id'),
        Index('idx_doc_class_primary_category', 'primary_category'),
        Index('idx_doc_class_timestamp', 'classification_timestamp'),
        Index('idx_doc_class_priority', 'priority_level'),
    )


class SentimentAnalysis(Base):
    """Sentiment analysis results"""
    __tablename__ = "ai_sentiment_analysis"

    analysis_id = Column(String(64), primary_key=True)
    model_id = Column(String(64), ForeignKey('ai_models.model_id'), nullable=False)

    # Entity Information
    investor_id = Column(String(32), nullable=False)
    communication_id = Column(String(64))

    # Overall Sentiment
    sentiment_score = Column(Float)  # -1.0 to 1.0
    sentiment_category = Column(String(20))  # HIGHLY_POSITIVE, POSITIVE, NEUTRAL, NEGATIVE, HIGHLY_NEGATIVE
    sentiment_confidence = Column(Float)

    # Emotions (JSON)
    emotions = Column(JSON)  # {emotion: score}
    primary_emotion = Column(String(50))

    # Aspect-Based Sentiment (JSON)
    aspect_sentiments = Column(JSON)  # {aspect: {score, category}}
    # Aspects: RETURNS, RISK, SERVICE, COMMUNICATION, SUPPORT

    # Intent Detection
    intent = Column(String(50))  # COMPLAINT, COMPLIMENT, QUESTION, REQUEST, SUGGESTION
    intent_confidence = Column(Float)

    # Trend Analysis
    sentiment_trend_30d = Column(String(20))  # IMPROVING, STABLE, DETERIORATING
    sentiment_trend_90d = Column(String(20))
    sentiment_volatility = Column(Float)

    # Risk Indicators
    churn_risk_score = Column(Float)  # 0-100
    complaint_risk = Column(Boolean)
    escalation_risk = Column(Boolean)

    # Recommended Actions (JSON)
    recommended_actions = Column(JSON)  # Suggested interventions

    # Context
    communication_channel = Column(String(50))  # EMAIL, PHONE, SUPPORT_TICKET, MEETING
    communication_date = Column(DateTime)

    # Metadata
    analysis_timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    model = relationship("AIModel", back_populates="sentiment_analyses")

    __table_args__ = (
        Index('idx_sentiment_investor_id', 'investor_id'),
        Index('idx_sentiment_score', 'sentiment_score'),
        Index('idx_sentiment_timestamp', 'analysis_timestamp'),
        Index('idx_sentiment_churn_risk', 'churn_risk_score'),
    )


class ModelPerformanceMonitoring(Base):
    """Model performance monitoring"""
    __tablename__ = "model_performance_monitoring"

    monitoring_id = Column(String(64), primary_key=True)
    model_id = Column(String(64), ForeignKey('ai_models.model_id'), nullable=False)

    # Monitoring Period
    monitoring_date = Column(DateTime)
    monitoring_window_days = Column(Integer)  # e.g., 7, 30, 90

    # Prediction Volume & Distribution
    predictions_made = Column(Integer)
    predictions_with_feedback = Column(Integer)
    feedback_rate = Column(Float)

    # Performance Metrics
    accuracy = Column(Float)
    precision = Column(Float)
    recall = Column(Float)
    f1_score = Column(Float)
    auc_score = Column(Float)
    rmse = Column(Float)
    mae = Column(Float)

    # Trend Analysis
    metric_change_vs_baseline = Column(Float)
    metric_change_vs_previous = Column(Float)
    trend = Column(String(20))  # IMPROVING, STABLE, DEGRADING

    # Data Characteristics (JSON)
    prediction_distribution = Column(JSON)  # Distribution of predictions
    feature_statistics = Column(JSON)  # Feature means, stds, ranges

    # Issues Detected
    data_drift_detected = Column(Boolean)
    model_drift_detected = Column(Boolean)
    concept_drift_detected = Column(Boolean)

    # Alerts & Actions
    alert_triggered = Column(Boolean)
    alert_type = Column(String(50))
    alert_severity = Column(String(20))  # WARNING, CRITICAL
    action_taken = Column(String(256))
    action_timestamp = Column(DateTime)

    # Notes
    notes = Column(Text)

    # Relationships
    model = relationship("AIModel", back_populates="performance_monitoring")

    __table_args__ = (
        Index('idx_perf_mon_model_id', 'model_id'),
        Index('idx_perf_mon_date', 'monitoring_date'),
        Index('idx_perf_mon_alert', 'alert_triggered'),
    )


class DataDriftDetection(Base):
    """Data drift detection"""
    __tablename__ = "data_drift_detection"

    drift_id = Column(String(64), primary_key=True)
    model_id = Column(String(64), ForeignKey('ai_models.model_id'), nullable=False)

    # Detection Details
    feature_name = Column(String(256))
    drift_type = Column(String(50))  # STATISTICAL, BEHAVIORAL, ADVERSARIAL
    drift_score = Column(Float)  # 0-1
    drift_detected = Column(Boolean)

    # Statistical Measures
    ks_statistic = Column(Float)  # Kolmogorov-Smirnov
    js_divergence = Column(Float)  # Jensen-Shannon divergence
    psi_value = Column(Float)  # Population Stability Index
    chi_square = Column(Float)  # For categorical features

    # Characteristics
    baseline_mean = Column(Float)
    current_mean = Column(Float)
    baseline_std = Column(Float)
    current_std = Column(Float)
    mean_shift = Column(Float)
    std_shift = Column(Float)

    # Timeline
    baseline_period_start = Column(DateTime)
    baseline_period_end = Column(DateTime)
    monitoring_period_start = Column(DateTime)
    monitoring_period_end = Column(DateTime)

    # Actions
    action_recommended = Column(String(256))
    action_taken = Column(String(256))
    severity = Column(String(20))  # LOW, MEDIUM, HIGH

    detection_timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    model = relationship("AIModel", back_populates="drift_detections")

    __table_args__ = (
        Index('idx_drift_model_id', 'model_id'),
        Index('idx_drift_feature_name', 'feature_name'),
        Index('idx_drift_detected', 'drift_detected'),
    )


class FeatureStore(Base):
    """Feature store for ML features"""
    __tablename__ = "feature_store"

    feature_id = Column(String(64), primary_key=True)
    feature_timestamp = Column(DateTime, nullable=False)
    entity_type = Column(String(50), nullable=False)  # INVESTOR, FUND, PAYMENT
    entity_id = Column(String(32), nullable=False)

    # Historical Payment Features
    days_since_last_payment = Column(Integer)
    avg_payment_delay_days = Column(Float)
    std_payment_delay_days = Column(Float)
    payment_frequency_days = Column(Float)
    on_time_payment_rate = Column(Float)
    late_payment_count = Column(Integer)
    missed_payment_count = Column(Integer)

    # Historical Amount Features
    avg_payment_amount = Column(Float)
    std_payment_amount = Column(Float)
    max_payment_amount = Column(Float)
    min_payment_amount = Column(Float)
    payment_amount_cv = Column(Float)

    # Account Features
    investor_tenure_days = Column(Integer)
    total_invested_amount = Column(Float)
    current_balance = Column(Float)
    account_growth_rate = Column(Float)
    redemption_frequency = Column(Integer)

    # Portfolio Features
    number_of_funds = Column(Integer)
    portfolio_concentration = Column(Float)
    portfolio_volatility = Column(Float)
    portfolio_correlation = Column(Float)
    diversification_score = Column(Float)

    # Market Features
    market_return_1m = Column(Float)
    market_return_3m = Column(Float)
    market_return_1y = Column(Float)
    market_volatility_30d = Column(Float)
    credit_spread = Column(Float)

    # Sentiment Features
    recent_sentiment_score = Column(Float)
    sentiment_trend = Column(Integer)
    communication_frequency = Column(Integer)

    # Risk Features
    default_risk_score = Column(Float)
    fund_performance_risk = Column(Float)
    leverage_ratio = Column(Float)
    liquidity_risk = Column(Float)

    # Additional Features (JSON for flexibility)
    custom_features = Column(JSON)

    __table_args__ = (
        Index('idx_feature_entity', 'entity_type', 'entity_id'),
        Index('idx_feature_timestamp', 'feature_timestamp'),
    )
