"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { X, RotateCcw } from "lucide-react";

interface SignaturePadProps {
  onSignatureChange: (signature: string | null) => void;
  width?: number;
  height?: number;
  className?: string;
}

export function SignaturePad({ 
  onSignatureChange, 
  width = 400, 
  height = 200, 
  className = "" 
}: SignaturePadProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [hasSignature, setHasSignature] = React.useState(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Set drawing styles
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Clear canvas
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x: number, y: number;

    if (e.type === 'touchstart' || e.type === 'touchmove') {
      const touch = (e as React.TouchEvent<HTMLCanvasElement>).touches[0];
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    } else {
      const mouseEvent = e as React.MouseEvent<HTMLCanvasElement>;
      x = mouseEvent.clientX - rect.left;
      y = mouseEvent.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x: number, y: number;

    if (e.type === 'touchmove') {
      const touch = (e as React.TouchEvent<HTMLCanvasElement>).touches[0];
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    } else {
      const mouseEvent = e as React.MouseEvent<HTMLCanvasElement>;
      x = mouseEvent.clientX - rect.left;
      y = mouseEvent.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if there's any signature data by looking for non-white pixels
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let hasSignatureData = false;

    // Check for non-white pixels (signature data)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Look for black pixels (signature) - not white (255,255,255) and not transparent
      if (r < 250 && g < 250 && b < 250 && a > 0) {
        hasSignatureData = true;
        break;
      }
    }

    if (hasSignatureData) {
      setHasSignature(true);
      const signatureData = canvas.toDataURL("image/png");
      onSignatureChange(signatureData);
    } else {
      setHasSignature(false);
      onSignatureChange(null);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setHasSignature(false);
    onSignatureChange(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
        <canvas
          ref={canvasRef}
          className="border border-gray-200 rounded cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ width: `${width}px`, height: `${height}px` }}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {hasSignature ? (
            <span className="text-green-600 flex items-center gap-1">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              Signature captured
            </span>
          ) : (
            <span className="text-gray-500">Please sign above</span>
          )}
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Clear
        </Button>
      </div>
    </div>
  );
} 