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

    document.body.appendChild(
        THREE.WEBXR.createButton(renderer, { requiredFeatures: ["hit-test"] })
    )

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
    width: 100vw;
    height: 100vh;
}
</style>