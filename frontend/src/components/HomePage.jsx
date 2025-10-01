import React, { useState, useEffect } from 'react';

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: "bi-camera-video-fill",
      title: "3D Avatar Integration",
      description: "Lifelike Ready Player Me avatars with realistic lip-sync animation",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    },
    {
      icon: "bi-mic-fill",
      title: "Real-Time Speech Analysis",
      description: "Advanced transcription with Faster Whisper technology",
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
    },
    {
      icon: "bi-brain",
      title: "AI-Powered Feedback",
      description: "Grammar, pronunciation, semantic, and fluency scoring",
      gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
    },
    {
      icon: "bi-trophy-fill",
      title: "Progress Tracking",
      description: "Session-based analytics to monitor your improvement",
      gradient: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)"
    }
  ];

  const stats = [
    { icon: "bi-people-fill", value: "10K+", label: "Active Users" },
    { icon: "bi-chat-dots-fill", value: "500K+", label: "Practice Sessions" },
    { icon: "bi-star-fill", value: "4.9", label: "User Rating" },
    { icon: "bi-graph-up-arrow", value: "85%", label: "Improvement Rate" }
  ];

  const progress = ((activeFeature + 1) / 4) * 100;

  return (
    <div className="min-vh-100 bg-dark text-white position-relative overflow-hidden">
      <style>{`
        .hero-bg {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%);
        }
        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .feature-card {
          transition: all 0.3s ease;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .feature-card:hover {
          transform: translateY(-10px);
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3);
        }
        .feature-card.active {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        .btn-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .btn-gradient:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.5);
        }
        .btn-outline-custom {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          font-weight: 600;
          transition: all 0.3s ease;
          color: white;
        }
        .btn-outline-custom:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
          color: white;
        }
        .floating-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .pulse-dot {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .avatar-preview {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
        }
        .avatar-preview::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, transparent 0%, rgba(118, 75, 162, 0.5) 100%);
        }
        .badge-float {
          animation: bounce 2s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .stats-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .icon-box {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease;
        }
        .feature-card:hover .icon-box {
          transform: scale(1.1);
        }
        .corner-decoration {
          width: 100px;
          height: 100px;
        }
        .corner-decoration.top-left {
          border-top: 2px solid rgba(102, 126, 234, 0.3);
          border-left: 2px solid rgba(102, 126, 234, 0.3);
          border-top-left-radius: 24px;
        }
        .corner-decoration.bottom-right {
          border-bottom: 2px solid rgba(244, 114, 182, 0.3);
          border-right: 2px solid rgba(244, 114, 182, 0.3);
          border-bottom-right-radius: 24px;
        }
        .cta-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2px;
          border-radius: 24px;
        }
        .cta-inner {
          background: #0f0f1e;
          border-radius: 22px;
        }
      `}</style>

      {/* Floating Background Orbs */}
      <div className="floating-orb" style={{ top: '20%', left: '20%', width: '300px', height: '300px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}></div>
      <div className="floating-orb" style={{ top: '30%', right: '20%', width: '350px', height: '350px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', animationDelay: '1s' }}></div>
      <div className="floating-orb" style={{ bottom: '20%', left: '30%', width: '320px', height: '320px', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', animationDelay: '2s' }}></div>

      {/* Navigation */}
      <nav className="navbar navbar-expand-lg glass-card position-relative" style={{ zIndex: 1050 }}>
        <div className="container-fluid">
          <a className="navbar-brand d-flex align-items-center text-white" href="#">
            <div className="rounded-3 d-flex align-items-center justify-content-center me-2" style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <i className="bi bi-globe fs-5"></i>
            </div>
            <span className="fw-bold gradient-text fs-4">Avatar Assistant</span>
          </a>
          <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto align-items-center">
              <li className="nav-item"><a className="nav-link text-white" href="#features">Features</a></li>
              <li className="nav-item"><a className="nav-link text-white" href="#about">About</a></li>
              <li className="nav-item ms-3">
                <a href="/login" className="btn btn-outline-custom rounded-pill px-4 me-2">Login</a>
              </li>
              <li className="nav-item">
                <a href="/signup" className="btn btn-gradient rounded-pill px-4">Sign Up</a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="position-relative py-5" style={{ zIndex: 10 }}>
        <div className="container py-5">
          <div className="row align-items-center g-5">
            <div className="col-lg-6" style={{ transform: `translateY(${scrollY * 0.1}px)` }}>
              <div className="mb-3">
                <span className="badge rounded-pill px-3 py-2" style={{ background: 'rgba(102, 126, 234, 0.2)', border: '1px solid rgba(102, 126, 234, 0.3)' }}>
                  🚀 AI-Powered English Coaching
                </span>
              </div>
              <h1 className="display-2 fw-bold mb-4">
                Master Your<br />
                <span className="gradient-text">English Skills</span>
              </h1>
              <p className="lead text-white-50 mb-4">
                Practice with AI-powered 3D avatars, get real-time feedback on grammar, pronunciation, and fluency. Transform your English speaking confidence.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <button className="btn btn-gradient btn-lg rounded-pill px-4 d-flex align-items-center">
                  <span className="me-2">Start Practicing</span>
                  <i className="bi bi-arrow-right"></i>
                </button>
                <button className="btn btn-outline-custom btn-lg rounded-pill px-4 d-flex align-items-center">
                  <i className="bi bi-play-fill me-2"></i>
                  <span>Watch Demo</span>
                </button>
              </div>
            </div>

            <div className="col-lg-6" style={{ transform: `translateY(${-scrollY * 0.05}px)` }}>
              <div className="position-relative">
                <div className="avatar-preview rounded-4 p-5" style={{ height: '400px' }}>
                  <div className="position-absolute top-0 start-0 corner-decoration top-left"></div>
                  <div className="position-absolute bottom-0 end-0 corner-decoration bottom-right"></div>
                  
                  <div className="d-flex align-items-center justify-content-center h-100 position-relative" style={{ zIndex: 1 }}>
                    <div className="position-relative">
                      <div className="rounded-circle d-flex align-items-center justify-content-center pulse-dot" style={{ width: '200px', height: '200px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <i className="bi bi-camera-video-fill" style={{ fontSize: '80px', opacity: 0.8 }}></i>
                      </div>
                    </div>
                  </div>
                  
                  <div className="position-absolute bottom-0 start-0 end-0 glass-card rounded-4 p-3 m-3" style={{ zIndex: 2 }}>
                    <div className="d-flex align-items-center">
                      <div className="rounded-circle bg-success pulse-dot me-2" style={{ width: '12px', height: '12px' }}></div>
                      <small>Real-time lip sync active</small>
                    </div>
                  </div>
                </div>
                
                <div className="position-absolute badge-float badge bg-success rounded-pill px-3 py-2" style={{ top: '-20px', right: '-20px', fontSize: '14px' }}>
                  98% Accuracy
                </div>
                <div className="position-absolute badge rounded-pill px-3 py-2" style={{ bottom: '-20px', left: '-20px', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', fontSize: '14px' }}>
                  AI-Powered
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-5 stats-card position-relative" style={{ zIndex: 10 }}>
        <div className="container">
          <div className="row g-4">
            {stats.map((stat, index) => (
              <div key={index} className="col-6 col-md-3 text-center">
                <i className={`bi ${stat.icon} fs-2 text-primary mb-2`} style={{ color: '#667eea' }}></i>
                <div className="display-5 fw-bold gradient-text">{stat.value}</div>
                <div className="text-white-50 small">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-5 position-relative" style={{ zIndex: 10 }}>
        <div className="container py-5">
          <div className="text-center mb-5">
            <h2 className="display-4 fw-bold mb-3">Powerful Features</h2>
            <p className="lead text-white-50">Everything you need to ace your English Language</p>
          </div>

          <div className="row g-4">
            {features.map((feature, index) => (
              <div key={index} className="col-md-6 col-lg-3">
                <div 
                  className={`feature-card rounded-4 p-4 h-100 ${activeFeature === index ? 'active' : ''}`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className="icon-box rounded-3 mb-3" style={{ background: feature.gradient }}>
                    <i className={`bi ${feature.icon} fs-2 text-white`}></i>
                  </div>
                  <h5 className="fw-bold mb-3">{feature.title}</h5>
                  <p className="text-white-50 mb-0">{feature.description}</p>
                  <div className="mt-3 opacity-0" style={{ transition: 'opacity 0.3s' }}>
                    <i className="bi bi-arrow-right text-primary"></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-5 position-relative" style={{ zIndex: 10 }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="cta-card">
                <div className="cta-inner p-5 text-center">
                  <h2 className="display-4 fw-bold mb-4">Ready to Transform Your Skills?</h2>
                  <p className="lead text-white-50 mb-4">Join thousands of users improving their English every day</p>
                  <div className="d-flex flex-wrap justify-content-center gap-3">
                    <button className="btn btn-gradient btn-lg rounded-pill px-4">Start Free Trial</button>
                    <button className="btn btn-outline-custom btn-lg rounded-pill px-4">View Documentation</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-5 glass-card position-relative" style={{ zIndex: 10 }}>
        <div className="container">
          <div className="row g-4">
            <div className="col-md-3">
              <div className="d-flex align-items-center mb-3">
                <div className="rounded-2 d-flex align-items-center justify-content-center me-2" style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <i className="bi bi-globe"></i>
                </div>
                <span className="fw-bold">Avatar Assistant</span>
              </div>
              <p className="text-white-50 small">AI-powered English practice platform</p>
            </div>
            <div className="col-md-3">
              <h6 className="fw-bold mb-3">Product</h6>
              <ul className="list-unstyled">
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Features</a></li>
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Pricing</a></li>
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Documentation</a></li>
              </ul>
            </div>
            <div className="col-md-3">
              <h6 className="fw-bold mb-3">Company</h6>
              <ul className="list-unstyled">
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">About</a></li>
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Blog</a></li>
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Careers</a></li>
              </ul>
            </div>
            <div className="col-md-3">
              <h6 className="fw-bold mb-3">Connect</h6>
              <ul className="list-unstyled">
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">GitHub</a></li>
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Twitter</a></li>
                <li className="mb-2"><a href="#" className="text-white-50 text-decoration-none">Discord</a></li>
              </ul>
            </div>
          </div>
          <hr className="my-4 border-secondary" />
          <div className="text-center text-white-50 small">
            <p className="mb-0">© 2025 Avatar Assistant. All rights reserved. Built with ❤️ using React & Three.js</p>
          </div>
        </div>
      </footer>
    </div>
  );
}