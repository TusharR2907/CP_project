/**
 * Lightning WebGL Background - Vanilla JS Implementation
 * Ported from React component to native JS class.
 * Matches Midnight Editorial Theme specifications.
 */

class LightningBackground {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        // Default to Midnight Editorial Accent (Coral #FF6B50 => hue ~12-15)
        this.hue = options.hue !== undefined ? options.hue : 15;
        this.xOffset = options.xOffset || 0;
        this.speed = options.speed || 0.8;
        this.intensity = options.intensity || 1.2;
        this.size = options.size || 0.9;

        this.gl = this.canvas.getContext('webgl', { antialias: true, alpha: true });
        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }

        this.animationFrameId = null;
        this.startTime = performance.now();
        this.program = null;
        this.uniforms = {};

        this.init();
    }

    init() {
        this.resizeCanvas = this.resizeCanvas.bind(this);
        window.addEventListener('resize', this.resizeCanvas);
        this.resizeCanvas();

        const vertexShaderSource = `
            attribute vec2 aPosition;
            void main() {
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            uniform vec2 iResolution;
            uniform float iTime;
            uniform float uHue;
            uniform float uXOffset;
            uniform float uSpeed;
            uniform float uIntensity;
            uniform float uSize;
            
            #define OCTAVE_COUNT 10

            vec3 hsv2rgb(vec3 c) {
                vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
                return c.z * mix(vec3(1.0), rgb, c.y);
            }

            float hash11(float p) {
                p = fract(p * .1031);
                p *= p + 33.33;
                p *= p + p;
                return fract(p);
            }

            float hash12(vec2 p) {
                vec3 p3 = fract(vec3(p.xyx) * .1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }

            mat2 rotate2d(float theta) {
                float c = cos(theta);
                float s = sin(theta);
                return mat2(c, -s, s, c);
            }

            float noise(vec2 p) {
                vec2 ip = floor(p);
                vec2 fp = fract(p);
                float a = hash12(ip);
                float b = hash12(ip + vec2(1.0, 0.0));
                float c = hash12(ip + vec2(0.0, 1.0));
                float d = hash12(ip + vec2(1.0, 1.0));
                
                vec2 t = smoothstep(0.0, 1.0, fp);
                return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
            }

            float fbm(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                for (int i = 0; i < OCTAVE_COUNT; ++i) {
                    value += amplitude * noise(p);
                    p *= rotate2d(0.45);
                    p *= 2.0;
                    amplitude *= 0.5;
                }
                return value;
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / iResolution.xy;
                uv = 2.0 * uv - 1.0;
                uv.x *= iResolution.x / iResolution.y;
                uv.x += uXOffset;
                
                float time = iTime * uSpeed;
                
                // Warp UV coordinates with FBM for lightning shape
                uv += 2.0 * fbm(uv * uSize + 0.8 * time) - 1.0;
                
                float dist = abs(uv.x);
                
                // Color based on hue and flickering
                vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, 0.7, 0.8));
                
                // Flickering effect
                float flicker = mix(0.0, 0.07, hash11(time));
                
                // Core discharge effect
                vec3 col = baseColor * (flicker / max(dist, 0.001)) * uIntensity;
                
                // Glow and falloff
                col = pow(col, vec3(1.1));
                
                // Make completely black areas transparent
                float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
                
                gl_FragColor = vec4(col, alpha);
            }
        `;

        const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);

        if (!vertexShader || !fragmentShader) return;

        this.program = this.gl.createProgram();
        if (!this.program) return;
        
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Program linking error:', this.gl.getProgramInfoLog(this.program));
            return;
        }

        this.gl.useProgram(this.program);

        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
        const vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        const aPosition = this.gl.getAttribLocation(this.program, 'aPosition');
        this.gl.enableVertexAttribArray(aPosition);
        this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, 0, 0);

        this.uniforms = {
            iResolution: this.gl.getUniformLocation(this.program, 'iResolution'),
            iTime: this.gl.getUniformLocation(this.program, 'iTime'),
            uHue: this.gl.getUniformLocation(this.program, 'uHue'),
            uXOffset: this.gl.getUniformLocation(this.program, 'uXOffset'),
            uSpeed: this.gl.getUniformLocation(this.program, 'uSpeed'),
            uIntensity: this.gl.getUniformLocation(this.program, 'uIntensity'),
            uSize: this.gl.getUniformLocation(this.program, 'uSize'),
        };

        this.render = this.render.bind(this);
        this.animationFrameId = requestAnimationFrame(this.render);
    }

    compileShader(source, type) {
        const shader = this.gl.createShader(type);
        if (!shader) return null;
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    resizeCanvas() {
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    render() {
        this.resizeCanvas();
        
        this.gl.uniform2f(this.uniforms.iResolution, this.canvas.width, this.canvas.height);
        const currentTime = performance.now();
        this.gl.uniform1f(this.uniforms.iTime, (currentTime - this.startTime) / 1000.0);
        this.gl.uniform1f(this.uniforms.uHue, this.hue);
        this.gl.uniform1f(this.uniforms.uXOffset, this.xOffset);
        this.gl.uniform1f(this.uniforms.uSpeed, this.speed);
        this.gl.uniform1f(this.uniforms.uIntensity, this.intensity);
        this.gl.uniform1f(this.uniforms.uSize, this.size);

        // Pre-multiplied alpha required for proper webgl blending if needed
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.enable(this.gl.BLEND);

        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        this.animationFrameId = requestAnimationFrame(this.render);
    }

    destroy() {
        window.removeEventListener('resize', this.resizeCanvas);
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    new LightningBackground("lightning-canvas", { hue: 12, speed: 0.9, intensity: 1.5 });
});
