"""
Advanced AI Phase 3 - MLflow Configuration and Model Registry Setup
Experiment tracking, model versioning, and deployment management
"""

import mlflow
import mlflow.pyfunc
import mlflow.keras
import mlflow.sklearn
import os
from typing import Dict, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MLflowModelRegistry:
    """MLflow Model Registry for managing ML models"""

    def __init__(self, tracking_uri: str = "http://localhost:5000"):
        """
        Initialize MLflow configuration

        Args:
            tracking_uri: MLflow tracking server URI
        """
        self.tracking_uri = tracking_uri
        mlflow.set_tracking_uri(tracking_uri)

        # Set experiment
        self.experiment_name = "clearway-ai-phase3"
        mlflow.set_experiment(self.experiment_name)

        logger.info(f"MLflow tracking URI: {tracking_uri}")
        logger.info(f"Experiment: {self.experiment_name}")

    def register_model(
        self,
        model_name: str,
        model_version: str,
        model_path: str,
        model_type: str,
        metrics: Dict,
        parameters: Dict,
        tags: Optional[Dict] = None
    ) -> str:
        """
        Register a trained model to MLflow Model Registry

        Args:
            model_name: Name of the model
            model_version: Version string (e.g., "v2.1")
            model_path: Path to saved model
            model_type: Type of model (LSTM, XGBoost, BERT, etc.)
            metrics: Performance metrics dict
            parameters: Model hyperparameters dict
            tags: Optional tags

        Returns:
            Model URI in registry
        """
        with mlflow.start_run(run_name=f"{model_name}_{model_version}"):

            # Log parameters
            for param_name, param_value in parameters.items():
                mlflow.log_param(param_name, param_value)

            # Log metrics
            for metric_name, metric_value in metrics.items():
                mlflow.log_metric(metric_name, metric_value)

            # Log tags
            if tags:
                for tag_name, tag_value in tags.items():
                    mlflow.set_tag(tag_name, tag_value)

            # Log model metadata
            mlflow.set_tag("model_name", model_name)
            mlflow.set_tag("model_version", model_version)
            mlflow.set_tag("model_type", model_type)

            # Log model artifact
            if model_type in ["LSTM", "Neural Network"]:
                mlflow.keras.log_model(model_path, artifact_path="model")
            elif model_type in ["XGBoost", "LightGBM", "CatBoost"]:
                mlflow.sklearn.log_model(model_path, artifact_path="model")
            else:
                mlflow.log_artifact(model_path)

            # Register model
            model_uri = f"runs:/{mlflow.active_run().info.run_id}/model"
            registered_model = mlflow.register_model(
                model_uri=model_uri,
                name=model_name
            )

            logger.info(f"Model registered: {model_name} version {registered_model.version}")

            return model_uri

    def transition_model_stage(
        self,
        model_name: str,
        version: int,
        stage: str
    ):
        """
        Transition model to different stage

        Stages:
        - None: Initial state
        - Staging: Model being tested
        - Production: Model in production
        - Archived: Model archived

        Args:
            model_name: Name of registered model
            version: Model version number
            stage: Target stage
        """
        client = mlflow.tracking.MlflowClient()

        client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage=stage
        )

        logger.info(f"Model {model_name} version {version} transitioned to {stage}")

    def get_production_model(self, model_name: str):
        """Get latest production model"""
        client = mlflow.tracking.MlflowClient()

        # Get latest production version
        production_versions = client.get_latest_versions(
            name=model_name,
            stages=["Production"]
        )

        if not production_versions:
            logger.warning(f"No production version found for {model_name}")
            return None

        latest_version = production_versions[0]
        model_uri = f"models:/{model_name}/{latest_version.version}"

        logger.info(f"Loading production model: {model_name} version {latest_version.version}")

        return mlflow.pyfunc.load_model(model_uri)

    def compare_models(self, model_name: str, version_a: int, version_b: int) -> Dict:
        """
        Compare two model versions

        Returns:
            Comparison metrics
        """
        client = mlflow.tracking.MlflowClient()

        # Get model versions
        version_a_info = client.get_model_version(model_name, version_a)
        version_b_info = client.get_model_version(model_name, version_b)

        # Get run details
        run_a = client.get_run(version_a_info.run_id)
        run_b = client.get_run(version_b_info.run_id)

        comparison = {
            "model_name": model_name,
            "version_a": {
                "version": version_a,
                "metrics": run_a.data.metrics,
                "parameters": run_a.data.params,
                "stage": version_a_info.current_stage
            },
            "version_b": {
                "version": version_b,
                "metrics": run_b.data.metrics,
                "parameters": run_b.data.params,
                "stage": version_b_info.current_stage
            }
        }

        return comparison

    def setup_model_monitoring(self, model_name: str):
        """
        Set up model monitoring and alerting

        Monitors:
        - Prediction volume
        - Model performance metrics
        - Data drift
        - Model drift
        """
        logger.info(f"Setting up monitoring for {model_name}")

        # In production, would set up:
        # - Prometheus metrics
        # - Grafana dashboards
        # - Alert rules
        # - Data quality checks

        return {
            "monitoring_enabled": True,
            "metrics_tracked": [
                "prediction_volume",
                "average_confidence",
                "error_rate",
                "latency_p95"
            ],
            "alert_thresholds": {
                "error_rate_threshold": 0.05,
                "latency_threshold_ms": 100,
                "drift_threshold": 0.1
            }
        }

    def create_ab_test(
        self,
        model_name: str,
        version_a: int,
        version_b: int,
        traffic_split: float = 0.5
    ) -> str:
        """
        Create A/B test between two model versions

        Args:
            model_name: Model name
            version_a: First version to test
            version_b: Second version to test
            traffic_split: Percentage of traffic to version_a (0-1)

        Returns:
            A/B test ID
        """
        import uuid

        test_id = f"AB_TEST_{uuid.uuid4().hex[:12]}"

        ab_test_config = {
            "test_id": test_id,
            "model_name": model_name,
            "version_a": version_a,
            "version_b": version_b,
            "traffic_split_a": traffic_split,
            "traffic_split_b": 1 - traffic_split,
            "status": "RUNNING",
            "start_date": "2025-11-19"
        }

        logger.info(f"A/B test created: {test_id}")
        logger.info(f"Version {version_a}: {traffic_split*100}% traffic")
        logger.info(f"Version {version_b}: {(1-traffic_split)*100}% traffic")

        return test_id


