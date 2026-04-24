/**
 * ZORA AI - Onboarding Module
 * ===========================
 * Shared client-side logic for the onboarding flow.
 */

const ONBOARDING_STORAGE_KEYS = {
    NAME: 'zora_onboarding_name',
    TOPICS: 'zora_onboarding_topics'
};

function setStatusMessage(element, message = '') {
    if (element) {
        element.textContent = message;
    }
}

async function initNamePage() {
    const form = document.getElementById('nameForm');
    const input = document.getElementById('displayName');
    const error = document.getElementById('nameError');
    const storedName = localStorage.getItem(ONBOARDING_STORAGE_KEYS.NAME);

    if (!form || !input) {
        return;
    }

    if (storedName) {
        input.value = storedName;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const displayName = input.value.trim();

        if (!displayName) {
            setStatusMessage(error, 'Please enter your name.');
            return;
        }

        setStatusMessage(error);

        try {
            const response = await apiCall(
                '/onboarding/name',
                'POST',
                { display_name: displayName },
                true
            );

            if (response.status === 'success' || response.success) {
                localStorage.setItem(ONBOARDING_STORAGE_KEYS.NAME, displayName);
                window.location.href = './topics.html';
            } else {
                throw new Error(response.message || 'Unable to save your name.');
            }
        } catch (err) {
            setStatusMessage(error, err.message || 'Unable to save your name.');
        }
    });
}

async function initTopicsPage() {
    const buttons = Array.from(document.querySelectorAll('.topic-chip'));
    const continueButton = document.getElementById('topicsContinue');
    const countElement = document.getElementById('topicCount');
    const error = document.getElementById('topicsError');
    const selected = new Set(JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEYS.TOPICS) || '[]'));

    if (!buttons.length || !continueButton) {
        return;
    }

    function renderSelection() {
        buttons.forEach((button) => {
            const topic = button.dataset.topic;
            button.classList.toggle('is-selected', selected.has(topic));
        });

        const count = selected.size;
        countElement.textContent = `${count} selected`;
        continueButton.disabled = count < 2;
    }

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const topic = button.dataset.topic;

            if (selected.has(topic)) {
                selected.delete(topic);
            } else {
                selected.add(topic);
            }

            setStatusMessage(error);
            renderSelection();
        });
    });

    continueButton.addEventListener('click', async () => {
        const topics = Array.from(selected);

        if (topics.length < 2) {
            setStatusMessage(error, 'Choose at least 2 topics to continue.');
            return;
        }

        try {
            const response = await apiCall(
                '/onboarding/topics',
                'POST',
                { topics },
                true
            );

            if (response.status === 'success' || response.success) {
                localStorage.setItem(ONBOARDING_STORAGE_KEYS.TOPICS, JSON.stringify(topics));
                window.location.href = './hello.html';
            } else {
                throw new Error(response.message || 'Unable to save your topics.');
            }
        } catch (err) {
            setStatusMessage(error, err.message || 'Unable to save your topics.');
        }
    });

    renderSelection();
}

async function initHelloPage() {
    const helloName = document.getElementById('helloName');
    const startButton = document.getElementById('startChatting');
    const storedName = localStorage.getItem(ONBOARDING_STORAGE_KEYS.NAME);

    if (helloName) {
        helloName.textContent = storedName || 'there';
    }

    if (startButton) {
        startButton.addEventListener('click', () => {
            window.location.href = '../chat/index.html';
        });
    }
}

async function bootstrapOnboarding() {
    const page = document.body.dataset.page;

    try {
        await requireAuth();
    } catch (error) {
        return;
    }

    if (page === 'name') {
        await initNamePage();
        return;
    }

    if (page === 'topics') {
        await initTopicsPage();
        return;
    }

    if (page === 'hello') {
        await initHelloPage();
    }
}

// ─── ONBOARDING ORB ──────────────────────────────────────────────────────────

