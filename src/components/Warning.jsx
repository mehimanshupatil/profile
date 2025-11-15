import { useEffect, useRef } from 'preact/hooks';


export default function Warning({
    message = "",
    backgroundColor = "#fff3cd",
    borderColor = "#ab8e38ff",
    textColor = "#856404",
    fontSize = 16,
    padding = 20,
    borderRadius = 8,
    rotationSpeed = 0.5 // degrees per frame
}) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const rotationRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        // Measure text to size canvas appropriately
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const metrics = ctx.measureText(message);
        const textWidth = metrics.width;
        const textHeight = fontSize * 1.5;

        // Set canvas size with extra space for rotation
        const canvasWidth = textWidth * 1.5;
        const canvasHeight = textHeight;

        // Set display size
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = canvasHeight + 'px';

        // Set actual size in memory (scaled for retina displays)
        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;

        // Scale context to match device pixel ratio
        ctx.scale(dpr, dpr);

        const draw = () => {
            // Clear canvas
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);

            // Save context state
            ctx.save();

            // Move to center of canvas
            ctx.translate(canvasWidth / 2, canvasHeight / 2);

            // Rotate on X axis (3D perspective effect)
            const angle = (rotationRef.current * Math.PI) / 180;
            const scale = Math.abs(Math.cos(angle));
            ctx.scale(1, scale);

            // Calculate box dimensions
            const boxWidth = textWidth + (padding * 2);
            const boxHeight = textHeight + (padding * 2);

            // Draw background with border (centered)
            ctx.fillStyle = backgroundColor;
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;

            const radius = borderRadius;
            const x = -boxWidth / 2;
            const y = -boxHeight / 2;

            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + boxWidth - radius, y);
            ctx.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + radius);
            ctx.lineTo(x + boxWidth, y + boxHeight - radius);
            ctx.quadraticCurveTo(x + boxWidth, y + boxHeight, x + boxWidth - radius, y + boxHeight);
            ctx.lineTo(x + radius, y + boxHeight);
            ctx.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Draw text (centered)
            ctx.fillStyle = textColor;
            ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(message, 0, 0);

            // Restore context state
            ctx.restore();

            // Update rotation
            rotationRef.current += rotationSpeed;
            if (rotationRef.current >= 360) {
                rotationRef.current -= 360;
            }

            // Continue animation
            animationRef.current = requestAnimationFrame(draw);
        };

        // Start animation
        draw();

        // Cleanup
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [message, backgroundColor, borderColor, textColor, fontSize, padding, borderRadius, rotationSpeed]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
            <canvas
                ref={canvasRef}
                role="img"
                aria-label={message}
                style={{ display: 'block', maxWidth: '100%' }}
            />
        </div>
    );
};


