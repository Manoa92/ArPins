<template>
    <div id="ar-app">

        <!-- ══ START SCREEN ══ -->
        <div v-if="phase === 'start'" class="start-screen">
            <div class="start-logo">AR<span>·</span>PINS</div>
            <p class="start-sub">
                Épinglez des labels sur n'importe quel objet.<br>
                Le gyroscope garde leur position en mémoire.
            </p>
            <button class="btn-start" @click="startApp">
                Activer la caméra
            </button>
        </div>

        <!-- ══ MAIN VIEW ══ -->
        <template v-if="phase === 'running'">
            <video ref="videoEl" autoplay playsinline muted />
            <div class="scanline" />

            <!-- Corner brackets -->
            <div class="brackets">
                <div class="bracket tl" />
                <div class="bracket tr" />
                <div class="bracket bl" />
                <div class="bracket br" />
            </div>

            <!-- Touch zone -->
            <div class="touch-zone" @click="onTap" />

            <!-- Crosshair -->
            <div class="crosshair" :style="{ left: crosshair.x + 'px', top: crosshair.y + 'px' }">
                <div class="ch-ring" />
            </div>

            <!-- Tap ripple -->
            <div v-if="ripple.visible" class="ripple" :style="{ left: ripple.x + 'px', top: ripple.y + 'px' }" />

            <!-- PINS -->
            <TransitionGroup name="pin">
                <div v-for="pin in pins" :key="pin.id" class="pin-wrapper" :class="{ active: activePin === pin.id }"
                    :style="pinStyle(pin)" @click.stop="togglePin(pin.id)">
                    <div class="pin-label">{{ pin.name }}</div>
                    <div class="pin-dot" />
                    <div class="pin-delete" @click.stop="deletePin(pin.id)">✕ Supprimer</div>
                </div>
            </TransitionGroup>

            <!-- HUD top -->
            <div class="hud-bar">
                <div>
                    <div class="hud-title">AR<span>·</span>PINS</div>
                    <div class="hud-count">{{ pins.length }} pin{{ pins.length !== 1 ? 's' : '' }}</div>
                </div>
                <div class="hud-controls">
                    <button class="btn-camera" @click="toggleCamera" :class="{ active: cameraOn }">
                        {{ cameraOn ? '📷 ON' : '📷 OFF' }}
                    </button>
                    <div v-if="gyroAvailable" class="hud-gyro">
                        α {{ gyro.alpha.toFixed(1) }}°<br>
                        β {{ gyro.beta.toFixed(1) }}°<br>
                        γ {{ gyro.gamma.toFixed(1) }}°
                    </div>
                </div>
            </div>

            <!-- HUD bottom -->
            <div class="hud-bottom">
                <div class="hud-hint">Tapez l'écran pour épingler un objet</div>
            </div>

            <!-- Gyro warning -->
            <div v-if="!gyroAvailable" class="gyro-badge">
                ⚠ Gyroscope non disponible — pins en position fixe
            </div>

            <!-- MODAL -->
            <Transition name="fade">
                <div v-if="modal.visible" class="modal-backdrop" @click.self="cancelModal">
                    <div class="modal-card">
                        <h3>Nommer ce <span>point</span></h3>
                        <input ref="modalInput" v-model="modal.name" class="modal-input"
                            placeholder="ex: Télévision, Lampe, Porte..." maxlength="32" @keyup.enter="confirmModal">
                        <div class="modal-actions">
                            <button class="btn btn-cancel" @click="cancelModal">Annuler</button>
                            <button class="btn btn-confirm" :disabled="!modal.name.trim()" @click="confirmModal">
                                Épingler
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </template>

    </div>
</template>

<script setup>
import { ref, reactive, nextTick, onUnmounted } from 'vue'

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
const phase = ref('start')       // 'start' | 'running'
const videoEl = ref(null)          // <video> ref
const modalInput = ref(null)          // <input> ref in modal
const pins = ref([])            // array of pin objects
const activePin = ref(null)          // id of selected pin
const gyroAvailable = ref(false)
const cameraOn = ref(false)         // camera state

const crosshair = reactive({ x: 0, y: 0 })
const ripple = reactive({ visible: false, x: 0, y: 0 })
const gyro = reactive({ alpha: 0, beta: 0, gamma: 0 })
const modal = reactive({ visible: false, name: '' })

// Non-reactive internals
let pendingTapX = 0
let pendingTapY = 0
let rippleTimer = null
let idCounter = 0

// ─────────────────────────────────────────────
// Crosshair tracking
// ─────────────────────────────────────────────
function onMove(e) {
    const t = e.touches ? e.touches[0] : e
    crosshair.x = t.clientX
    crosshair.y = t.clientY
}

