import json
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = 8765
REDIRECT_URI = f"http://127.0.0.1:{PORT}/"
SCOPE = "https://www.googleapis.com/auth/drive.file"

with open("secrets/oauth-client.json") as f:
    client = json.load(f)

auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
    "client_id": client["client_id"],
    "redirect_uri": REDIRECT_URI,
    "response_type": "code",
    "scope": SCOPE,
    "access_type": "offline",
    "prompt": "consent",
    "login_hint": "bottazzi.100@gmail.com",
})

redirect_page = "/tmp/oauth-redirect.html"
with open(redirect_page, "w") as f:
    f.write(
        f'<html><body style="font-family:sans-serif;text-align:center;margin-top:20vh">'
        f'<h2>Autorización de Google Drive</h2>'
        f'<p><a href="{auth_url}" style="font-size:1.3rem">Hacé click acá para continuar</a></p>'
        f'</body></html>'
    )

print(f"\nAbriendo página local con el link de login: file://{redirect_page}")
opened = webbrowser.open(f"file://{redirect_page}")
if not opened:
    print("\nNo se pudo abrir el navegador automáticamente. Abrí esto a mano:")
    print(f"file://{redirect_page}")
print(f"\nEsperando el callback en {REDIRECT_URI} ...\n")

result = {}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        self.send_response(200)
        self.send_header("Content-type", "text/html; charset=utf-8")
        self.end_headers()
        if "code" in params:
            result["code"] = params["code"][0]
            self.wfile.write("<h2>Listo, ya podés cerrar esta pestaña.</h2>".encode())
        else:
            result["error"] = params.get("error", ["unknown_error"])[0]
            self.wfile.write(f"<h2>Error: {result['error']}</h2>".encode())

    def log_message(self, format, *args):
        pass


server = HTTPServer(("127.0.0.1", PORT), Handler)
server.handle_request()

if "error" in result:
    raise SystemExit(f"OAuth error: {result['error']}")

token_response = urllib.request.urlopen(
    urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=urllib.parse.urlencode({
            "code": result["code"],
            "client_id": client["client_id"],
            "client_secret": client["client_secret"],
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        }).encode(),
        method="POST",
    )
)
tokens = json.loads(token_response.read())

if "refresh_token" not in tokens:
    raise SystemExit(f"No vino refresh_token en la respuesta: {tokens}")

with open("secrets/oauth-tokens.json", "w") as f:
    json.dump(tokens, f, indent=2)

print("Refresh token guardado en secrets/oauth-tokens.json")

# drive.file scope only grants access to files the app itself created, so the
# folder for receipts has to be created through this same authorized token
# (the one from the earlier gcloud/service-account setup doesn't count).
# Only done on first run — re-running this script to renew an expired token
# should reuse the existing folder, not create a new one each time.
try:
    with open("secrets/drive-folder.json") as f:
        folder = json.load(f)
    print(f"Reusando carpeta de comprobantes ya existente: {folder['name']} ({folder['id']})")
except FileNotFoundError:
    folder_request = urllib.request.Request(
        "https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink",
        data=json.dumps({
            "name": "Comprobantes - Sucesión (adjuntos)",
            "mimeType": "application/vnd.google-apps.folder",
        }).encode(),
        headers={
            "Authorization": f"Bearer {tokens['access_token']}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    folder = json.loads(urllib.request.urlopen(folder_request).read())
    print(f"Carpeta de comprobantes creada: {folder['name']} ({folder['id']})")
    print(folder["webViewLink"])

    with open("secrets/drive-folder.json", "w") as f:
        json.dump(folder, f, indent=2)
