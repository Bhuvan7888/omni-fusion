Phase 9 Verification: Supabase Tables
--------------------------------------------------
1. upload_sessions row:
[{'id': 'e03705d9-20fa-4370-a083-8348e1b9d361', 'created_at': '2026-07-09T12:21:01.339614+00:00', 'source_filename': 'uploaded.csv', 'row_count': 1, 'imputation_summary': {}, 'status': 'PROCESSED'}]
--------------------------------------------------
2. predictions row:
[{'id': '23fe3fec-91ac-4a8d-b8b8-4a1331471336', 'created_at': '2026-07-09T12:21:02.325837+00:00', 'upload_session_id': 'e03705d9-20fa-4370-a083-8348e1b9d361', 'risk_score': 0, 'streams_used': ['ecg', 'vitals', 'historical'], 'raw_input_ref': {'has_vitals': True, 'patient_id': 'patient_13', 'has_historical': True, 'has_upload_session': True}}]
--------------------------------------------------
3. reports row:
[{'id': '37746fa8-0005-428c-97a1-ea57eb1aa397', 'created_at': '2026-07-09T12:21:04.303931+00:00', 'prediction_id': '23fe3fec-91ac-4a8d-b8b8-4a1331471336', 'shap_data': {'Hist_HR': 0.0, 'Hist_O2': 0.0, 'Hist_RR': 0.0, 'Hist_DBP': 0.0, 'Hist_SBP': -0.01676048886573603, 'Vital_HR': 0.01664603699586296, 'Vital_O2': -0.04804844488618114, 'Vital_RR': 0.0, 'Vital_DBP': -0.04988733474980419, 'Vital_SBP': -0.05078183200035419, 'Hist_Sodium': 0.0, 'Hist_gender': 0.0, 'Hist_Glucose': -0.02344626490325684, 'Vital_Sodium': -0.03518785008931709, 'Vital_gender': 0.016905796397337552, 'Vital_Glucose': -0.04815383772417646, 'Hist_Potassium': 0.0, 'Hist_Creatinine': 0.0, 'Hist_anchor_age': 0.0, 'Vital_Potassium': 0.0633181201390028, 'Vital_Creatinine': 0.0, 'Vital_anchor_age': 0.0}, 'gradcam_ref': 'embedded_in_pdf', 'failure_analysis_text': 'Model predicted Low Risk (Survival). It overly relied on Vital_SBP and Vital_DBP to predict safety, while ignoring the risk indicators from Vital_Potassium.', 'pdf_storage_path': 'generated_reports/23fe3fec-91ac-4a8d-b8b8-4a1331471336_22c5f4f1.pdf'}]
--------------------------------------------------
4. Sample Generated PDF URL:
https://wvwzfhbohtbqxpiypioo.supabase.co/storage/v1/object/sign/reports/generated_reports/23fe3fec-91ac-4a8d-b8b8-4a1331471336_22c5f4f1.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wOTA5YjFkZC00ZTA5LTQ1ZTYtOTBkYS05ODFmMzY3YWJlYzUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL2dlbmVyYXRlZF9yZXBvcnRzLzIzZmUzZmVjLTkxYWMtNGE4ZC1iOGI4LTRhMTMzMTQ3MTMzNl8yMmM1ZjRmMS5wZGYiLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzgzNTk5ODMwLCJleHAiOjE3ODM2MDM0MzB9.rIZWFm1LfFjeItRB49UEwqNsXaIYywRcWK-Q1_O_MDg
