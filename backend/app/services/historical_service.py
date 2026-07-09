import uuid
import pandas as pd
import io
import json
from sklearn.impute import KNNImputer
from app.core.supabase_client import supabase

class HistoricalService:
    def process_csv_upload(self, csv_bytes: bytes) -> dict:
        try:
            df = pd.read_csv(io.BytesIO(csv_bytes))
        except Exception as e:
            raise ValueError(f"Failed to parse CSV: {str(e)}")
        
        row_count = len(df)
        if row_count == 0:
            raise ValueError("CSV is empty.")
            
        missing_before = df.isnull().sum().to_dict()
        
        # Fit KNN
        n_neighbors = min(5, row_count)
        if n_neighbors < 1:
            n_neighbors = 1
            
        # We only impute numeric columns
        numeric_df = df.select_dtypes(include=['number'])
        
        if len(numeric_df.columns) > 0:
            imputer = KNNImputer(n_neighbors=n_neighbors)
            imputed_arr = imputer.fit_transform(numeric_df)
            df[numeric_df.columns] = imputed_arr
            
        missing_after = df.isnull().sum().to_dict()
        
        imputation_summary = {
            col: int(missing_before[col] - missing_after.get(col, 0))
            for col in missing_before if missing_before[col] > 0
        }
        
        session_id = str(uuid.uuid4())
        
        # Insert into upload_sessions
        data, count = supabase.table('upload_sessions').insert({
            'id': session_id,
            'source_filename': 'uploaded.csv',
            'row_count': row_count,
            'imputation_summary': imputation_summary,
            'status': 'PROCESSED'
        }).execute()
        
        # Calculate means for the required feature columns to use as historical baseline
        feature_cols = ['anchor_age', 'gender', 'Creatinine', 'Glucose', 'Potassium', 'Sodium', 'HR', 'SBP', 'DBP', 'RR', 'O2']
        aggregated_data = {}
        for col in feature_cols:
            if col in df.columns:
                aggregated_data[col] = float(df[col].mean())
            else:
                aggregated_data[col] = 0.0

        return {
            "session_id": session_id,
            "row_count": row_count,
            "imputation_summary": imputation_summary,
            "status": "PROCESSED",
            "aggregated_data": aggregated_data
        }

historical_service = HistoricalService()
