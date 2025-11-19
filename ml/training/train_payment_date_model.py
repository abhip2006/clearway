"""
Advanced AI Phase 3 - Payment Date Prediction Model Training
LSTM with Attention Mechanism for predicting payment dates
"""

import numpy as np
import pandas as pd
from datetime import datetime
import uuid
import logging
from typing import Tuple

# TensorFlow/Keras imports
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

# MLflow for experiment tracking
import mlflow
import mlflow.keras

# SHAP for explainability
import shap

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PaymentDateLSTMModel:
    """
    LSTM Model with Attention Mechanism for Payment Date Prediction

    Architecture:
    - Input Layer: 256 features normalized
    - LSTM Layer 1: 128 units, dropout 0.2
    - LSTM Layer 2: 64 units, dropout 0.2
    - Attention Layer: Multi-head attention (4 heads)
    - Dense Layer 1: 32 units, ReLU activation
    - Dense Layer 2: 16 units, ReLU activation
    - Output Layer: 1 unit (predicted days until payment)
    """

    def __init__(self, input_dim: int = 256, sequence_length: int = 12):
        self.input_dim = input_dim
        self.sequence_length = sequence_length
        self.model = None
        self.history = None

    def build_model(self) -> keras.Model:
        """Build LSTM model with attention mechanism"""

        # Input layer
        inputs = layers.Input(shape=(self.sequence_length, self.input_dim), name='input')

        # LSTM layers with dropout
        lstm1 = layers.LSTM(128, return_sequences=True, dropout=0.2, name='lstm_1')(inputs)
        lstm2 = layers.LSTM(64, return_sequences=True, dropout=0.2, name='lstm_2')(lstm1)

        # Multi-head attention mechanism
        attention = layers.MultiHeadAttention(
            num_heads=4,
            key_dim=64,
            name='multi_head_attention'
        )(lstm2, lstm2)

        # Global average pooling
        pooled = layers.GlobalAveragePooling1D()(attention)

        # Dense layers
        dense1 = layers.Dense(32, activation='relu', name='dense_1')(pooled)
        dense1 = layers.Dropout(0.2)(dense1)

        dense2 = layers.Dense(16, activation='relu', name='dense_2')(dense1)
        dense2 = layers.Dropout(0.1)(dense2)

        # Output layer (predicting days until payment)
        outputs = layers.Dense(1, activation='linear', name='output')(dense2)

        # Create model
        model = keras.Model(inputs=inputs, outputs=outputs, name='payment_date_lstm')

        # Compile with Huber loss (robust to outliers)
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss=keras.losses.Huber(delta=1.0),
            metrics=['mae', 'mse']
        )

        self.model = model
        return model

    def prepare_data(self, features_df: pd.DataFrame, target_col: str = 'days_until_payment') -> Tuple:
        """
        Prepare data for LSTM training

        Returns:
            (X_train, X_val, y_train, y_val)
        """
        # Separate features and target
        y = features_df[target_col].values
        X = features_df.drop(columns=[target_col, 'investor_id', 'payment_id'], errors='ignore')

        # Normalize features
        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        X_normalized = scaler.fit_transform(X)

        # Reshape for LSTM (samples, time_steps, features)
        # For simplicity, we'll create sequences by stacking
        # In production, you'd create proper time sequences
        n_samples = len(X_normalized)
        X_reshaped = np.zeros((n_samples, self.sequence_length, self.input_dim))

        # Pad or truncate to match input_dim
        if X_normalized.shape[1] < self.input_dim:
            X_padded = np.pad(X_normalized, ((0, 0), (0, self.input_dim - X_normalized.shape[1])))
        else:
            X_padded = X_normalized[:, :self.input_dim]

        # Create sequences (for demo, repeat the features across sequence length)
        for i in range(n_samples):
            for t in range(self.sequence_length):
                X_reshaped[i, t, :] = X_padded[i]

        # Split into train/validation (80/20)
        split_idx = int(0.8 * n_samples)

        X_train = X_reshaped[:split_idx]
        X_val = X_reshaped[split_idx:]
        y_train = y[:split_idx]
        y_val = y[split_idx:]

        logger.info(f"Training samples: {X_train.shape[0]}, Validation samples: {X_val.shape[0]}")

        return X_train, X_val, y_train, y_val

    def train(self, X_train, X_val, y_train, y_val, epochs: int = 100) -> keras.callbacks.History:
        """Train the model with early stopping"""

        # Callbacks
        early_stopping = EarlyStopping(
            monitor='val_loss',
            patience=15,
            restore_best_weights=True,
            verbose=1
        )

        model_checkpoint = ModelCheckpoint(
            'payment_date_model_best.h5',
            monitor='val_loss',
            save_best_only=True,
            verbose=1
        )

        reduce_lr = ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=0.00001,
            verbose=1
        )

        # Train model
        logger.info("Starting model training...")

        self.history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=32,
            callbacks=[early_stopping, model_checkpoint, reduce_lr],
            verbose=1
        )

        logger.info("Training completed!")

        return self.history

    def evaluate(self, X_test, y_test) -> dict:
        """Evaluate model performance"""
        metrics = {}

        # Predictions
        y_pred = self.model.predict(X_test).flatten()

        # Calculate metrics
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

        metrics['mae'] = mean_absolute_error(y_test, y_pred)
        metrics['rmse'] = np.sqrt(mean_squared_error(y_test, y_pred))
        metrics['r2_score'] = r2_score(y_test, y_pred)

        # Accuracy within thresholds
        metrics['accuracy_within_1_day'] = np.mean(np.abs(y_test - y_pred) <= 1)
        metrics['accuracy_within_3_days'] = np.mean(np.abs(y_test - y_pred) <= 3)
        metrics['accuracy_within_7_days'] = np.mean(np.abs(y_test - y_pred) <= 7)

        logger.info(f"Model Evaluation Metrics:")
        logger.info(f"  MAE: {metrics['mae']:.2f} days")
        logger.info(f"  RMSE: {metrics['rmse']:.2f} days")
        logger.info(f"  R² Score: {metrics['r2_score']:.4f}")
        logger.info(f"  Accuracy (±1 day): {metrics['accuracy_within_1_day']*100:.1f}%")
        logger.info(f"  Accuracy (±3 days): {metrics['accuracy_within_3_days']*100:.1f}%")
        logger.info(f"  Accuracy (±7 days): {metrics['accuracy_within_7_days']*100:.1f}%")

        return metrics

    def save_model(self, model_path: str = 'payment_date_lstm_model'):
        """Save model to disk"""
        self.model.save(model_path)
        logger.info(f"Model saved to {model_path}")

    def load_model(self, model_path: str):
        """Load model from disk"""
        self.model = keras.models.load_model(model_path)
        logger.info(f"Model loaded from {model_path}")


