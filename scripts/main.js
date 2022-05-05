Hooks.on("init", () => {
    registerSettings();
});
//TODO?
//If someone is next to you, you are Entangled and lose a square of movement.
//Neaten out the areas of movement
//Make Terrain Matter?
//Diagonal/Resolving Movement etc
Hooks.on("ready", () => {

    libWrapper.register("l5r-dragruler", "Ruler.prototype.measure", function (wrapped, ...args) {
        let wrappedResult = wrapped(...args);
        let dragRulerSupportActive = game.settings.get("l5r-dragruler", "dragRulerSupport");
        let dragRulerZeroBasedMovement = game.settings.get("l5r-dragruler", "setZeroBased");
        if (wrappedResult.label) {
            let segment = wrappedResult;
            //Loop over all prior segments of the ruler
            do {
                segment.label.text = changeLabelNames(segment.label.text, dragRulerZeroBasedMovement);// + "/n" + getAllPreviousRayWidths();
                // Go to prior segment and convert label -> For the case that the ruler has waypoints
                segment = segment.prior_segment;
            } while (segment !== undefined && Object.keys(segment).length > 0);

        } else if (dragRulerSupportActive && Array.isArray(wrappedResult) && wrappedResult.length > 0) { //Handling for Dragruler Support
            for (let i = 0; i < wrappedResult.length; i++) {
                wrappedResult[i].label.text = changeLabelNames(wrappedResult[i].label.text, dragRulerZeroBasedMovement);
            }
        }
        return wrappedResult;
    }, 'WRAPPER');
})
Hooks.once("canvasInit", () => {
    if (game.modules.get("enhanced-terrain-layer")?.active) {
        canvas.terrain.getEnvironments = function () {
            return [
                { id: 'dangerous', icon: '' },
                { id: 'defiled', icon: '' },
                { id: 'entangling', icon: '' },
                { id: 'hallowed', icon: '' },
                { id: 'imbalanced', icon: '' },
                { id: 'obscuring', icon: '' },
                { id: 'confining', icon: '' },
                { id: 'elevated', icon: '' },
                { id: 'open', icon: '' },
                { id: 'recessed', icon: '' }
            ].map(entry => {
                entry.text = game.i18n.localize('l5r-dragruler.ranges.terrain.' + entry.id);
                return entry;
            })
        }
    }
})
Hooks.once("dragRuler.ready", (SpeedProvider) => {
    class LegendOfTheFiveRingsSpeedProvider extends SpeedProvider {
        get colors(){
            return [
                { id: 'touchRange', default: 0xB71C1C }, //scorpion
                { id: 'swordRange', default: 0xF9A825 }, //lion
                { id: 'spearRange', default: 0x0288D1 }, //crane
                { id: 'throwRange', default: 0x546E7A }, //crab
                { id: 'bowRange', default: 0xF4511E }, //phoenix
                { id: 'volleyRange', default: 0x9CCC65 }, //dragon
                { id: 'sightRange', default: 0xBA68C8  } //unicorn
            ].map(entry => {
                entry.name = game.i18n.localize('l5r-dragruler.ranges.weapon_desc.' + entry.id);
                return entry;
            })
        }
        getRanges() {
            const baseSpeed = 1;
            const ranges = [
                { range: baseSpeed *1, color: "touchRange"}, //5
                { range: baseSpeed *2, color: "swordRange"}, //10
                { range: baseSpeed *3, color: "spearRange"}, //15
                { range: baseSpeed *6, color: "throwRange"}, //30
                { range: baseSpeed *10, color: "bowRange"}, //50
                { range: baseSpeed *15, color: "volleyRange"}, //75
                { range: baseSpeed *20, color: "sightRange"} //100
            ]
            return ranges;
        }
    }
    dragRuler.registerModule("l5r-dragruler", LegendOfTheFiveRingsSpeedProvider)
})

function registerSettings() {
    game.settings.register('l5r-dragruler', 'dragRulerSupport', {
        name: game.i18n.localize('l5r-dragruler.settings.dragRulerSupport.name'),
        hint: game.i18n.localize('l5r-dragruler.settings.dragRulerSupport.hint'),
        scope: 'client',
        default: true,
    })
    game.settings.register('l5r-dragruler', 'setZeroBased', {
        name: game.i18n.localize('l5r-dragruler.settings.setZeroBased.name'),
        hint: game.i18n.localize('l5r-dragruler.settings.setZeroBased.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
    })
}
function getAllPreviousRayWidths() {

}
function changeLabelNames(text, zerobased) {
    let returnedText = "out_of";
    const regexResult = text.split(' ');
    const zeroRange = (zerobased) ? 1 : 0;

    if (regexResult && regexResult[0]) {
        const parsedFloat = parseFloat(regexResult[0])
        if (parsedFloat <= (1 - zeroRange)) {
            returnedText = 'touch'
        } else if (parsedFloat <= (2 - zeroRange)) {
            returnedText = 'sword'
        } else if (parsedFloat <= (3 - zeroRange)) {
            returnedText = 'spear'
        } else if (parsedFloat <= (6 - zeroRange)) {
            returnedText = 'throwing'
        } else if (parsedFloat <= (10 - zeroRange)) {
            returnedText = 'bow'
        } else if (parsedFloat <= (15 - zeroRange)) {
            returnedText = 'volley'
        } else if (parsedFloat <= (20 - zeroRange)) {
            returnedText = 'sight'
        }
    }

    const square = ' ' + game.i18n.localize('l5r-dragruler.' + ((regexResult[0] <= 1) ? 'square' : 'squares'))
    return game.i18n.localize('l5r-dragruler.ranges.weapon.' + returnedText) + ' [' + regexResult[0] + square + ']'
}
