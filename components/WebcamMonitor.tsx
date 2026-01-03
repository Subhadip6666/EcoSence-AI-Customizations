
import React, { useRef, useEffect, useState } from 'react';

interface WebcamMonitorProps {
  onCapture: (base64: string) => void;
  isActive: boolean;
  isProcessing: boolean;
  lastCount: number | null;
}

export const WebcamMonitor: React.FC<WebcamMonitorProps> = ({ isActive, isProcessing, lastCount }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<{title: string, message: string, type: string} | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Core initialization logic
  useEffect(() => {
    if (isActive) {
      const startCamera = async () => {
        setError(null);
        setIsInitializing(true);
        setIsReady(false);
        
        try {
          // Requesting ultra-high fidelity constraints for maximum detail extraction
          const mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'environment',
              width: { ideal: 3840, min: 1280 }, // Requesting 4K with 720p as baseline
              height: { ideal: 2160, min: 720 },
              frameRate: { ideal: 60, min: 30 }  // Requesting high frame rate for fluid HUD motion
            }, 
            audio: false 
          });
          
          setStream(mediaStream);
        } catch (err: any) {
          console.error("Camera access failed:", err);
          setError({
            title: "Uplink Error",
            message: err.name === 'NotAllowedError' ? "Permission denied. Check browser settings." : "Hardware not responding or busy.",
            type: 'hardware'
          });
        } finally {
          setIsInitializing(false);
        }
      };
      startCamera();
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
        setIsReady(false);
      }
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isActive]);

  // Stream-to-Video attachment watchdog
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.warn("Auto-play interrupted:", e));
    }
  }, [stream]);

  // Capture utility
  useEffect(() => {
    (window as any).captureCCTVFrame = () => {
      if (videoRef.current && canvasRef.current && stream && isReady) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        // Use intrinsic video dimensions for maximum capture resolution
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          // High quality JPEG for AI ingestion
          return canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
        }
      }
      return null;
    };
  }, [stream, isReady]);

  if (!isActive) return null;

  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl flex flex-col items-center justify-center group">
      {(!stream || error) ? (
        <div className="flex flex-col items-center gap-6 p-10 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className={`w-20 h-20 rounded-[1.8rem] flex items-center justify-center transition-all ${error ? 'bg-red-500/10 text-red-500' : 'bg-slate-900 text-slate-700'}`}>
            {isInitializing ? (
              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="font-black uppercase tracking-widest text-[11px] text-slate-400">
              {error ? error.title : 'Vision Initialization'}
            </h4>
            <p className="text-slate-600 text-[9px] font-bold max-w-[200px] leading-relaxed uppercase tracking-tighter">
              {error ? error.message : 'Establishing high-definition visual telemetry uplink...'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            onPlaying={() => setIsReady(true)}
            className={`w-full h-full object-cover transition-all duration-1000 grayscale ${isReady ? 'opacity-100' : 'opacity-0'} ${
              isProcessing 
                ? 'brightness-[0.7] contrast-[1.4] blur-[2px]' 
                : 'brightness-[0.7] contrast-[1.3]'
            }`}
          />
          
          {isReady && (
            <>
              {/* Decorative Frame Corners */}
              <div className="absolute inset-4 border border-white/5 rounded-[2rem] pointer-events-none z-10">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-blue-500/40 rounded-tl-3xl"></div>
                <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-blue-500/40 rounded-tr-3xl"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-blue-500/40 rounded-bl-3xl"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-blue-500/40 rounded-br-3xl"></div>
              </div>

              {/* Grid HUD Overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.08] z-10" 
                   style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.1) 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
              </div>

              {/* Top Left: Scanning Status */}
              <div className="absolute top-10 left-10 flex flex-col gap-4 z-20">
                <div className="flex items-center gap-4 bg-black/40 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/10 shadow-2xl">
                  <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-blue-500 animate-pulse shadow-[0_0_12px_#3b82f6]' : 'bg-emerald-500 shadow-[0_0_12px_#10b981]'}`}></div>
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                    {isProcessing ? 'SCANNING GRID NODE' : 'UPLINK STABLE'}
                  </span>
                </div>
                
                {isProcessing && (
                  <div className="flex items-center gap-3 px-2">
                    <div className="flex gap-1 items-end h-3">
                      <div className="w-0.5 bg-blue-500 animate-[bounce_0.6s_infinite_ease-in-out]"></div>
                      <div className="w-0.5 bg-blue-500 animate-[bounce_0.6s_infinite_0.1s_ease-in-out]"></div>
                      <div className="w-0.5 bg-blue-500 animate-[bounce_0.6s_infinite_0.2s_ease-in-out]"></div>
                    </div>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em] animate-pulse">
                      ANALYZING...
                    </span>
                  </div>
                )}
              </div>

              {/* Top Right: Encrypted Link info */}
              <div className="absolute top-10 right-10 z-20 text-right">
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl shadow-2xl">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1.5">ENCRYPTED LINK</p>
                  <p className="text-[11px] font-black text-blue-500 font-mono tracking-widest uppercase">
                    NODE_S_{videoRef.current?.videoWidth ? '102' : 'INIT'}
                  </p>
                </div>
              </div>
              {/* Digital Grid */}
              <div className="absolute inset-0 pointer-events-none opacity-10 animate-grid" 
                style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
              </div>

              {/* Scanning Horizontal Line */}
              {isProcessing && (
                <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                  <div className="absolute left-0 w-full h-[1px] bg-blue-400 shadow-[0_0_15px_#3b82f6] animate-scan opacity-80"></div>
                  <div className="absolute inset-0 bg-blue-500/5 animate-flicker"></div>
                </div>
              )}

              {/* Bottom Info: Entity Count */}
              {lastCount !== null && !isProcessing && (
                <div className="absolute bottom-10 left-10 bg-blue-600/90 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/10 shadow-2xl z-20 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-blue-100 uppercase tracking-[0.3em] block mb-0.5 opacity-70">Grid Presence</span>
                    <span className="text-lg font-black text-white tabular-nums tracking-tighter">{lastCount} Entities Logged</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Initial Sync Loader */}
          {!isReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-40">
               <div className="w-12 h-12 border-2 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mb-6 shadow-[0_0_20px_rgba(59,130,246,0.1)]"></div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] animate-pulse">Syncing Grid Node...</span>
            </div>
          )}
        </>
      )}
      <canvas ref={canvasRef} className="hidden" />
      <style>{`
        @keyframes bounce {
          0%, 100% { height: 4px; }
          50% { height: 12px; }
        }
      `}</style>
    </div>
  );
};
