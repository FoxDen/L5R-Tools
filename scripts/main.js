Hooks.on("init", () => {
    registerSettings();
});
//TODO?
//If someone is next to you, you are Entangled and lose a square of movement.
//Neaten out the areas of movement
//Make Terrain Matter?
//Diagonal/Resolving Movement etc
let dragRulerZeroBasedMovement = false;
let dragRulerTacticalBasedMovement = false;
Hooks.on("ready", () => {

    libWrapper.register("l5r-dragruler", "Ruler.prototype.measure", function (wrapped, ...args) {
        let wrappedResult = wrapped(...args);
        let dragRulerSupportActive = game.settings.get("l5r-dragruler", "dragRulerSupport");
        dragRulerZeroBasedMovement = game.settings.get("l5r-dragruler", "setZeroBased");
        dragRulerTacticalBasedMovement = game.settings.get("l5r-dragruler","setTacticalBased");
        if (wrappedResult.label) {
            let segment = wrappedResult;
            //Loop over all prior segments of the ruler
            do {
                segment.label.text = changeLabelNames(segment.label.text);// + "/n" + getAllPreviousRayWidths();
                // Go to prior segment and convert label -> For the case that the ruler has waypoints
                segment = segment.prior_segment;
            } while (segment !== undefined && Object.keys(segment).length > 0);

        } else if (dragRulerSupportActive && Array.isArray(wrappedResult) && wrappedResult.length > 0) { //Handling for Dragruler Support
            for (let i = 0; i < wrappedResult.length; i++) {
                wrappedResult[i].label.text = changeLabelNames(wrappedResult[i].label.text);
            }
        }
        return wrappedResult;
    }, 'WRAPPER');
})
Hooks.once("canvasInit", () => {
    if (game.modules.get("enhanced-terrain-layer")?.active) {
        canvas.terrain.getEnvironments = function () {
            return [
                { id: 'dangerous', text: 'Dangerous', icon: '' },
                { id: 'defiled', text: 'Defiled', icon: '' },
                { id: 'entangling', text: 'Entangling', icon: '' },
                { id: 'hallowed', text: 'Hallowed', icon: '' },
                { id: 'imbalanced', text: 'Imbalanced', icon: '' },
                { id: 'obscuring', text: 'Obscuring', icon: '' },
                { id: 'confining', text: 'Confining', icon: '' },
                { id: 'elevated', text: 'Elevated', icon: '' },
                { id: 'open', text: 'Open', icon: '' },
                { id: 'recessed', text: 'Recessed', icon: '' }
            ]
        }
    }
})
Hooks.once("dragRuler.ready", (SpeedProvider) => {
    class LegendOfTheFiveRingsSpeedProvider extends SpeedProvider {
        get colors(){
            return [
                { id: "touchRange", default: 0xB71C1C, name: "Touch Range (1-2 feet)"}, //scorpion
                { id: "swordRange", default: 0xF9A825, name: "Sword Range (1-2 yards)"}, //lion
                { id: "spearRange", default: 0x0288D1, name: "Spear Range (3-4 yards)"}, //crane
                {id: "throwRange", default: 0x546E7A, name: "Throwing Range (5-10 yards)"}, //crab
                { id: "bowRange", default: 0xF4511E, name: "Bow Range (11-100 yards)"}, //phoenix
                { id: "volleyRange", default: 0x9CCC65, name: "Volley Range (100+ yards)"}, //dragon
                { id: "sightRange", default: 0xBA68C8, name: "Sight Range"} //unicorn
            ]
        }
        getRanges() {
            var actualRange = GetRangeDefault();
            const baseSpeed = 1;
            const ranges = [
                { range: baseSpeed *actualRange[0], color: "touchRange"}, //5
                { range: baseSpeed *actualRange[1], color: "swordRange"}, //10
                { range: baseSpeed *actualRange[2], color: "spearRange"}, //15
                { range: baseSpeed *actualRange[3], color: "throwRange"}, //30
                { range: baseSpeed *actualRange[4], color: "bowRange"}, //50
                { range: baseSpeed *actualRange[5], color: "volleyRange"}, //75
                { range: baseSpeed *actualRange[6], color: "sightRange"} //100
            ]
            return ranges;
        }
    }
    dragRuler.registerModule("l5r-dragruler", LegendOfTheFiveRingsSpeedProvider)
})
function GetRangeDefault(){
    var setZero = (dragRulerZeroBasedMovement)? 1 : 0;
    var defaultRange = new Array(1-setZero,2-setZero,3-setZero,6-setZero,10-setZero,15-setZero,20-setZero,21-setZero);
    var tacticalRange = new Array(0,2,4,10,100,101,102);
    return (dragRulerTacticalBasedMovement)? tacticalRange : defaultRange;
}
function registerSettings() {
    game.settings.register("l5r-dragruler", "dragRulerSupport", {
        name: "l5r-dragruler.settings.dragRulerSupport.name",
        hint: "l5r-dragruler.settings.dragRulerSupport.hint",
        scope: "client",
        default: true,
    });
    game.settings.register("l5r-dragruler","setZeroBased", {
        name: "Set zero based range band.",
        hint: "Sets range band to begin at position 0.",
        scope: "client",
        config: true,
		type: Boolean,
		default: false,
    })
    game.settings.register("l5r-dragruler","setTacticalBased", {
        name: "Tactical setting.",
        hint: "Sets range band to convert to yards instead of range bands.",
        scope: "client",
        config: true,
		type: Boolean,
		default: false,
    })
}
function getAllPreviousRayWidths() {

}
function changeLabelNames(text) {
    let returnedText = "";
    let regexResult = text.split(' ');
    var actualRange = GetRangeDefault();
    if (regexResult && regexResult[0]) {
        var parsedFloat = parseFloat(regexResult[0]);
        if (parsedFloat <= (actualRange[0])) {
            returnedText = "Touch";
        } else if (parsedFloat <= (actualRange[1])) {
            returnedText = "Sword";
        } else if (parsedFloat <= (actualRange[2])) {
            returnedText = "Spear";
        } else if (parsedFloat <= (actualRange[3])) {
            returnedText = "Throwing";
        } else if (parsedFloat <= (actualRange[4])) {
            returnedText = "Bow";
        } else if (parsedFloat <= (actualRange[5])) {
            returnedText = "Volley";
        } else {
            returnedText = "Sight";
        }
    }
    var square = (regexResult[0]<=1)? " square" : " squares";
    var yard = (regexResult[0]<=1)? " yard" : " yards";
    return returnedText + " Range" + " [" + regexResult[0] + ((dragRulerTacticalBasedMovement)? yard : square) + "]";
}