async function initOnboardingOrb(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const { Renderer, Program, Mesh, Triangle, Vec3 } =
            await import('https://cdn.jsdelivr.net/npm/ogl@1.0.9/src/index.js');

        const renderer = new Renderer({ alpha: true, premultipliedAlpha: false });
        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0);
        container.appendChild(gl.canvas);

        const vert = `
            precision highp float;
            attribute vec2 position;
            attribute vec2 uv;
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }
        `;

        const frag = `
            precision highp float;
            uniform float iTime; uniform vec3 iResolution;
            uniform float hue; uniform float hover; uniform float rot;
            uniform float hoverIntensity; uniform vec3 backgroundColor;
            varying vec2 vUv;
            vec3 rgb2yiq(vec3 c){return vec3(dot(c,vec3(0.299,0.587,0.114)),dot(c,vec3(0.596,-0.274,-0.322)),dot(c,vec3(0.211,-0.523,0.312)));}
            vec3 yiq2rgb(vec3 c){return vec3(c.x+0.956*c.y+0.621*c.z,c.x-0.272*c.y-0.647*c.z,c.x-1.106*c.y+1.703*c.z);}
            vec3 adjustHue(vec3 color,float hueDeg){float hueRad=hueDeg*3.14159265/180.0;vec3 yiq=rgb2yiq(color);float cosA=cos(hueRad);float sinA=sin(hueRad);float i=yiq.y*cosA-yiq.z*sinA;float q=yiq.y*sinA+yiq.z*cosA;yiq.y=i;yiq.z=q;return yiq2rgb(yiq);}
            vec3 hash33(vec3 p3){p3=fract(p3*vec3(0.1031,0.11369,0.13787));p3+=dot(p3,p3.yxz+19.19);return -1.0+2.0*fract(vec3(p3.x+p3.y,p3.x+p3.z,p3.y+p3.z)*p3.zyx);}
            float snoise3(vec3 p){const float K1=0.333333333;const float K2=0.166666667;vec3 i=floor(p+(p.x+p.y+p.z)*K1);vec3 d0=p-(i-(i.x+i.y+i.z)*K2);vec3 e=step(vec3(0.0),d0-d0.yzx);vec3 i1=e*(1.0-e.zxy);vec3 i2=1.0-e.zxy*(1.0-e);vec3 d1=d0-(i1-K2);vec3 d2=d0-(i2-K1);vec3 d3=d0-0.5;vec4 h=max(0.6-vec4(dot(d0,d0),dot(d1,d1),dot(d2,d2),dot(d3,d3)),0.0);vec4 n=h*h*h*h*vec4(dot(d0,hash33(i)),dot(d1,hash33(i+i1)),dot(d2,hash33(i+i2)),dot(d3,hash33(i+1.0)));return dot(vec4(31.316),n);}
            vec4 extractAlpha(vec3 colorIn){float a=max(max(colorIn.r,colorIn.g),colorIn.b);return vec4(colorIn.rgb/(a+1e-5),a);}
            const vec3 baseColor1=vec3(0.611765,0.262745,0.996078);
            const vec3 baseColor2=vec3(0.298039,0.760784,0.913725);
            const vec3 baseColor3=vec3(0.062745,0.078431,0.600000);
            const float innerRadius=0.6; const float noiseScale=0.65;
            float light1(float i,float a,float d){return i/(1.0+d*a);}
            float light2(float i,float a,float d){return i/(1.0+d*d*a);}
            vec4 draw(vec2 uv){
                vec3 color1=adjustHue(baseColor1,hue);vec3 color2=adjustHue(baseColor2,hue);vec3 color3=adjustHue(baseColor3,hue);
                float ang=atan(uv.y,uv.x);float len=length(uv);float invLen=len>0.0?1.0/len:0.0;
                float bgLum=dot(backgroundColor,vec3(0.299,0.587,0.114));
                float n0=snoise3(vec3(uv*noiseScale,iTime*0.5))*0.5+0.5;
                float r0=mix(mix(innerRadius,1.0,0.4),mix(innerRadius,1.0,0.6),n0);
                float d0=distance(uv,(r0*invLen)*uv);float v0=light1(1.0,10.0,d0);
                v0*=smoothstep(r0*1.05,r0,len);float innerFade=smoothstep(r0*0.8,r0*0.95,len);
                v0*=mix(innerFade,1.0,bgLum*0.7);float cl=cos(ang+iTime*2.0)*0.5+0.5;
                float a=iTime*-1.0;vec2 pos=vec2(cos(a),sin(a))*r0;float d=distance(uv,pos);
                float v1=light2(1.5,5.0,d)*light1(1.0,50.0,d0);
                float v2=smoothstep(1.0,mix(innerRadius,1.0,n0*0.5),len);
                float v3=smoothstep(innerRadius,mix(innerRadius,1.0,0.5),len);
                vec3 colBase=mix(color1,color2,cl);float fadeAmount=mix(1.0,0.1,bgLum);
                vec3 darkCol=clamp((mix(color3,colBase,v0)+v1)*v2*v3,0.0,1.0);
                vec3 lightCol=clamp(mix(backgroundColor,colBase+v1,v0)*mix(1.0,v2*v3,fadeAmount),0.0,1.0);
                return extractAlpha(mix(darkCol,lightCol,bgLum));
            }
            void main(){
                vec2 center=iResolution.xy*0.5;float size=min(iResolution.x,iResolution.y);
                vec2 uv=(vUv*iResolution.xy-center)/size*2.0;
                float s=sin(rot);float c=cos(rot);uv=vec2(c*uv.x-s*uv.y,s*uv.x+c*uv.y);
                uv.x+=hover*hoverIntensity*0.1*sin(uv.y*10.0+iTime);
                uv.y+=hover*hoverIntensity*0.1*sin(uv.x*10.0+iTime);
                vec4 col=draw(uv);gl_FragColor=vec4(col.rgb*col.a,col.a);
            }
        `;

        const geometry = new Triangle(gl);
        const program = new Program(gl, {
            vertex: vert, fragment: frag,
            uniforms: {
                iTime: { value: 0 },
                iResolution: { value: new Vec3(300, 300, 1) },
                hue: { value: 0 },
                hover: { value: 0 },
                rot: { value: 0 },
                hoverIntensity: { value: 0.2 },
                backgroundColor: { value: new Vec3(5.0, 5.0, 5.0) },
            }
        });

        const mesh = new Mesh(gl, { geometry, program });

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            const w = container.clientWidth;
            const h = container.clientHeight;
            renderer.setSize(w * dpr, h * dpr);
            gl.canvas.style.width = w + 'px';
            gl.canvas.style.height = h + 'px';
            program.uniforms.iResolution.value.set(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
        }
        window.addEventListener('resize', resize);
        resize();

        let targetHover = 0, currentRot = 0, lastTime = 0;
        container.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            const uvX = ((e.clientX - rect.left - rect.width / 2) / Math.min(rect.width, rect.height)) * 2;
            const uvY = ((e.clientY - rect.top - rect.height / 2) / Math.min(rect.width, rect.height)) * 2;
            targetHover = Math.hypot(uvX, uvY) < 0.8 ? 1 : 0;
        });
        container.addEventListener('mouseleave', () => { targetHover = 0; });

        (function loop(t) {
            requestAnimationFrame(loop);
            const dt = (t - lastTime) * 0.001;
            lastTime = t;
            program.uniforms.iTime.value = t * 0.001;
            program.uniforms.hover.value += (targetHover - program.uniforms.hover.value) * 0.1;
            if (targetHover > 0.5) currentRot += dt * 0.3;
            program.uniforms.rot.value = currentRot;
            renderer.render({ scene: mesh });
        })(0);

    } catch (err) {
        console.warn('WebGL orb failed:', err);
    }
}

