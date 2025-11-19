"""
Advanced AI Phase 3 - Feature Engineering Pipeline
Comprehensive feature extraction and transformation for ML models
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)


class FeatureEngineeringPipeline:
    """Feature engineering pipeline for all ML models"""

    def __init__(self, db: Session):
        self.db = db

    def extract_payment_features(self, investor_id: str, lookback_days: int = 365) -> Dict:
        """
        Extract comprehensive features for payment predictions

        Features:
        - Historical payment patterns (timing, amounts, frequencies)
        - Account history (tenure, balance trends, transaction volume)
        - Portfolio features (composition, diversification)
        - Market features (indices, volatility, credit spreads)
        - Sentiment features (recent sentiment, trends)
        - Temporal features (seasonality, business cycles)
        """
        features = {}

        # Historical Payment Features
        payment_features = self._extract_historical_payment_features(investor_id, lookback_days)
        features.update(payment_features)

        # Account Features
        account_features = self._extract_account_features(investor_id)
        features.update(account_features)

        # Portfolio Features
        portfolio_features = self._extract_portfolio_features(investor_id)
        features.update(portfolio_features)

        # Market Features
        market_features = self._extract_market_features()
        features.update(market_features)

        # Sentiment Features
        sentiment_features = self._extract_sentiment_features(investor_id)
        features.update(sentiment_features)

        # Temporal Features
        temporal_features = self._extract_temporal_features()
        features.update(temporal_features)

        # Interaction Features
        interaction_features = self._create_interaction_features(features)
        features.update(interaction_features)

        return features

    def _extract_historical_payment_features(self, investor_id: str, lookback_days: int) -> Dict:
        """Extract historical payment pattern features"""
        # Placeholder - would query actual payment history
        # In production: query payments table and calculate statistics

        features = {
            # Payment timing features
            'days_since_last_payment': 30,
            'avg_payment_delay_days': 2.5,
            'std_payment_delay_days': 1.5,
            'max_payment_delay_days': 7,
            'min_payment_delay_days': 0,
            'payment_frequency_days': 90,
            'on_time_payment_rate': 0.85,
            'late_payment_count_last_year': 3,
            'missed_payment_count_last_year': 0,

            # Payment amount features
            'avg_payment_amount': 125000,
            'std_payment_amount': 15000,
            'max_payment_amount': 250000,
            'min_payment_amount': 75000,
            'payment_amount_cv': 0.12,  # Coefficient of variation
            'payment_amount_trend': 0.05,  # Trending up

            # Rolling statistics (various windows)
            'payment_delay_ma_30d': 2.0,
            'payment_delay_ma_90d': 2.5,
            'payment_amount_ma_30d': 120000,
            'payment_amount_ma_90d': 125000,

            # Payment patterns
            'payment_day_of_month_mode': 15,  # Most common payment day
            'payment_consistency_score': 0.82,
            'payment_volatility': 0.18
        }

        return features

    def _extract_account_features(self, investor_id: str) -> Dict:
        """Extract account-level features"""
        features = {
            # Account tenure
            'investor_tenure_days': 730,
            'investor_tenure_months': 24,

            # Balance features
            'total_invested_amount': 1500000,
            'current_balance': 1650000,
            'unrealized_gains': 150000,
            'unrealized_gains_pct': 0.10,
            'account_growth_rate': 0.08,
            'balance_trend_30d': 0.02,
            'balance_trend_90d': 0.05,

            # Transaction features
            'total_transactions': 48,
            'avg_transaction_size': 50000,
            'redemption_frequency': 2,
            'redemption_rate': 0.05,

            # Engagement features
            'login_frequency_last_30d': 8,
            'document_views_last_30d': 12,
            'support_tickets_last_90d': 1
        }

        return features

    def _extract_portfolio_features(self, investor_id: str) -> Dict:
        """Extract portfolio composition and risk features"""
        features = {
            # Composition
            'number_of_funds': 4,
            'number_of_asset_classes': 3,
            'portfolio_concentration': 0.35,  # HHI
            'largest_position_pct': 0.35,

            # Allocation features
            'equity_allocation_pct': 0.60,
            'fixed_income_allocation_pct': 0.30,
            'alternative_allocation_pct': 0.10,

            # Risk features
            'portfolio_volatility': 0.18,
            'portfolio_beta': 1.05,
            'portfolio_correlation_sp500': 0.65,
            'diversification_score': 0.75,
            'concentration_risk_score': 0.35,

            # Performance features
            'portfolio_return_1m': 0.02,
            'portfolio_return_3m': 0.05,
            'portfolio_return_6m': 0.08,
            'portfolio_return_1y': 0.12,
            'portfolio_sharpe_ratio': 0.95,
            'portfolio_max_drawdown': -0.08
        }

        return features

    def _extract_market_features(self) -> Dict:
        """Extract market and macro features"""
        features = {
            # Index levels and returns
            'sp500_level': 4500,
            'sp500_return_1m': 0.03,
            'sp500_return_3m': 0.07,
            'sp500_return_1y': 0.15,

            # Volatility
            'vix_level': 18,
            'market_volatility_30d': 0.15,
            'market_volatility_90d': 0.18,

            # Interest rates
            'fed_funds_rate': 0.05,
            'treasury_10y_yield': 0.04,
            'credit_spread_bbb': 0.015,
            'yield_curve_slope': 0.01,

            # Economic indicators
            'gdp_growth_rate': 0.025,
            'unemployment_rate': 0.04,
            'inflation_rate': 0.03,
            'consumer_confidence_index': 105,

            # Market sentiment
            'market_regime': 1,  # 1=bull, 0=neutral, -1=bear
            'risk_on_off_indicator': 0.6,  # 0-1

            # Seasonal factors
            'is_quarter_end': 0,
            'is_year_end': 0,
            'trading_days_in_month': 21
        }

        return features

    def _extract_sentiment_features(self, investor_id: str) -> Dict:
        """Extract sentiment and behavioral features"""
        features = {
            # Recent sentiment
            'recent_sentiment_score': 0.35,
            'sentiment_category_encoded': 2,  # 0=negative, 1=neutral, 2=positive

            # Sentiment trends
            'sentiment_trend_30d': 1,  # 1=improving, 0=stable, -1=deteriorating
            'sentiment_trend_90d': 0,
            'sentiment_volatility': 0.25,

            # Emotions
            'emotion_concerned_score': 0.15,
            'emotion_satisfied_score': 0.65,
            'emotion_frustrated_score': 0.05,

            # Communication patterns
            'communication_frequency_30d': 3,
            'communication_frequency_90d': 8,
            'avg_response_time_hours': 24,

            # Risk indicators
            'churn_risk_score': 25,
            'complaint_risk_flag': 0,
            'escalation_risk_flag': 0
        }

        return features

    def _extract_temporal_features(self) -> Dict:
        """Extract temporal and seasonal features"""
        now = datetime.utcnow()

        features = {
            # Date components
            'year': now.year,
            'month': now.month,
            'day': now.day,
            'day_of_week': now.weekday(),
            'day_of_month': now.day,
            'day_of_year': now.timetuple().tm_yday,
            'week_of_year': now.isocalendar()[1],

            # Quarter
            'quarter': (now.month - 1) // 3 + 1,
            'is_quarter_start': 1 if now.month in [1, 4, 7, 10] and now.day <= 5 else 0,
            'is_quarter_end': 1 if now.month in [3, 6, 9, 12] and now.day >= 25 else 0,

            # Business day indicators
            'is_monday': 1 if now.weekday() == 0 else 0,
            'is_friday': 1 if now.weekday() == 4 else 0,
            'is_month_end': 1 if now.day >= 25 else 0,
            'is_year_end': 1 if now.month == 12 and now.day >= 20 else 0,

            # Cyclical encoding (sin/cos for periodicity)
            'month_sin': np.sin(2 * np.pi * now.month / 12),
            'month_cos': np.cos(2 * np.pi * now.month / 12),
            'day_of_week_sin': np.sin(2 * np.pi * now.weekday() / 7),
            'day_of_week_cos': np.cos(2 * np.pi * now.weekday() / 7)
        }

        return features

    def _create_interaction_features(self, features: Dict) -> Dict:
        """Create interaction features from base features"""
        interaction_features = {}

        # Payment delay * volatility
        if 'avg_payment_delay_days' in features and 'portfolio_volatility' in features:
            interaction_features['payment_delay_x_volatility'] = (
                features['avg_payment_delay_days'] * features['portfolio_volatility']
            )

        # Sentiment * market return
        if 'recent_sentiment_score' in features and 'sp500_return_1m' in features:
            interaction_features['sentiment_x_market_return'] = (
                features['recent_sentiment_score'] * features['sp500_return_1m']
            )

        # Portfolio concentration * market volatility
        if 'portfolio_concentration' in features and 'market_volatility_30d' in features:
            interaction_features['concentration_x_volatility'] = (
                features['portfolio_concentration'] * features['market_volatility_30d']
            )

        # Account growth * market regime
        if 'account_growth_rate' in features and 'market_regime' in features:
            interaction_features['growth_x_regime'] = (
                features['account_growth_rate'] * features['market_regime']
            )

        return interaction_features

    def normalize_features(self, features: Dict, scaler_params: Dict = None) -> Tuple[np.ndarray, Dict]:
        """
        Normalize features using StandardScaler or MinMaxScaler

        Returns:
            Normalized feature array and scaler parameters
        """
        feature_values = np.array(list(features.values()))

        if scaler_params is None:
            # Calculate mean and std for StandardScaler
            mean = np.mean(feature_values)
            std = np.std(feature_values)
            scaler_params = {'mean': mean, 'std': std}
        else:
            mean = scaler_params['mean']
            std = scaler_params['std']

        # Standardize
        normalized = (feature_values - mean) / (std + 1e-8)

        return normalized, scaler_params

    def create_feature_vectors_batch(self, investor_ids: List[str]) -> pd.DataFrame:
        """Create feature vectors for batch processing"""
        feature_list = []

        for investor_id in investor_ids:
            try:
                features = self.extract_payment_features(investor_id)
                features['investor_id'] = investor_id
                feature_list.append(features)
            except Exception as e:
                logger.error(f"Error extracting features for {investor_id}: {e}")

        df = pd.DataFrame(feature_list)
        return df

    def save_features_to_store(self, investor_id: str, features: Dict):
        """Save features to feature store for serving"""
        from app.models.ai_model import FeatureStore
        import uuid

        feature_record = FeatureStore(
            feature_id=f"FEAT_{uuid.uuid4().hex[:12]}",
            feature_timestamp=datetime.utcnow(),
            entity_type="INVESTOR",
            entity_id=investor_id,
            # Map features to columns
            days_since_last_payment=features.get('days_since_last_payment'),
            avg_payment_delay_days=features.get('avg_payment_delay_days'),
            std_payment_delay_days=features.get('std_payment_delay_days'),
            payment_frequency_days=features.get('payment_frequency_days'),
            on_time_payment_rate=features.get('on_time_payment_rate'),
            late_payment_count=features.get('late_payment_count_last_year'),
            missed_payment_count=features.get('missed_payment_count_last_year'),
            avg_payment_amount=features.get('avg_payment_amount'),
            std_payment_amount=features.get('std_payment_amount'),
            max_payment_amount=features.get('max_payment_amount'),
            min_payment_amount=features.get('min_payment_amount'),
            payment_amount_cv=features.get('payment_amount_cv'),
            investor_tenure_days=features.get('investor_tenure_days'),
            total_invested_amount=features.get('total_invested_amount'),
            current_balance=features.get('current_balance'),
            account_growth_rate=features.get('account_growth_rate'),
            redemption_frequency=features.get('redemption_frequency'),
            number_of_funds=features.get('number_of_funds'),
            portfolio_concentration=features.get('portfolio_concentration'),
            portfolio_volatility=features.get('portfolio_volatility'),
            portfolio_correlation=features.get('portfolio_correlation_sp500'),
            diversification_score=features.get('diversification_score'),
            market_return_1m=features.get('sp500_return_1m'),
            market_return_3m=features.get('sp500_return_3m'),
            market_return_1y=features.get('sp500_return_1y'),
            market_volatility_30d=features.get('market_volatility_30d'),
            credit_spread=features.get('credit_spread_bbb'),
            recent_sentiment_score=features.get('recent_sentiment_score'),
            sentiment_trend=features.get('sentiment_trend_30d'),
            communication_frequency=features.get('communication_frequency_30d'),
            default_risk_score=features.get('churn_risk_score'),
            leverage_ratio=0.3,  # Would calculate from data
            liquidity_risk=0.15,  # Would calculate from data
            custom_features=features  # Store all features as JSON
        )

        self.db.add(feature_record)
        self.db.commit()

        logger.info(f"Features saved for investor {investor_id}")
