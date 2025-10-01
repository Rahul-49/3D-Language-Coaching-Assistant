import os
from flask import Flask, jsonify
from flask_cors import CORS
from .routes.session import session_bp
from .routes.auth import auth_bp
from .routes.check import check_bp
from .routes.onboarding import onboarding_bp
from .routes.tts import tts_bp
import asyncio
from aiortc import RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.media import MediaBlackhole
from flask import request
from dotenv import load_dotenv


def create_app() -> Flask:
    # Load .env so GOOGLE_API_KEY and other settings are available
    load_dotenv()
    app = Flask(__name__)
    CORS(app)
    # Blueprints
    app.register_blueprint(session_bp, url_prefix='/api/session')
    app.register_blueprint(check_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(onboarding_bp, url_prefix='/api/onboarding')
    app.register_blueprint(tts_bp, url_prefix='/api')

    @app.get('/health')
    def health():
        return jsonify({"status": "ok"})

    pcs = set()

    @app.post('/webrtc/offer')
    def webrtc_offer():
        """
        Accept a WebRTC SDP offer, create an aiortc RTCPeerConnection, and return an SDP answer.
        Frontend should POST JSON: { sdp, type }
        """
        data = request.get_json(silent=True) or {}
        sdp = data.get('sdp')
        type_ = data.get('type')
        if not sdp or not type_:
            return jsonify({"error": "missing sdp/type"}), 400

        offer = RTCSessionDescription(sdp=sdp, type=type_)
        pc = RTCPeerConnection()
        pcs.add(pc)
        media_blackhole = MediaBlackhole()

        @pc.on("track")
        async def on_track(track):
            # Consume incoming audio tracks to keep pipeline alive
            await media_blackhole.start()
            media_blackhole.addTrack(track)

        @pc.on("datachannel")
        def on_datachannel(channel):
            # Echo messages for connectivity test
            @channel.on("message")
            def on_message(message):
                try:
                    channel.send(message)
                except Exception:
                    pass

        async def process():
            await pc.setRemoteDescription(offer)
            # Ensure we can receive audio from client
            pc.addTransceiver("audio", direction="recvonly")
            answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            return pc.localDescription

        local = asyncio.run(process())
        return jsonify({"sdp": local.sdp, "type": local.type})

    # Ensure SECRET_KEY exists for future session-based features
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    return app


app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)
