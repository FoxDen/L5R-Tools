// JavaScript source code
/*
 * Containing:
 *    - Range band display and movement for determining the movement location of all areas. 
 *    - Radial display of range bands up to the Bow-range level to show who would be in rage to be affected.
 *    - Terrain and updates to it.
 */
let dragRulerZeroBasedMovement = false;
let dragRulerTacticalBasedMovement = false;

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
                entry.text = game.i18n.localize('l5r-tools.ranges.terrain.' + entry.id);
                return entry;
            })
        }
    }
})

Hooks.once("dragRuler.ready", (SpeedProvider) => {
    class LegendOfTheFiveRingsSpeedProvider extends SpeedProvider {
        get colors() {
            return [
                { id: 'touchRange', default: 0xB71C1C }, //scorpion
                { id: 'swordRange', default: 0xF9A825 }, //lion
                { id: 'spearRange', default: 0x0288D1 }, //crane
                { id: 'throwRange', default: 0x546E7A }, //crab
                { id: 'bowRange', default: 0xF4511E }, //phoenix
                { id: 'volleyRange', default: 0x9CCC65 }, //dragon
                { id: 'sightRange', default: 0xBA68C8 } //unicorn
            ].map(entry => {
                entry.name = game.i18n.localize('l5r-tools.ranges.weapon_desc.' + entry.id);
                return entry;
            })
        }
        getRanges() {
            var actualRange = GetRangeDefault();
            const baseSpeed = 1;
            const ranges = [
                { range: baseSpeed * actualRange[0], color: "touchRange" }, //5
                { range: baseSpeed * actualRange[1], color: "swordRange" }, //10
                { range: baseSpeed * actualRange[2], color: "spearRange" }, //15
                { range: baseSpeed * actualRange[3], color: "throwRange" }, //30
                { range: baseSpeed * actualRange[4], color: "bowRange" }, //50
                { range: baseSpeed * actualRange[5], color: "volleyRange" }, //75
                { range: baseSpeed * actualRange[6], color: "sightRange" } //100
            ]
            return ranges;
        }
    }
    dragRuler.registerModule("l5r-tools", LegendOfTheFiveRingsSpeedProvider)
})

export function init() {
    game.settings.register('l5r-tools', 'dragruler-helper', {
        name: game.i18n.localize('l5r-tools.settings.dragruler-helper.name'),
        hint: game.i18n.localize('l5r-tools.settings.dragruler-helper.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
    })
    game.settings.register('l5r-tools', 'setZeroBased', {
        name: game.i18n.localize('l5r-tools.settings.setZeroBased.name'),
        hint: game.i18n.localize('l5r-tools.settings.setZeroBased.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
    })
    game.settings.register("l5r-tools", "setTacticalBased", {
        name: game.i18n.localize('l5r-tools.settings.setTacticalBased.name'),
        hint: game.i18n.localize('l5r-tools.settings.setTacticalBased.hint'),
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
    })
   let foundryGeneration = game.release.generation;
   let dragRulerSupportActive = game.settings.get("l5r-tools", "dragruler-helper");
   if (foundryGeneration >= 10 && dragRulerSupportActive) {
      libWrapper.register("l5r-tools", "Token.prototype._onDragLeftMove", function (wrapped, ...args) {
         let wrappedResult = wrapped(...args);
         dragRulerZeroBasedMovement = game.settings.get("l5r-tools", "setZeroBased");
         dragRulerTacticalBasedMovement = game.settings.get("l5r-tools", "setTacticalBased");
         setTimeout(function () {
            let rulers = game.canvas.controls.rulers.children;
            for (let i = 0; i < rulers.length; i++) {
               if (rulers[i].isDragRuler) {
                  let dragRulerSegments = rulers[i].segments;
                  if (dragRulerSegments && Array.isArray(dragRulerSegments) && dragRulerSegments.length > 0) {
                     for (let i = 0; i < dragRulerSegments.length; i++) {
                        if (dragRulerSegments[i].label.text.split("\n").length === 1 && !dragRulerSegments[i].label.text.includes("range")) {
                           dragRulerSegments[i].label.text = changeLabelNames(dragRulerSegments[i].label.text);
                        }
                     }
                  }
               }
            }
         }, 30);
         return wrappedResult;
      }, 'WRAPPER');
   } else {
      libWrapper.register("l5r-tools", "Ruler.prototype.measure", function (wrapped, ...args) {
         let wrappedResult = wrapped(...args);
         dragRulerZeroBasedMovement = game.settings.get("l5r-tools", "setZeroBased");
         dragRulerTacticalBasedMovement = game.settings.get("l5r-tools", "setTacticalBased");
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
   }
}

function GetRangeDefault() {
   var setZero = (dragRulerZeroBasedMovement) ? 1 : 0;
   var defaultRange = new Array(1, 2, 3, 6, 10, 15, 20, 21);
   var tacticalRange = new Array(0, 2, 4, 10, 100, 101, 102);
   return (dragRulerTacticalBasedMovement) ? tacticalRange : defaultRange.map(element => element - setZero);
}

function changeLabelNames(text) {
    let returnedText = "out_of";
    const regexResult = text.split(' ');
    const arrayRange = GetRangeDefault();

    if (regexResult && regexResult[0]) {
       const parsedFloat = parseFloat(regexResult[0])
        if (parsedFloat <= arrayRange[0]) {
            returnedText = 'touch'
        } else if (parsedFloat <= arrayRange[1]) {
            returnedText = 'sword'
        } else if (parsedFloat <= arrayRange[2]) {
            returnedText = 'spear'
        } else if (parsedFloat <= arrayRange[3]) {
            returnedText = 'throwing'
        } else if (parsedFloat <= arrayRange[4]) {
            returnedText = 'bow'
        } else if (parsedFloat <= arrayRange[5]) {
            returnedText = 'volley'
        } else if (parsedFloat <= arrayRange[6]) {
            returnedText = 'sight'
        }
    }

    const square = ' ' + game.i18n.localize('l5r-tools.' + ((regexResult[0] <= 1) ? 'square' : 'squares'));
    const yard = ' ' + game.i18n.localize('l5r-tools.' + ((regexResult[0] <= 1) ? 'yard' : 'yards'));
    return game.i18n.localize('l5r-tools.ranges.weapon.' + returnedText) + ' [' + regexResult[0] + ((dragRulerTacticalBasedMovement)? yard: square) + ']'
}