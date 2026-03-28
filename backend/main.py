from flask import Flask
from flask_sock import Sock
from spaghetti import scispacy_bp
from transcription import register_transcription_ws

def create_app():
    app = Flask(__name__)
    sock = Sock(app)
    
    # Register blueprints
    app.register_blueprint(scispacy_bp)
    
    # Register WebSocket routes
    register_transcription_ws(sock)
    
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
