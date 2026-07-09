import os
import tempfile
import base64
from fpdf import FPDF
from app.models.schemas import PredictResponse

class PDFService:
    @staticmethod
    def generate_report(predict_res: dict) -> str:
        """
        Generates a PDF report and returns the path to the temporary PDF file.
        predict_res should be a dict of the PredictResponse.
        """
        pdf = FPDF()
        pdf.add_page()
        
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
        # Sort by absolute value to get most impactful features
        sorted_shap = sorted(shap_data.items(), key=lambda x: abs(x[1]), reverse=True)
        for feature, val in sorted_shap[:5]:
            pdf.cell(0, 8, f"- {feature}: {val:.4f}", new_x="LMARGIN", new_y="NEXT")

        if predict_res.get('failure_analysis_summary'):
            pdf.ln(5)
            pdf.set_font("helvetica", "B", 14)
            pdf.cell(0, 10, "Failure Analysis / Borderline Summary", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("helvetica", "", 12)
            pdf.multi_cell(0, 8, predict_res['failure_analysis_summary'])
        
        # Add Grad-CAM Heatmap
        b64_img = predict_res.get('ecg_gradcam_heatmap_b64')
        if b64_img:
            try:
                img_data = base64.b64decode(b64_img)
                # Create a temporary file for the image
                fd_img, img_path = tempfile.mkstemp(suffix=".png")
                with os.fdopen(fd_img, 'wb') as f:
                    f.write(img_data)
                
                pdf.ln(5)
                pdf.set_font("helvetica", "B", 14)
                pdf.cell(0, 10, "ECG Grad-CAM Heatmap", new_x="LMARGIN", new_y="NEXT")
                pdf.image(img_path, w=150)
                
                # Cleanup the temp image
                os.remove(img_path)
            except Exception as e:
                pdf.cell(0, 10, f"Failed to decode Grad-CAM heatmap: {str(e)}", new_x="LMARGIN", new_y="NEXT")
                
        fd_pdf, pdf_path = tempfile.mkstemp(suffix=".pdf")
        os.close(fd_pdf)
        pdf.output(pdf_path)
        return pdf_path

pdf_service = PDFService()
