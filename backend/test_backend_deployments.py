import urllib.request
import json

url = "https://c-cweb-co390vp8f-codercorps-projects.vercel.app/api/v1/apply"
print(f"Testing public apply without auth header to: {url}")

try:
    req = urllib.request.Request(
        url,
        data=json.dumps({
            "name": "Live Test Applicant",
            "email": "atulsharma28092004@gmail.com",
            "phone": "+91 9876543210",
            "college": "DTU",
            "why_join": "Live test manual apply"
        }).encode("utf-8"),
        headers={
            "Content-Type": "application/json"
            # NO Authorization header!
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        print(f"  [SUCCESS!] Status: {resp.status}, Body: {resp.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    print(f"  [HTTP ERROR]: {e.code} ({e.reason})")
    print(f"  Response Body: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"  [FAILED]: {e}")
