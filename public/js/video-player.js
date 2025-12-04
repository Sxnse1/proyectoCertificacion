/**
 * Video Player - Reproductor de video con soporte para Vimeo y Bunny
 * Maneja progreso, navegación, sidebar y controles del reproductor
 */

// Resume playback support: Vimeo (via SDK) and Bunny (postMessage protocol best-effort)
function initializeVideoPlayer(videoId, courseStructure, videoDuration) {
    const storageKey = `videoProgress:${videoId}`;
    const bunnyIframe = document.getElementById('bunnyPlayer');
    const vimeoIframe = document.getElementById('vimeoPlayer');

    function savePosition(seconds) {
        try { localStorage.setItem(storageKey, String(Math.floor(seconds || 0))); } catch(e){}
    }
    
    function restorePosition() {
        try { const s = localStorage.getItem(storageKey); return s ? (parseInt(s,10)||0) : 0; } catch(e){ return 0; }
    }

    // Server persistence helpers
    let lastKnownTime = 0;
    let progressSaveTimer = null;
    
    async function saveProgressToServer(seconds) {
        try {
            lastKnownTime = Math.floor(seconds || 0);

            // Lógica de completado: (ej. 98% visto)
            let isComplete = false;
            if (window.videoDuration && lastKnownTime >= (window.videoDuration * 0.98)) {
                isComplete = true;
            }

            if (progressSaveTimer) clearTimeout(progressSaveTimer);
            progressSaveTimer = setTimeout(async () => {
                await fetch(`/video/progress/${videoId}`, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Accept': 'application/json',
                        'csrf-token': window.csrfHelper ? window.csrfHelper.getToken() : ''
                    },
                    body: JSON.stringify({ 
                        seconds: lastKnownTime,
                        completado: isComplete
                    })
                });
            }, 800);
        } catch (e) { console.warn('Error saving progress to server', e); }
    }

    async function loadProgressFromServer() {
        try {
            const res = await fetch(`/video/progress/${videoId}`, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
            if (!res.ok) return 0;
            const data = await res.json().catch(()=>null);
            return (data && data.seconds) ? parseInt(data.seconds,10) : 0;
        } catch (e) { return 0; }
    }

    // Vimeo handling (SDK)
    if (vimeoIframe) {
        const vimeoScript = document.createElement('script');
        vimeoScript.src = 'https://player.vimeo.com/api/player.js';
        vimeoScript.onload = async () => {
            try {
                const player = new Vimeo.Player(vimeoIframe);
                
                // Esperar a que el video esté listo antes de intentar hacer seek
                await player.ready();
                
                // Prefer server-saved position over localStorage
                const serverStart = await loadProgressFromServer();
                const localStart = restorePosition();
                const start = (serverStart && serverStart > 0) ? serverStart : localStart;
                
                if (start > 5) { // Solo reanudar si hay al menos 5 segundos
                    console.log(`🎬 Reanudando video Vimeo en ${start}s`);
                    await player.setCurrentTime(start).catch((e) => {
                        console.warn('Error reanudando Vimeo:', e);
                    });
                }
                
                // periodic save to local and server
                setInterval(async ()=>{ 
                    try{ 
                        const t = await player.getCurrentTime(); 
                        savePosition(t); 
                        saveProgressToServer(t);
                    }catch(e){} 
                }, 10000);
                
                window.addEventListener('beforeunload', async ()=>{ 
                    try{ 
                        const t = await player.getCurrentTime(); 
                        savePosition(t); 
                        await saveProgressToServer(t);
                    }catch(e){} 
                });
            } catch(e){ 
                console.warn('Vimeo resume init error:', e); 
            }
        };
        document.body.appendChild(vimeoScript);
    }

    // Bunny handling: implement a small postMessage protocol and fallbacks.
    if (bunnyIframe) {
        const start = restorePosition();
        // Try postMessage seek first (some Bunny players accept custom messages). We'll send several attempts.
        function trySeek(seconds){
            try {
                const msg = { type: 'seek', seconds: Math.floor(seconds||0) };
                bunnyIframe.contentWindow.postMessage(msg, '*');
            } catch(e) { /* ignore */ }
        }

        // Ask iframe for current time (if it replies with {type:'timeupdate', currentTime:N})
        function requestCurrentTime(){
            try { bunnyIframe.contentWindow.postMessage({ type: 'getCurrentTime' }, '*'); } catch(e){}
        }

        // Listen for messages from iframe
        window.addEventListener('message', function(ev){
            if (!ev.data) return;
            try {
                const d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
                if (d && d.type === 'timeupdate' && typeof d.currentTime === 'number') {
                    const s = Math.floor(d.currentTime);
                    savePosition(s);
                    saveProgressToServer(s);
                }
                // allow iframe to confirm that it accepted a seek
                if (d && d.type === 'seeked' && typeof d.currentTime === 'number') {
                    const s = Math.floor(d.currentTime);
                    savePosition(s);
                    saveProgressToServer(s);
                }
            } catch(e) { /* not JSON or other origin */ }
        });

        // If we have a stored start time, prefer server value and try several seek attempts spaced out.
        (async ()=>{
            const serverStart = await loadProgressFromServer();
            const resolvedStart = (serverStart && serverStart > 0) ? serverStart : start;
            if (resolvedStart > 5) { // Solo reanudar si hay al menos 5 segundos
                console.log(`🎬 Reanudando video Bunny en ${resolvedStart}s`);
                
                // try URL fragment fallback
                try {
                    const src = bunnyIframe.getAttribute('src');
                    if (src && !src.includes('#t=')) {
                        bunnyIframe.setAttribute('src', src + `#t=${resolvedStart}`);
                    }
                } catch(e){}
                
                // send postMessage seeks a few times with exponential backoff
                [0, 500, 1500, 3000, 5000].forEach(delay => 
                    setTimeout(() => trySeek(resolvedStart), delay)
                );
                
                // persist chosen start
                savePosition(resolvedStart);
                saveProgressToServer(resolvedStart);
            }
        })();

        // Periodically request current time from iframe
        setInterval(requestCurrentTime, 7000);

        // Save on app navigation buttons if present
        ['prevVideoBtn','nextVideoBtn','volverCursoBtn'].forEach(id => {
            const b = document.getElementById(id);
            if (!b) return;
            b.addEventListener('click', ()=>{
                // ask iframe to report its current time right before navigation
                requestCurrentTime();
                // also save a marker
                savePosition(0);
            });
        });

        // Save on visibility/unload as a last resort
        document.addEventListener('visibilitychange', function(){ if (document.hidden) requestCurrentTime(); });
        window.addEventListener('beforeunload', function(){ requestCurrentTime(); });
    }
}

