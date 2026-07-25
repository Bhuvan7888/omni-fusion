import os
import tempfile
import base64
from fpdf import FPDF
from app.models.schemas import PredictResponse

class PDFService:
    """Render immutable prediction data into a temporary clinical PDF."""
    
    def __init__(self):
        self.fonts_dir = os.path.join(os.path.dirname(__file__), "../assets/fonts")
        
    def _add_fonts(self, pdf: FPDF):
        # We assume fonts are downloaded and exist
        devanagari_path = os.path.join(self.fonts_dir, "NotoSansDevanagari-Regular.ttf")
        bengali_path = os.path.join(self.fonts_dir, "NotoSansBengali-Regular.ttf")
        
        if os.path.exists(devanagari_path):
            pdf.add_font("NotoSansDevanagari", style="", fname=devanagari_path)
        if os.path.exists(bengali_path):
            pdf.add_font("NotoSansBengali", style="", fname=bengali_path)

    def generate_report(self, predict_res: dict, lang: str = "en") -> str:
        """Generate a report and return its temporary filesystem path.

        Args:
            predict_res: Prediction fields and optional explanation artifacts.
            lang: Language code (en, hi, bn)

        Returns:
            Path to a temporary PDF owned by the caller.
        """
        pdf = FPDF()
        self._add_fonts(pdf)
        pdf.add_page()
        
        # Select font based on language
        font_family = "helvetica"
        if lang == "hi":
            font_family = "NotoSansDevanagari"
        elif lang == "bn":
            font_family = "NotoSansBengali"
            
        pdf.set_font("helvetica", "B", 16)
        pdf.cell(0, 10, "Omni-Fusion Risk Prediction Report", align="C", new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font("helvetica", "", 12)
        pdf.cell(0, 10, f"Patient ID: {predict_res['patient_id']}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 10, f"Prediction ID: {predict_res['prediction_id']}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 10, f"Risk Score: {predict_res['risk_score']:.4f}", new_x="LMARGIN", new_y="NEXT")
        
        pdf.ln(5)
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(0, 10, "SHAP Feature Importances (Top 5)", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 12)
        
        shap_data = predict_res.get('shap_data', {})
        sorted_shap = sorted(shap_data.items(), key=lambda x: abs(x[1]), reverse=True)
        for feature, val in sorted_shap[:5]:
            pdf.cell(0, 8, f"- {feature}: {val:.4f}", new_x="LMARGIN", new_y="NEXT")

        if predict_res.get('failure_analysis_summary'):
            pdf.ln(5)
            pdf.set_font("helvetica", "B", 14)
            pdf.cell(0, 10, "Failure Analysis / Borderline Summary", new_x="LMARGIN", new_y="NEXT")
            
            # Use localized font for the summary text
            pdf.set_font(font_family, "", 12)
            # fpdf2 natively supports fallback fonts for mixed text, but here we just set the primary font
            pdf.multi_cell(0, 8, predict_res['failure_analysis_summary'])
        
        # Add Grad-CAM Heatmap
        b64_img = predict_res.get('ecg_gradcam_heatmap_b64')
        if b64_img:
            try:
                img_data = base64.b64decode(b64_img)
                fd_img, img_path = tempfile.mkstemp(suffix=".png")
                with os.fdopen(fd_img, 'wb') as f:
                    f.write(img_data)
                
                pdf.ln(5)
                pdf.set_font("helvetica", "B", 14)
                pdf.cell(0, 10, "ECG Grad-CAM Heatmap", new_x="LMARGIN", new_y="NEXT")
                pdf.image(img_path, w=150)
                
                os.remove(img_path)
            except Exception as e:
                pdf.set_font("helvetica", "", 12)
                pdf.cell(0, 10, f"Failed to decode Grad-CAM heatmap: {str(e)}", new_x="LMARGIN", new_y="NEXT")
                
        fd_pdf, pdf_path = tempfile.mkstemp(suffix=".pdf")
        os.close(fd_pdf)
        pdf.output(pdf_path)
        return pdf_path

pdf_service = PDFService()