// ─── EYE TRACKING ────────────────────────────────────────────────────────────

function initOrbEyes(wrapId) {
    const wrap = document.getElementById(wrapId) || document.querySelector('.ob-orb-wrap');
    if (!wrap) return;

    document.addEventListener('mousemove', (e) => {
        const rect = wrap.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
        const dist = Math.min(22, Math.hypot(e.clientX - cx, e.clientY - cy) / 8);
        wrap.querySelectorAll('.ob-orb-eye').forEach((eye) => {
            eye.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
        });
    });

    document.addEventListener('mouseleave', () => {
        wrap.querySelectorAll('.ob-orb-eye').forEach((eye) => {
            eye.style.transform = 'translate(0,0)';
        });
    });

    setInterval(() => {
        wrap.querySelectorAll('.ob-orb-eye').forEach((eye) => {
            eye.classList.add('blinking');
            setTimeout(() => eye.classList.remove('blinking'), 300);
        });
    }, 6000);
}

// ─── PAGE INIT ────────────────────────────────────────────────────────────────

const page = document.body.dataset.page;

if (page === 'name') {
    initOnboardingOrb('nameOrbCanvas');
    initOrbEyes();

    document.getElementById('nameForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('displayName')?.value.trim();
        const errEl = document.getElementById('nameError');
        if (!name) { if (errEl) errEl.textContent = 'Please enter your name.'; return; }
        if (errEl) errEl.textContent = '';

        localStorage.setItem('zora_onboarding_name', name);

        try {
            await apiCall('/onboarding/name', 'POST', { display_name: name }, true);
        } catch (err) {
            console.warn('Onboarding name API not connected:', err);
        }

        window.location.href = '/onboarding/topics.html';
    });
}