def setup_mlflow_environment():
    """Set up MLflow environment and tracking server"""

    # Set up tracking directory
    tracking_dir = os.path.join(os.getcwd(), "mlruns")
    os.makedirs(tracking_dir, exist_ok=True)

    # Set environment variables
    os.environ["MLFLOW_TRACKING_URI"] = f"file://{tracking_dir}"
    os.environ["MLFLOW_REGISTRY_URI"] = f"file://{tracking_dir}"

    logger.info(f"MLflow tracking directory: {tracking_dir}")

    # Initialize experiments
    experiments = [
        "clearway-ai-phase3",
        "payment-predictions",
        "risk-modeling",
        "portfolio-optimization",
        "nlp-queries",
        "document-classification",
        "sentiment-analysis"
    ]

    for exp_name in experiments:
        try:
            mlflow.create_experiment(exp_name)
            logger.info(f"Created experiment: {exp_name}")
        except Exception:
            logger.info(f"Experiment already exists: {exp_name}")

    logger.info("MLflow environment setup complete!")


# Example usage
if __name__ == "__main__":
    # Set up MLflow environment
    setup_mlflow_environment()

    # Initialize registry
    registry = MLflowModelRegistry()

    # Example: Register payment date prediction model
    model_metrics = {
        "mae": 2.8,
        "rmse": 4.5,
        "r2_score": 0.92,
        "accuracy_within_3_days": 0.91
    }

    model_parameters = {
        "model_type": "LSTM",
        "architecture": "LSTM_128_64_Attention",
        "optimizer": "Adam",
        "learning_rate": 0.001,
        "batch_size": 32,
        "epochs": 100
    }

    model_tags = {
        "use_case": "payment_date_prediction",
        "algorithm": "LSTM",
        "framework": "TensorFlow"
    }

    # Register model (in production, model_path would be actual trained model)
    # model_uri = registry.register_model(
    #     model_name="payment_date_prediction",
    #     model_version="v2.1",
    #     model_path="models/payment_date_lstm_v2.1",
    #     model_type="LSTM",
    #     metrics=model_metrics,
    #     parameters=model_parameters,
    #     tags=model_tags
    # )

    # Set up monitoring
    monitoring_config = registry.setup_model_monitoring("payment_date_prediction")

    logger.info("MLflow setup complete!")
