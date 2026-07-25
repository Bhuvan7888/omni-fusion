from app.core.supabase_client import supabase

res = supabase.table("profiles").select("id").eq("email", "demo.patient1@omnifusion.demo").execute()
print(res)
try:
    res = supabase.auth.admin.create_user({
        "email": "demo.test3@omnifusion.demo",
        "password": "DemoPassword123!",
        "email_confirm": True
    })
    print(res)
except Exception as e:
    print(e)
