import GUI from 'lil-gui'
import { ColorGUIHelper } from './tools'

export class UI {

    constructor() {
        this.gui = new GUI({ title: 'Controls' })
    }

    addGlobalUI(params, onChange, onExport, onImport, onClear) {
        this.gui.add(params, 'useWASD').name('WASD Mode').onChange(onChange)
        this.gui.add({clear: onClear}, 'clear').name('Clear Scene')
        this.gui.add({import: onImport}, 'import').name('Load Scene')
        this.gui.add({export: onExport}, 'export').name('Export Scene')
    }

    addSelectionUI() {
        this.infoFolder = this.gui.addFolder('Selected')
        this.infoMessages = { 
            name: '--' ,
            position: '--',
            rotation: '--',
            scale: '--',
        }
        this.infoName = this.infoFolder.add(this.infoMessages, 'name')
        this.infoPos = this.infoFolder.add(this.infoMessages, 'position').name('position')
        this.infoRot = this.infoFolder.add(this.infoMessages, 'rotation').name('rotation')
        this.infoScale = this.infoFolder.add(this.infoMessages, 'scale').name('scale')
        this.hideSelectionUI()
    }

    updateSelectionUI(selectedObject) {
        this.infoMessages.name = selectedObject.name
        this.infoMessages.position = `${selectedObject.position.x.toFixed(2)}, ${selectedObject.position.y.toFixed(2)}, ${selectedObject.position.z.toFixed(2)}`
        this.infoMessages.rotation = `${selectedObject.rotation.x.toFixed(2)}, ${selectedObject.rotation.y.toFixed(2)}, ${selectedObject.rotation.z.toFixed(2)}`
        this.infoMessages.scale = `${selectedObject.scale.x.toFixed(2)}, ${selectedObject.scale.y.toFixed(2)}, ${selectedObject.scale.z.toFixed(2)}`
        this.infoName.updateDisplay()
        this.infoPos.updateDisplay()
        this.infoRot.updateDisplay()
        this.infoScale.updateDisplay()
        this.infoFolder.show()
    }

    hideSelectionUI() {
        this.infoFolder.hide()
    }

    addSkyboxUI(files, params, onChange) {
        const folder = this.gui.addFolder('Sky')
        folder.add(params, 'file', files).name('skybox').onChange(onChange)
    }

    addGroundUI(textures, params, onChange) {
        const folder = this.gui.addFolder('Ground')
        folder.add(params, 'texture', textures).name('texture').onChange(() => { onChange(params.texture, params.repeats);})
        folder.add(params, 'repeats', 1, 1000).name('repeats').onChange(() => { onChange(params.texture, params.repeats);})
    }
    
    addSunUI(sun) {
        const folder = this.gui.addFolder('Sun')
        folder.addColor(new ColorGUIHelper(sun, 'color'), 'value').name('color')
        folder.add(sun, 'intensity', 0, 10)
        folder.add(sun.position, 'x', -100, 100)
        folder.add(sun.position, 'z', -100, 100)
    }

    destroy() {
        if (this.gui) {
            this.gui.destroy()
            this.gui = null
        }
    }
}