// Player Interface Management
class VideoPlayerInterface {
    constructor() {
        this.sidebarCollapsed = window.innerWidth <= 768;
        this.init();
    }

    init() {
        this.initializeDurationDisplay();
        this.setupEventListeners();
        this.updateNavigationButtons();
        this.setupTooltips();
        console.log('🎬 Reproductor de video con navegación inicializado');
    }

    // Formatear duración inicial si existe
    initializeDurationDisplay() {
        const durationDisplay = document.getElementById('durationDisplay');
        if (durationDisplay && window.videoDuration) {
            const seconds = window.videoDuration;
            durationDisplay.textContent = this.formatDurationText(seconds);
        }
    }

    // Función para formatear duración
    formatDurationText(seconds) {
        if (!seconds || isNaN(seconds)) return '0m';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    // Toggle del sidebar
    toggleSidebar() {
        const body = document.body;
        const sidebar = document.getElementById('courseSidebar');
        
        if (window.innerWidth <= 768) {
            // En móvil, usar clase mobile-open
            sidebar.classList.toggle('mobile-open');
        } else {
            // En desktop, usar clase sidebar-collapsed
            body.classList.toggle('sidebar-collapsed');
            this.sidebarCollapsed = !this.sidebarCollapsed;
        }
    }

    // Toggle de módulos
    toggleModule(moduleId) {
        const module = document.getElementById(moduleId);
        const header = document.querySelector(`[data-bs-target="#${moduleId}"]`);
        const icon = header.querySelector('.bi-chevron-down, .bi-chevron-up');
        
        if (module.classList.contains('show')) {
            icon.className = 'bi bi-chevron-down';
        } else {
            icon.className = 'bi bi-chevron-up';
        }
    }

    // Navegación entre videos
    navigateVideo(direction) {
        const courseStructure = window.courseStructure;
        const currentVideoId = window.currentVideoId;
        
        // Crear lista plana de videos
        const allVideos = [];
        courseStructure.forEach(module => {
            module.videos.forEach(video => {
                allVideos.push(video);
            });
        });
        
        // Encontrar video actual
        const currentIndex = allVideos.findIndex(video => video.id_video == currentVideoId);
        
        if (currentIndex === -1) return;
        
        let targetIndex;
        if (direction === 'prev') {
            targetIndex = currentIndex - 1;
        } else {
            targetIndex = currentIndex + 1;
        }
        
        // Verificar límites
        if (targetIndex < 0 || targetIndex >= allVideos.length) return;
        
        const targetVideo = allVideos[targetIndex];
        window.location.href = `/video/${targetVideo.id_video}`;
    }

    // Actualizar botones de navegación
    updateNavigationButtons() {
        const courseStructure = window.courseStructure;
        const currentVideoId = window.currentVideoId;
        
        // Crear lista plana de videos
        const allVideos = [];
        courseStructure.forEach(module => {
            module.videos.forEach(video => {
                allVideos.push(video);
            });
        });
        
        const currentIndex = allVideos.findIndex(video => video.id_video == currentVideoId);
        
        const prevBtn = document.getElementById('prevVideoBtn');
        const nextBtn = document.getElementById('nextVideoBtn');
        
        if (prevBtn) {
            prevBtn.disabled = currentIndex <= 0;
        }
        
        if (nextBtn) {
            nextBtn.disabled = currentIndex >= allVideos.length - 1;
        }
    }

    setupEventListeners() {
        // Configurar sidebar inicial
        if (window.innerWidth <= 768) {
            document.body.classList.add('sidebar-collapsed');
        }

        // Manejar cambios de tamaño de ventana
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                document.body.classList.add('sidebar-collapsed');
                document.getElementById('courseSidebar').classList.remove('mobile-open');
            } else {
                document.body.classList.remove('sidebar-collapsed');
                document.getElementById('courseSidebar').classList.remove('mobile-open');
            }
        });

        // Cerrar sidebar en móvil al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('courseSidebar');
                const toggleBtn = document.querySelector('.sidebar-toggle-main');
                
                if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                    sidebar.classList.remove('mobile-open');
                }
            }
        });
    }

    setupTooltips() {
        // Tooltip para elementos con title
        if (typeof bootstrap !== 'undefined') {
            const tooltips = document.querySelectorAll('[title]');
            tooltips.forEach(el => new bootstrap.Tooltip(el));
        }
    }
}

// Global functions for onclick handlers
window.toggleSidebar = function() {
    if (window.videoPlayerInterface) {
        window.videoPlayerInterface.toggleSidebar();
    }
};

window.toggleModule = function(moduleId) {
    if (window.videoPlayerInterface) {
        window.videoPlayerInterface.toggleModule(moduleId);
    }
};

window.navigateVideo = function(direction) {
    if (window.videoPlayerInterface) {
        window.videoPlayerInterface.navigateVideo(direction);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize video player interface
    window.videoPlayerInterface = new VideoPlayerInterface();
    
    // Initialize video player functionality if we have the required data
    if (window.currentVideoId && window.courseStructure) {
        initializeVideoPlayer(window.currentVideoId, window.courseStructure, window.videoDuration);
    }
});