from flask import Flask
from flask_sock import Sock
from transcript_socket import register_transcript_ws

def create_app():
    app = Flask(__name__)
    sock = Sock(app)
    
    # Register WebSocket routes
    register_transcript_ws(sock)

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return response
    
    @app.route('/')
    def index():
        return {"message": "RapidDx Backend API", "version": "1.0.0"}
    
    @app.route('/health')
    def health():
        return {"status": "healthy"}
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
