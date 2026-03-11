<template>
    <div ref="container" class="ar-container"></div>
</template>

<script setup>
import { onMounted, ref } from "vue"
import * as THREE from "three"

const container = ref(null)

let camera, scene, renderer
let reticle

onMounted(async () => {

    scene = new THREE.Scene()

    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
    )

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true

    container.value.appendChild(renderer.domElement)

    // Create a simple WebXR button
    if ("xr" in navigator) {
        const button = document.createElement("button")
        button.textContent = "Enter AR"
        button.style.position = "absolute"
        button.style.bottom = "20px"
        button.style.left = "50%"
        button.style.transform = "translateX(-50%)"
        button.style.padding = "10px 20px"
        button.style.fontSize = "16px"
        button.style.zIndex = "100"

        button.onclick = async () => {
            try {
                const session = await navigator.xr.requestSession("immersive-ar", {
                    requiredFeatures: ["hit-test"],
                    optionalFeatures: ["dom-overlay"],
                    domOverlay: { root: document.body }
                })
                renderer.xr.setSession(session)
            } catch (e) {
                console.error("AR not supported:", e)
            }
        }

        document.body.appendChild(button)
    }

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1)
    scene.add(light)

    renderer.setAnimationLoop(render)
})

function render() {
    renderer.render(scene, camera)
}

window.addEventListener("click", () => {

    const geometry = new THREE.SphereGeometry(0.05)
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 })

    const sphere = new THREE.Mesh(geometry, material)

    sphere.position.set(
        Math.random() * 0.5,
        Math.random() * 0.5,
        -1
    )

    scene.add(sphere)
})
</script>

<style>
.ar-container {
    width: 100dvw;
    height: 100dvh;
}
</style>