// ─────────────────────────────────────────────
// Gyroscope
// ─────────────────────────────────────────────
function onOrientation(e) {
    gyro.alpha = e.alpha ?? 0
    gyro.beta = e.beta ?? 0
    gyro.gamma = e.gamma ?? 0
}

async function requestGyro() {
    if (typeof DeviceOrientationEvent === 'undefined') return

    // iOS 13+ needs explicit permission
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const result = await DeviceOrientationEvent.requestPermission()
            if (result !== 'granted') return
        } catch {
            return
        }
    }

    window.addEventListener('deviceorientation', onOrientation, true)

    // Probe to confirm we actually receive data
    const probe = (e) => {
        if (e.alpha !== null) {
            gyroAvailable.value = true
            window.removeEventListener('deviceorientation', probe, true)
        }
    }
    window.addEventListener('deviceorientation', probe, true)
}

// ─────────────────────────────────────────────
// Camera + app start
// ─────────────────────────────────────────────
async function startApp() {
    phase.value = 'running'
    await nextTick()

    await startCamera()
    await requestGyro()

    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove, { passive: true })
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
            },
            audio: false,
        })
        videoEl.value.srcObject = stream
        cameraOn.value = true
    } catch (err) {
        console.warn('Camera error:', err)
        cameraOn.value = false
    }
}

function stopCamera() {
    if (videoEl.value?.srcObject) {
        videoEl.value.srcObject.getTracks().forEach(t => t.stop())
        videoEl.value.srcObject = null
        cameraOn.value = false
    }
}

async function toggleCamera() {
    if (cameraOn.value) {
        stopCamera()
    } else {
        await startCamera()
    }
}

// ─────────────────────────────────────────────
// Tap → open modal
// ─────────────────────────────────────────────
function onTap(e) {
    if (modal.visible) return
    activePin.value = null

    const t = e.touches ? e.touches[0] : e
    const x = t.clientX
    const y = t.clientY

    // Ripple feedback
    clearTimeout(rippleTimer)
    Object.assign(ripple, { visible: true, x, y })
    rippleTimer = setTimeout(() => { ripple.visible = false }, 500)

    // Save tap position as percentage of screen
    pendingTapX = (x / window.innerWidth) * 100
    pendingTapY = (y / window.innerHeight) * 100

    modal.name = ''
    modal.visible = true
    nextTick(() => modalInput.value?.focus())
}

// ─────────────────────────────────────────────
// Modal actions
// ─────────────────────────────────────────────
function confirmModal() {
    if (!modal.name.trim()) return

    pins.value.push({
        id: ++idCounter,
        name: modal.name.trim(),
        x: pendingTapX,
        y: pendingTapY,
        snapAlpha: gyro.alpha,
        snapBeta: gyro.beta,
        snapGamma: gyro.gamma,
    })

    modal.visible = false
}

function cancelModal() {
    modal.visible = false
}

// ─────────────────────────────────────────────
// Pin management
// ─────────────────────────────────────────────
function deletePin(id) {
    pins.value = pins.value.filter(p => p.id !== id)
    if (activePin.value === id) activePin.value = null
}

function togglePin(id) {
    activePin.value = activePin.value === id ? null : id
}

// ─────────────────────────────────────────────
// Pin position with gyro offset
// ─────────────────────────────────────────────
const SENSITIVITY = 0.28 // degrees → % of screen

function pinStyle(pin) {
    let dx = 0
    let dy = 0

    if (gyroAvailable.value) {
        let dAlpha = gyro.alpha - pin.snapAlpha
        let dBeta = gyro.beta - pin.snapBeta
        let dGamma = gyro.gamma - pin.snapGamma

        // Normalize alpha wrap-around
        if (dAlpha > 180) dAlpha -= 360
        if (dAlpha < -180) dAlpha += 360

        // alpha (yaw)  → horizontal
        // gamma (roll) → horizontal correction
        // beta (pitch) → vertical
        dx = -(dAlpha * SENSITIVITY * window.innerWidth / 100)
            - (dGamma * SENSITIVITY * window.innerWidth / 100 * 0.4)
        dy = -(dBeta * SENSITIVITY * window.innerHeight / 100 * 0.6)
    }

    const finalX = pin.x + (dx / window.innerWidth * 100)
    const finalY = pin.y + (dy / window.innerHeight * 100)

    return {
        left: `clamp(2%, ${finalX}%, 98%)`,
        top: `clamp(4%, ${finalY}%, 92%)`,
    }
}

// ─────────────────────────────────────────────
// Cleanup
// ─────────────────────────────────────────────
onUnmounted(() => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('deviceorientation', onOrientation, true)
    stopCamera()
})
</script>