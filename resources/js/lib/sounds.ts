const SOUND_ENABLED_KEY = 'notification_sound_enabled';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    return audioContext;
}

/** Verifica si el sonido está habilitado (default: true) */
export function isSoundEnabled(): boolean {
    try {
        const stored = localStorage.getItem(SOUND_ENABLED_KEY);
        return stored === null ? true : stored === 'true';
    } catch {
        return true;
    }
}

/** Activa o desactiva el sonido de notificaciones */
export function setSoundEnabled(enabled: boolean): void {
    try {
        localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
    } catch {
        // localStorage no disponible
    }
}

function playTone(frequency: number, duration: number, volume: number = 0.3): void {
    try {
        const ctx = getAudioContext();

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        oscillator.type = 'sine';

        // Fade in/out para evitar clicks
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    } catch {
        // Silently fail if Web Audio API is not available
    }
}

/** Sonido de alerta - dos tonos ascendentes */
export function playAlertSound(): void {
    if (!isSoundEnabled()) return;
    playTone(440, 0.15, 0.2);  // A4
    setTimeout(() => playTone(587, 0.2, 0.2), 160);  // D5
}

/** Sonido de confirmación al marcar como leído */
export function playDismissSound(): void {
    if (!isSoundEnabled()) return;
    playTone(523, 0.12, 0.15);  // C5
}
