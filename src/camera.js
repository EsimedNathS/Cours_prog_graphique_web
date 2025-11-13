import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js';

class Camera {
    constructor(renderer) {
        this.defaultPosition()

        this.controls = new OrbitControls(this.camera, renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, 1, 0); 
    }

    defaultPosition() { 
      this.camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.1, 1000 );
      this.camera.position.set(0, 5, 10);
    }

    toogleControls(params) {
        this.controls.enabled = !params.useWASD
        if (params.useWASD) {
            this.camera.defaultPosition()
        }
    }
}

export { Camera }