def main():
    """Main training script with MLflow tracking"""

    # Start MLflow run
    with mlflow.start_run(run_name="payment_date_lstm_training"):

        # Log parameters
        mlflow.log_param("model_type", "LSTM")
        mlflow.log_param("architecture", "LSTM_128_64_Attention")
        mlflow.log_param("optimizer", "Adam")
        mlflow.log_param("learning_rate", 0.001)
        mlflow.log_param("batch_size", 32)
        mlflow.log_param("epochs", 100)

        # Generate synthetic training data (in production, load from database)
        logger.info("Generating synthetic training data...")
        n_samples = 10000

        # Create synthetic features
        features_df = pd.DataFrame({
            'investor_id': [f'INV{i:05d}' for i in range(n_samples)],
            'payment_id': [f'PAY{i:05d}' for i in range(n_samples)],
            'days_since_last_payment': np.random.randint(0, 120, n_samples),
            'avg_payment_delay_days': np.random.normal(2.5, 1.5, n_samples),
            'on_time_payment_rate': np.random.uniform(0.6, 1.0, n_samples),
            'investor_tenure_days': np.random.randint(100, 2000, n_samples),
            'portfolio_volatility': np.random.uniform(0.1, 0.3, n_samples),
            'market_volatility_30d': np.random.uniform(0.12, 0.25, n_samples),
            'recent_sentiment_score': np.random.uniform(-0.5, 0.8, n_samples),
        })

        # Generate target (days until payment)
        features_df['days_until_payment'] = (
            90 +
            features_df['avg_payment_delay_days'] * 0.5 +
            (1 - features_df['on_time_payment_rate']) * 10 +
            np.random.normal(0, 3, n_samples)
        )

        # Initialize model
        model = PaymentDateLSTMModel(input_dim=256, sequence_length=12)

        # Build architecture
        model.build_model()
        model.model.summary()

        # Prepare data
        X_train, X_val, y_train, y_val = model.prepare_data(features_df)

        # Train model
        history = model.train(X_train, X_val, y_train, y_val, epochs=100)

        # Evaluate model
        metrics = model.evaluate(X_val, y_val)

        # Log metrics to MLflow
        mlflow.log_metric("mae", metrics['mae'])
        mlflow.log_metric("rmse", metrics['rmse'])
        mlflow.log_metric("r2_score", metrics['r2_score'])
        mlflow.log_metric("accuracy_within_3_days", metrics['accuracy_within_3_days'])

        # Check performance targets
        performance_target_met = (
            metrics['mae'] <= 3.0 and
            metrics['rmse'] <= 5.0 and
            metrics['r2_score'] >= 0.90
        )

        mlflow.log_metric("performance_target_met", 1 if performance_target_met else 0)

        # Save model
        model.save_model('models/payment_date_lstm_v2.1')

        # Log model to MLflow
        mlflow.keras.log_model(model.model, "model")

        # Log model artifact
        mlflow.log_artifact('models/payment_date_lstm_v2.1')

        logger.info(f"Performance Target Met: {performance_target_met}")
        logger.info("Training completed and logged to MLflow!")


if __name__ == "__main__":
    main()
