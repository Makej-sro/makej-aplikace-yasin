#!/usr/bin/env python3
"""Vývojový server pro www/ — posílá Cache-Control: no-store.

Proč: appka v telefonu i v simulátoru běží ve WKWebView, který si index.html
(jediný soubor bez ?v=) drží v cache a bez hlavičky se serveru ani nezeptá,
jestli je novější. Pak vidíš staré obrazovky, i když je na disku nová verze.

Spuštění:  python3 dev-server.py [port]     (výchozí 4000)
Zastavení: Ctrl+C
"""
import sys, functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4000
    h = functools.partial(Handler, directory='www')
    print(f'www/ běží na http://0.0.0.0:{port}  (bez cache)')
    ThreadingHTTPServer(('', port), h).serve_forever()
