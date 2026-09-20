import os
import re
import urllib.request
import json
import ssl

def check_token():
    print("Checking Hugging Face configuration...")
    if not os.path.exists("backend/.env"):
        print("[-] backend/.env file not found.")
        return

    with open("backend/.env", "r") as f:
        content = f.read()

    m = re.search(r"HF_API_TOKEN=(hf_[A-Za-z0-9]+)", content)
    if not m:
        print("[-] No valid HF_API_TOKEN found in backend/.env. Format must be HF_API_TOKEN=hf_xxxx...")
        return

    token = m.group(1).strip()
    print(f"[*] Found token: {token[:6]}...{token[-4:]}")
    
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        "https://huggingface.co/api/whoami",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    try:
        resp = urllib.request.urlopen(req, timeout=10, context=ctx)
        data = json.loads(resp.read())
        print(f"[+] SUCCESS: Token is VALID!")
        print(f"[+] User: {data.get('name')}")
        print(f"[+] Email: {data.get('email', 'N/A')}")
        return True
    except urllib.error.HTTPError as e:
        if e.code == 401:
            print("[-] FAILED: Token is UNAUTHORIZED (401).")
            print("    Why did this happen?")
            print("    1. You pasted the token in the AI chat thread. Hugging Face automatically")
            print("       detects tokens in chat logs and instantly revokes them for your security.")
            print("    2. The token has expired or was manually deleted.")
            print("\n[!] HOW TO FIX:")
            print("    1. Go to https://huggingface.co/settings/tokens")
            print("    2. Create a NEW 'Read' token.")
            print("    3. Edit 'backend/.env' on your computer directly. Paste the new token there.")
            print("    4. DO NOT paste the new token in the chat!")
        else:
            print(f"[-] HTTP Error: {e.code} - {e.reason}")
    except Exception as e:
        print(f"[-] Error connecting to Hugging Face: {e}")

if __name__ == "__main__":
    check_token()
