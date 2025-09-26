// Basic WebRTC client placeholder to be extended for audio downstream and data channel

export class WebRTCClient {
  constructor() {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    this.dataChannel = this.pc.createDataChannel('data')
    this.onMessage = () => {}
    this.dataChannel.onmessage = (e) => this.onMessage(JSON.parse(e.data))
    this.pc.onconnectionstatechange = () => {
      console.log('WebRTC state:', this.pc.connectionState)
    }
  }

  async addMic() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(t => this.pc.addTrack(t, stream))
  }

  async connect() {
    await this.addMic()
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)

    // Send to backend and set answer
    const res = await fetch('/webrtc/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdp: offer.sdp, type: offer.type })
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error('webrtc offer failed: ' + txt)
    }
    const answer = await res.json()
    await this.pc.setRemoteDescription(answer)

    return true
  }
}