if (page === 'topics') {
    initOnboardingOrb('topicsOrbCanvas');
    initOrbEyes();

    const selected = new Set();
    const countEl = document.getElementById('topicCount');
    const continueBtn = document.getElementById('topicsContinue');
    const rightTitle = document.getElementById('topicsRightTitle');
    const rightDesc = document.getElementById('topicsRightDesc');

    const topicMessages = {
        'Technology': ['Love the tech mindset!', 'Building the future together.'],
        'Science': ['Curiosity drives everything.', 'Let\'s explore the unknown.'],
        'Business': ['Smart choices start here.', 'Strategy meets intelligence.'],
        'Arts & Design': ['Creativity unlocked!', 'Design thinking activated.'],
        'Health': ['Wellbeing matters most.', 'Healthy mind, sharp results.'],
        'Education': ['Always learning — always growing.', 'Knowledge is power.'],
        'Entertainment': ['Fun and smart — perfect combo.', 'Let\'s keep it interesting.'],
        'Sports': ['Winning mindset loaded!', 'Performance-driven, always.'],
        'Travel': ['The world is your workspace.', 'Exploring together.'],
        'Food': ['Good taste in everything.', 'Flavor meets intelligence.'],
        'Finance': ['Smart money moves.', 'Numbers never lie.'],
        'Gaming': ['Game on! Let\'s level up.', 'Strategic play, always.'],
    };

    document.querySelectorAll('.ob-topic-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            const topic = chip.dataset.topic;
            if (selected.has(topic)) {
                selected.delete(topic);
                chip.classList.remove('selected');
            } else {
                selected.add(topic);
                chip.classList.add('selected');

                // Update right panel text
                const msgs = topicMessages[topic];
                if (msgs && rightTitle && rightDesc) {
                    rightTitle.textContent = msgs[0];
                    rightDesc.textContent = msgs[1];
                }
            }

            if (countEl) countEl.textContent = `${selected.size} selected`;
            if (continueBtn) continueBtn.disabled = selected.size < 2;
        });
    });

    continueBtn?.addEventListener('click', async () => {
        if (selected.size < 2) return;

        localStorage.setItem('zora_onboarding_topics', JSON.stringify([...selected]));

        try {
            await apiCall('/onboarding/topics', 'POST', { topics: [...selected] }, true);
        } catch (err) {
            console.warn('Onboarding topics API not connected:', err);
        }

        window.location.href = '/onboarding/hello.html';
    });
}

if (page === 'hello') {
    initOnboardingOrb('helloOrbCanvas');
    initOrbEyes();

    const name = localStorage.getItem('zora_onboarding_name') || 'there';
    const nameEl = document.getElementById('helloName');
    if (nameEl) nameEl.textContent = name;

    document.getElementById('startChatting')?.addEventListener('click', async () => {
        try {
            await apiCall('/onboarding/complete', 'POST', {}, true);
        } catch (err) {
            console.warn('Onboarding complete API not connected:', err);
        }
        window.location.href = '/chat/index.html';
    });
}

document.addEventListener('DOMContentLoaded', bootstrapOnboarding);
