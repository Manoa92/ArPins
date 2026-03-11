<template>
    <div ref="container" class="ar-container">
        <canvas ref="videoCanvas" class="video-canvas"></canvas>
        <div class="info-panel">
            <p>{{ statusText }}</p>
            <p class="instruction">Cliquez pour placer des marqueurs</p>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref } from "vue"
import * as THREE from "three"

const container = ref(null)
const videoCanvas = ref(null)
const statusText = ref("Initialisation caméra AR...")

let camera, scene, renderer
let xrSession = null
let hitTestSource = null
let reticle
const arPins = []

onMounted(async () => {
    // Initialisez la scène Three.js
    scene = new THREE.Scene()
    scene.background = null // Transparent pour voir la caméra

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    )

    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas: videoCanvas.value
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true
    renderer.setPixelRatio(window.devicePixelRatio)

    container.value.appendChild(renderer.domElement)

    // Ajoutez de la lumière
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1)
    scene.add(light)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
    scene.add(directionalLight)

    // Créez un réticule pour indiquer où sera placé l'objet
    const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32)
    const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.7 })
    reticle = new THREE.Mesh(reticleGeometry, reticleMaterial)
    reticle.matrixAutoUpdate = false
    reticle.visible = false
    scene.add(reticle)

    // Vérifiez si WebXR est disponible
    if ("xr" in navigator) {
        try {
            const isArSupported = await navigator.xr.isSessionSupported("immersive-ar")

            if (isArSupported) {
                const button = document.createElement("button")
                button.textContent = "📱 Démarrer AR"
                button.style.cssText = `
                    position: absolute;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 12px 24px;
                    font-size: 16px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    z-index: 100;
                `

                button.onclick = async () => {
                    startArSession()
                    button.style.display = "none"
                }

                document.body.appendChild(button)
                statusText.value = "Cliquez sur 'Démarrer AR'"
            } else {
                statusText.value = "❌ AR non supporté sur cet appareil"
            }
        } catch (e) {
            console.error("Erreur vérification AR:", e)
            statusText.value = "❌ Erreur: " + e.message
        }
    } else {
        statusText.value = "❌ WebXR non disponible"
    }

    // Écouteur de clic pour desktop (fallback)
    renderer.domElement.addEventListener("click", onScreenClick)

    renderer.setAnimationLoop(render)
})

async function startArSession() {
    try {
        xrSession = await navigator.xr.requestSession("immersive-ar", {
            requiredFeatures: ["hit-test"],
            optionalFeatures: ["dom-overlay"],
            domOverlay: { root: document.body }
        })

        renderer.xr.setSession(xrSession)
        statusText.value = "✅ AR actif - Bougez pour chercher des surfaces"

        // Configuration du hit test
        const space = await xrSession.requestReferenceSpace("viewer")
        const session = xrSession

        try {
            hitTestSource = await session.requestHitTestSource({ space })
        } catch (e) {
            console.error("Hit test non supporté:", e)
        }

        xrSession.addEventListener("select", onXRSelect)
    } catch (e) {
        console.error("Erreur démarrage AR:", e)
        statusText.value = "❌ Erreur: " + e.message
    }
}

function onXRSelect(event) {
    // Placez un objet au point de sélection XR
    addPin(event.inputSource)
}

function onScreenClick(event) {
    // Pour desktop/testing: placez un objet aléatoire devant
    const position = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        -0.5
    )
    createPin(position, "Objet détecté")
}

function addPin(inputSource, label = "Objet AR") {
    // Pour une implémentation complète avec hit-test
    if (reticle.visible) {
        const pinPosition = reticle.position.clone()
        createPin(pinPosition, label)
    }
}

function createPin(position, label) {
    const group = new THREE.Group()

    // Sphère rouge
    const geometry = new THREE.SphereGeometry(0.05, 16, 16)
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff4444 })
    const sphere = new THREE.Mesh(geometry, material)

    group.add(sphere)
    group.position.copy(position)

    // Ajoutez une petite tige pour mieux voir
    const stickGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8)
    const stickMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 })
    const stick = new THREE.Mesh(stickGeometry, stickMaterial)
    stick.position.z = 0.15
    group.add(stick)

    scene.add(group)
    arPins.push({
        mesh: group,
        label,
        position: position.clone()
    })

    console.log(`Pin ajouté: ${label} à`, position)
}

function render(time, frame) {
    if (frame && hitTestSource) {
        const hitTestResults = frame.getHitTestResults(hitTestSource)

        if (hitTestResults.length > 0) {
            const hit = hitTestResults[0]
            const pose = hit.getPose(frame.session.inputSources[0])

            if (pose) {
                reticle.visible = true
                reticle.matrix.fromArray(pose.transform.matrix)
            }
        } else {
            reticle.visible = false
        }
    }

    renderer.render(scene, camera)
}
</script>

<style scoped>
.ar-container {
    width: 100vw;
    height: 100vh;
    position: relative;
    overflow: hidden;
    background: #000;
}

.video-canvas {
    display: block;
    width: 100%;
    height: 100%;
}

.info-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    padding: 15px 20px;
    border-radius: 8px;
    font-family: 'Segoe UI', sans-serif;
    font-size: 14px;
    z-index: 50;
    max-width: 300px;
}

.info-panel p {
    margin: 5px 0;
    word-wrap: break-word;
}

.instruction {
    font-size: 12px;
    color: #90ee90;
    margin-top: 10px !important;
}
</style>