import os
import json
import base64
import io
import torch
import torch.nn.functional as F
import numpy as np
import shap
from captum.attr import LayerGradCam
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from app.core.config import settings
from app.models.networks import ResNet1D, VitalsMLP, HistoricalGRU, OmniFusionNet
from app.models.schemas import PredictRequest, PredictResponse

device = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')

class InferenceService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(InferenceService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        print("Initializing InferenceService singleton...", flush=True)
        # Load configs
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        models_dir = os.path.join(base_dir, 'models')
        
        # If running in docker, models is mounted at /models
        if not os.path.exists(models_dir) and os.path.exists('/models'):
            models_dir = '/models'

        with open(os.path.join(models_dir, 'checkpoints', 'ecg_branch_config.json'), 'r') as f:
            cfg_ecg = json.load(f)
        model_ecg = ResNet1D(12, cfg_ecg['num_classes'], cfg_ecg['depth'], cfg_ecg['dropout'])

        with open(os.path.join(models_dir, 'checkpoints', 'vitals_branch_config.json'), 'r') as f:
            cfg_vitals = json.load(f)
        model_vitals = VitalsMLP(cfg_vitals['input_dim'], cfg_vitals['hidden_dim'], cfg_vitals['num_layers'], cfg_vitals['dropout'])

        with open(os.path.join(models_dir, 'checkpoints', 'historical_branch_config.json'), 'r') as f:
            cfg_hist = json.load(f)
        model_hist = HistoricalGRU(cfg_hist['input_dim'], cfg_hist['hidden_dim'], cfg_hist['num_layers'], cfg_hist['dropout'])

        ecg_emb_dim = model_ecg.fc.in_features
        vitals_emb_dim = model_vitals.net[-1].in_features
        hist_emb_dim = model_hist.fc.in_features

        import torch.nn as nn
        model_ecg.fc = nn.Identity()
        model_vitals.net[-1] = nn.Identity()
        model_hist.fc = nn.Identity()

        self.model = OmniFusionNet(model_ecg, model_vitals, model_hist, ecg_emb_dim, vitals_emb_dim, hist_emb_dim).to(device)
        
        model_path = settings.model_path
        if not os.path.exists(model_path) and model_path.startswith('../models'):
            model_path = model_path.replace('../models', models_dir)
            
        self.model.load_state_dict(torch.load(model_path, weights_only=True, map_location=device))
        self.model.eval()

        # Initialize LayerGradCam
        self.layer_gc = LayerGradCam(self.model, self.model.ecg_net.layer[-1])

        # Feature columns for Tabular
        self.feature_cols = ['anchor_age', 'gender', 'Creatinine', 'Glucose', 'Potassium', 'Sodium', 'HR', 'SBP', 'DBP', 'RR', 'O2']
        self.feature_names = [f"Vital_{c}" for c in self.feature_cols] + [f"Hist_{c}" for c in self.feature_cols]

        # SHAP Background (dummy zeros for backend)
        self.bg_summary = np.zeros((1, 22), dtype=np.float32)
        print("InferenceService initialization complete.", flush=True)

    def predict(self, req: PredictRequest) -> PredictResponse:
        vitals_arr = np.array([[getattr(req.vitals, c) for c in self.feature_cols]], dtype=np.float32)
        
        if req.historical:
            hist_arr = np.array([[getattr(req.historical, c) for c in self.feature_cols]], dtype=np.float32)
            streams_used = ["ecg", "vitals", "historical"]
        else:
            hist_arr = np.zeros((1, len(self.feature_cols)), dtype=np.float32)
            streams_used = ["ecg", "vitals"]

        pat_tabular = np.concatenate([vitals_arr, hist_arr], axis=1)

        v_t = torch.tensor(vitals_arr).to(device)
        h_t = torch.tensor(hist_arr).unsqueeze(1).to(device)
        
        ecg_np = np.array(req.ecg, dtype=np.float32).reshape(1, 12, 1000)
        pat_ecg = torch.tensor(ecg_np).to(device)

        with torch.no_grad():
            logits = self.model(pat_ecg, v_t, h_t)
            prob = torch.softmax(logits, dim=1).cpu().numpy()[0, 1]

        # Tabular SHAP
        def predict_fn(tabular_array):
            v = tabular_array[:, :len(self.feature_cols)]
            h = tabular_array[:, len(self.feature_cols):]
            v_tensor = torch.tensor(v, dtype=torch.float32).to(device)
            h_tensor = torch.tensor(h, dtype=torch.float32).unsqueeze(1).to(device)
            e_tensor = pat_ecg.repeat(tabular_array.shape[0], 1, 1)
            with torch.no_grad():
                l = self.model(e_tensor, v_tensor, h_tensor)
                p = torch.softmax(l, dim=1).cpu().numpy()[:, 1]
            return p

        explainer = shap.KernelExplainer(predict_fn, self.bg_summary)
        shap_vals = explainer.shap_values(pat_tabular)
        shap_dict = {self.feature_names[i]: float(shap_vals[0][i]) for i in range(len(self.feature_names))}

        # ECG Grad-CAM
        attr = self.layer_gc.attribute(inputs=pat_ecg, additional_forward_args=(v_t, h_t), target=1)
        attr = F.interpolate(attr, size=ecg_np.shape[2], mode='linear').squeeze().cpu().detach().numpy()

        ecg_signal = ecg_np[0, 0, :]
        fig, ax = plt.subplots(figsize=(10, 3))
        ax.plot(ecg_signal, color='black', linewidth=1)
        extent = [0, ecg_np.shape[2], np.min(ecg_signal)-0.5, np.max(ecg_signal)+0.5]
        im = ax.imshow(attr[np.newaxis, :], cmap='jet', aspect='auto', alpha=0.5, extent=extent)
        plt.colorbar(im, ax=ax, label='Grad-CAM Activation')
        ax.set_title(f"{req.patient_id} ECG Grad-CAM (Target=1)")
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        gc_b64 = base64.b64encode(buf.read()).decode('utf-8')

        # Failure Analysis Summary
        sorted_features = sorted(shap_dict.items(), key=lambda x: x[1])
        top_pushing = sorted_features[-2:]
        top_pulling = sorted_features[:2]
        pred_str = "High Risk (Mortality)" if prob > 0.5 else "Low Risk (Survival)"
        summary = f"Model predicted {pred_str}. "
        if prob > 0.5:
            summary += f"It overly weighted {top_pushing[1][0]} and {top_pushing[0][0]} towards risk, while underestimating the protective impact of {top_pulling[0][0]}."
        else:
            summary += f"It overly relied on {top_pulling[0][0]} and {top_pulling[1][0]} to predict safety, while ignoring the risk indicators from {top_pushing[1][0]}."

        return PredictResponse(
            patient_id=req.patient_id,
            risk_score=float(prob),
            shap_data=shap_dict,
            ecg_gradcam_heatmap_b64=gc_b64,
            failure_analysis_summary=summary,
            streams_used=streams_used
        )

# Instantiate the singleton so it loads exactly once on module import
inference_service = InferenceService()
