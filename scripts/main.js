Hooks.on("init", () => {
    registerSettings();
});
//TODO?
//If someone is next to you, you are Entangled and lose a square of movement.
//Neaten out the areas of movement
//Make Terrain Matter?
//Diagonal/Resolving Movement etc
//Add functionality for technique-specific opportunities, merge with Attack-specific opportunity
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
Hooks.once('ready',() =>{
    dice_helper();
    create_and_populate_journal();
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
Handlebars.registerHelper("times", function (times, opts) {
    var out = "";
    var i;
    var data = {};

    if ( times ) {
        for ( i = 0; i < times; i += 1 ) {
            data.index = i;
            out += opts.fn(this, {
                data: data
            });
        }
    } else {

        out = opts.inverse(this);
    }

    return out;
});

async function socket_listener(data){
    if(data.type === "dice"){
        if(game.user.isGM) {
            dice_helper_clicked(data.object);
        }
    }
}

async function dice_helper_clicked(object){
    if(!game.user.isGM){
        game.socket.emit(
            'module.l5r-dragruler',
            {
                type: 'dice',
                object:object
            }
        );
        return;
    }
    var data = determine_data(object.message.content);

    let skill = data['skill'];
    let suggestions = await fetch_suggestions(data);

    var msg = new ChatMessage(object.message);
    let context = {
        suggestions: suggestions.suggestions,
        image: suggestions.image,
        acting: suggestions.description[0].acting,
        description: suggestions.description[0].descriptor,
        skill: skill.capitalize(),
        stance: suggestions.category
    };
    object.message.content = (await getTemplate('modules/l5r-dragruler/templates/dice_helper.html'))(context);
    object.message.id = object.message._id;
    msg.update(object.message);
}

async function fetch_suggestions(results) {
    let skillGroup = (results['roll']!=undefined)? results['roll']['l5r5e'].skillCatId : results['skillGroup'] ;
    let skill = (results['roll']!=undefined)? results['roll']['l5r5e'].skillId : results['skill'] ;
    let category = (results['roll']!=undefined)? results['roll']['l5r5e'].stance : results['stance'];
    let suggestions = [];
    let skillSuggestions = [];
    let data = load_data();
    var initiativeSkills = ["sentiment", "meditation","tactics", "command"];
    var attackSkills = ["ranged","melee","unarmed"];
    var categoryImagePath = "systems/l5r5e/assets/icons/rings/"+category+".svg";

    category = category.capitalize();
    //get base
    let tmpSuggestions = data[category].base.filter(suggestion => suggestion.required <= results["opportunity"]);
    //get skillgroup opps
    if(skillGroup == "martial"){
        skillSuggestions = data[category].conflict.filter(suggestions => suggestions.required <= results["opportunity"]);
        if(attackSkills.includes(skill) && results['success']>=2){
            var sk = {
                "text":"Inflict a critical strike on your target with severity equal to your weapon's deadliness.", 
                "required": 2,
                "extra": false,
                "action": "strike"
            }
            skillSuggestions.push(sk);
        }
    } else if(skillGroup != "") {
        skillSuggestions.push(data[category]["skills"][skillGroup]);
    }
    //initiative
    if(initiativeSkills.includes(skill)){
        var sk = data[category]["skills"].initiative;
        skillSuggestions.push(sk);
    }
    suggestions = {
        suggestions: tmpSuggestions.concat(skillSuggestions),
        description: data[category].desc,
        image: categoryImagePath,
        category: category
    };
    return suggestions;
}

export function dice_helper(){
    game.socket.on("module.l5r-dragruler", socket_listener);
    Hooks.on("createChatMessage", (messageData, meta_data, id) =>{
        if(game.settings.get("l5r-dragruler", "opportunity-helper")){
            if(is_roll(messageData) === true && messageData["_roll"]!= null 
                && messageData["_roll"]["l5r5e"]["rnkEnded"]==true // Reveal on second roll
                && messageData["roll"]["l5r5e"]["summary"].opportunity > 0){ 
                let skillGroup = messageData["roll"]["l5r5e"].skillCatId;
                let skill = messageData["roll"]["l5r5e"].skillId;
                let stance = messageData["roll"]["l5r5e"].stance;
                let opp = messageData["roll"]["l5r5e"]["summary"].opportunity;
                let succ = messageData["roll"]["l5r5e"]["summary"].totalSuccess;
                
                var msg = {
                    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                    'content': '<button class="l5rSpend" '+
                               'data-st="' + stance + '" ' +
                               'data-skG="' + skillGroup + '" '+
                               'data-sk="' + skill + '" '+
                               'data-op="' + opp + '" ' + 
                               'data-succ="' + succ + '" ' + 
                               '> Help Spend Results?</button>'
                };
                ChatMessage.create(msg);
            }
        }

    });
    Hooks.on("renderChatMessage", (app, html, messageData) => {
        if (game.settings.get("l5r-dragruler", "opportunity-helper")) {
            // this would need to remain in renderchatmessage since we don't have easy access to the HTML later
            html.on("click", ".l5rSpend", async function () {
                await dice_helper_clicked(messageData);
            });
        }
    })
}

export async function create_and_populate_journal(){
    if (!game.settings.get("l5r-dragruler", "opportunity-helper")) {
        return;
    }

    // otherwise check to see if the journal already exists
    let journal_name = game.settings.get("l5r-dragruler", "opportunity-helper-data");
    let journal = game.journal.filter(journal => journal.name === journal_name);

    if (journal.length === 0) {
        // journal doesn't exist

        // let's search for a translated one (will probably show an error in console, can't avoid it)
        let jsonFilePath = "modules/l5r-dragruler/content/op_helper" + game.i18n.lang + ".json"
        await fetch(jsonFilePath).then(response => {
            if(!response.ok) {
                jsonFilePath = "modules/l5r-dragruler/content/op_helper.json";
            }
        });

        // then create journal
        let suggestions = await $.getJSON(jsonFilePath);
        let data = {
            "name": journal_name,
            "content": JSON.stringify(suggestions),
        };
        JournalEntry.create(data);
    }
}

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
    game.settings.register("l5r-dragruler","setTacticalBased", {
        name: "Tactical setting.",
        hint: "Sets range band to convert to yards instead of range bands.",
        scope: "client",
        config: true,
		type: Boolean,
		default: false,
    })
    game.settings.register("l5r-dragruler","opportunity-helper",{
        name: "Opportunity Assistance.",
        hint: "Enable opportunity roll assistance.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    })
    game.settings.register("l5r-dragruler","opportunity-helper-data",{
        name: "Dice Helper Journal",
        hint: "Dice helper suggestions will be read from this journal.",
        scope: "world",
        config: true,
        type: String,
        default: "dice_helper"
    })
}
function GetRangeDefault(){
    var setZero = (dragRulerZeroBasedMovement)? 1 : 0;
    var defaultRange = new Array(1-setZero,2-setZero,3-setZero,6-setZero,10-setZero,15-setZero,20-setZero,21-setZero);
    var tacticalRange = new Array(0,2,4,10,100,101,102);
    return (dragRulerTacticalBasedMovement)? tacticalRange : defaultRange;
}

function load_data(){
    let journal_name = game.settings.get("l5r-dragruler", "opportunity-helper-data");
    let journal = game.journal.filter(journal => journal.name === journal_name);

    if (journal.length <= 0) {
        ui.notification.warn("Failed to find journal - make sure it's created or something");
        return {};
    }
    try {
        let data = journal[0].data.content.replace('<p>', '').replace('</p>', '');
        let jsondata = JSON.parse(data.replace('\"', '"'));
        // Let translate the skill names if possible
        Object.keys(jsondata).forEach( skillname => {
            if(skillname.includes("SWFFG.")){
                let localizedskill = game.i18n.localize(skillname).toLowerCase();
                Object.defineProperty(jsondata, localizedskill,
                    Object.getOwnPropertyDescriptor(jsondata, skillname));
                delete jsondata[skillname];
            }
        });
        return jsondata;
    } catch(err) {
        ui.notification.warn("Dice helper: invalid data detected in journal");
        return {};
    }
}

function determine_data(incoming_data) {
    /**
     * read the button metadata to determine results from the associated dice roll
     *
     * @param {incoming_data} html created by dice_helper
     */
    let data = $(incoming_data);
    return {
        'opportunity': data.data('op'),
        'stance': data.data('st'),
        'skillGroup': data.data('skg'),
        'skill': data.data("sk"),
        'success': data.data("succ")
    };
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

function is_roll(message_data) {
    if (game.user.isGM && message_data['_roll'] !== null) {
        if (message_data['data']['roll'] === undefined) {
            return false;
        }
        return true;
    }
    return false;
}

