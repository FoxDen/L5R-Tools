/*
 *  Containing:
 *    - Opportunities popup for displaying the number and type of opportunities available to the user. 
 *    - Add little buttons for automatically using opportunities to inflict stuff on people?
 *    - Display opps for techniques if a technique is used.
 */
export async function create_and_populate_journal() {
    if (!game.settings.get("l5r-tools", "opportunity-helper")) {
        return;
    }

    // otherwise check to see if the journal already exists
    let journal_name = game.settings.get("l5r-tools", "opportunity-helper-data");
    let journal = game.journal.filter(journal => journal.name === journal_name);
    if (journal.length === 0) {
        // journal doesn't exist

        // let's search for a translated one (will probably show an error in console, can't avoid it)
       let jsonFilePath = "modules/l5r-tools/content/" + game.i18n.lang +"/op_helper.json"
        await fetch(jsonFilePath).then(response => {
            if (!response.ok) {
                jsonFilePath = "modules/l5r-tools/content/en/op_helper.json";
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

export function init() {
    game.settings.register("l5r-tools", "opportunity-helper", {
        name: game.i18n.localize('l5r-tools.settings.opportunity-helper.name'),
        hint: game.i18n.localize('l5r-tools.settings.opportunity-helper.hint'),
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    })
    game.settings.register("l5r-tools", "opportunity-helper-data", {
        name: game.i18n.localize('l5r-tools.settings.opportunity-helper-data.name'),
        hint: game.i18n.localize('l5r-tools.settings.opportunity-helper-data.hint'),
        scope: "world",
        config: true,
        type: String,
        default: "dice_helper"
    })
   game.settings.register("l5r-tools", "opportunity-helper-reduce", {
      name: game.i18n.localize('l5r-tools.settings.opportunity-helper-reduce.name'),
      hint: game.i18n.localize('l5r-tools.settings.opportunity-helper-reduce.hint'),
      scope: "world",
      config: true,
      type: Boolean,
      default: false
   })
}

export function dice_helper() {
    game.socket.on("module.l5r-tools", socket_listener);
    Hooks.on("createChatMessage", (messageData) => {
       if (game.settings.get("l5r-tools", "opportunity-helper")) {
            if (is_roll(messageData) === true
               && messageData["rolls"][0]["l5r5e"]["rnkEnded"] == true 
               && messageData["rolls"][0]["l5r5e"]["summary"].opportunity > 0) {
               var actorRoll = messageData["rolls"][0]["l5r5e"];

               let skillGroup = actorRoll.skillCatId;
               let skill = actorRoll.skillId;
               let stance = actorRoll.stance;
               let opp = actorRoll["summary"].opportunity;
               let succ = actorRoll["summary"].totalSuccess;
               let diff = actorRoll.difficulty;
               let isInit = actorRoll.isInitiativeRoll;
               let tech = (actorRoll.item) ? actorRoll.item.name : "";
               var otherActor = {};
               if (actorRoll.target != null) {
                  otherActor = actorRoll.target._actor;
               }
               updateActorAndTarget(actorRoll.actor,otherActor);
                var msg = {
                    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                    'content': '<button class="l5rSpend" ' +
                        'data-st="' + stance + '" ' +
                        'data-skG="' + skillGroup + '" ' +
                        'data-sk="' + skill + '" ' +
                        'data-op="' + opp + '" ' +
                        'data-succ="' + (succ-diff) + '" ' +
                        'data-init="' + isInit + '" ' +
                        'data-tech="' + tech + '"' +
                        '>' + game.i18n.localize('l5r-tools.misc.SpendResults')+'</button>'
                };
                ChatMessage.create(msg);
            }
        }

    });
    Hooks.on("renderChatMessage", (app, html, messageData) => {
        if (game.settings.get("l5r-tools", "opportunity-helper")) {
            // this would need to remain in renderchatmessage since we don't have easy access to the HTML later
            html.on("click", ".l5rSpend", async function () {
                await dice_helper_clicked(messageData);
            });
        }
    })
}

let actorSelf = {};
let actorTarget = {};
function updateActorAndTarget(actor, target) {
   console.log("Actor " + actorSelf.toString() + " and target " + actorTarget.toString() + " were added.");
   actorSelf = actor;
   actorTarget = target;
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
        'success': data.data("succ"),
        'init': data.data("init"),
        'tech': data.data("tech")
    };
}

function is_roll(message_data) {
   if (game.user.isGM && message_data["rolls"][0] !== null && message_data["rolls"][0] != undefined) {
        return true;
    }
    return false;
}

function load_data() {
    let journal_name = game.settings.get("l5r-tools", "opportunity-helper-data");
    let journal = game.journal.filter(journal => journal.name === journal_name);

    if (journal.length <= 0) {
        ui.notifications.warn(game.i18n.localize('l5r-tools.warning.NoFind'));
        return {};
    }
    try {
        let data = journal[0].pages.contents[0]["text"]["content"].replace('<p>', '').replace('</p>', '');
        let jsondata = JSON.parse(data.replace('\"', '"'));
        // Let translate the skill names if possible
        Object.keys(jsondata).forEach(skillname => {
            if (skillname.includes("SWFFG.")) {
                let localizedskill = game.i18n.localize(skillname).toLowerCase();
                Object.defineProperty(jsondata, localizedskill,
                    Object.getOwnPropertyDescriptor(jsondata, skillname));
                delete jsondata[skillname];
            }
        });
        return jsondata;
    } catch (err) {
        ui.notifications.warn(game.i18n.localize('l5r-tools.warning.InvalidData'));
        return {};
    }
}

async function socket_listener(data) {
    if (data.type === "dice") {
        if (game.user.isGM) {
            dice_helper_clicked(data.object);
        }
    }
}

async function dice_helper_clicked(object) {
    if (!game.user.isGM) {
        game.socket.emit(
            'module.l5r-tools',
            {
                type: 'dice',
                object: object
            }
        );
        return;
    }
   var data = determine_data(object.message.content);
   var msg = new ChatMessage(object.message);
   if (data['skill'] != undefined) {
      let skill = data['skill'];
      let suggestions = await fetch_suggestions(data);

      var reduction = game.settings.get("l5r-tools", "opportunity-helper-reduce");
      let context = {
         suggestions: suggestions.suggestions,
         image: (reduction) ? "" : suggestions.image,
         acting: suggestions.description[0].acting,
         description: suggestions.description[0].descriptor,
         skill: skill.capitalize(),
         stance: suggestions.category,
         oppType: suggestions.oppType
      };
      object.message.content = (await getTemplate('modules/l5r-tools/templates/dice_helper.html'))(context);
   } else {
      object.message.content = object.message.content;
   }
    
    //object.message.id = object.message._id;
    msg.update(object.message);
}

async function fetch_suggestions(results) {
    let skillGroup = (results['rolls'] != undefined) ? results['rolls'][0]['l5r5e'].skillCatId : results['skillGroup'];
    let skill = (results['rolls'] != undefined) ? results['rolls'][0]['l5r5e'].skillId : results['skill'];
    let category = (results['rolls'] != undefined) ? results['rolls'][0]['l5r5e'].stance : results['stance'];
    let isInit = (results['rolls'] != undefined) ? results['rolls'][0]['l5r5e'].init : results['init'];
    let techName = (results['rolls'] != undefined) ? results['rolls'][0]['l5r5e'].item.name : results['tech'];
    let weapon = (actorSelf.haveWeaponReadied) ? actorSelf.itemTypes.weapon.filter(m => m.system.readied && m.system.equipped)[0] : null;
    let targetTainted = (Object.keys(actorTarget).length > 0 && actorTarget.itemTypes.peculiarity.filter(m => m.name.includes("Taint")).length > 0);
    let selfTainted = (actorSelf.itemTypes.peculiarity.filter(m => m.name.includes("Taint")).length > 0);

    let suggestions = [];
    let skillSuggestions = [];
    let data = load_data();
    var initiativeSkills = ["sentiment", "meditation", "tactics", "command"];
    var attackSkills = ["ranged", "melee", "unarmed"];
    var categoryImagePath = "systems/l5r5e/assets/icons/rings/" + category + ".svg";

    category = category.capitalize();
    //get base
    let tmpSuggestions = data[category].base.filter(suggestion => suggestion.required <= results["opportunity"]);
   //get skillgroup opps
    if (skillGroup == "martial") {
         skillSuggestions = data[category].conflict.filter(suggestions => suggestions.required <= results["opportunity"]);
       if (attackSkills.includes(skill)) { //if this is a martial strike
          let isSuccess = results['success'] >= 0; //successful or unsuccessful
          if (isSuccess) {
             var strike = {
                "text": game.i18n.localize('l5r-tools.misc.CritStrike'),
                "required": 2,
                "extra": false,
                "action": "strike"
             }
          } else {
             var strike = {
                "text": game.i18n.localize('l5r-tools.misc.FailedOpps'),
                "required": 1,
                "extra": false,
                "action": "strike"
             }
          }
          skillSuggestions = (strike.required <= results["opportunity"])? skillSuggestions.concat(strike) : skillSuggestions;
       }
       if (techName != null) {
          //eventually include technique opps.
       }
       if (weapon != null) {
          //get quality of weapon
          if (weapon.system.properties.length > 0) {
             var qualities = weapon.system.properties;
             qualities.forEach(elem => skillSuggestions.push(data.Weapons.Qualities[elem.name]));
          }
          //get type of weapon
          var strippedName = weapon.name.replace(/[^a-z0-9]/gi, '').toLowerCase();
          var weaponOpp = data.Weapons.WeaponName[strippedName];
          if (weaponOpp != undefined && weaponOpp.required <= results["opportunity"]) {
             skillSuggestions.push(weaponOpp);
          }
       }
    } else if (skillGroup != "") { //if a skill was rolled
       if (skill == "theology" && techName != null) { //if these are specific invocations
          var magicSkills = data[category].invocation.filter(suggestions => suggestions.required <= results["opportunity"]);
          skillSuggestions = skillSuggestions.concat(magicSkills);
       }
       if (skill == "medicine" && category == "Water" && results["opportunity"] >= 2) { //first aid
          skillSuggestions.concat(data[category].skills.healing);
       }
       skillSuggestions = skillSuggestions.concat(data[category]["skills"][skillGroup]);
   }
   //tainted
   if (targetTainted || selfTainted) {
      var target = data[category].tainted.other.required <= results["opportunity"];
      if (targetTainted && target != false) {
         skillSuggestions.push(data[category].tainted.other);
      }
      var self = data[category].tainted.self.required <= results["opportunity"];
      if (selfTainted && self != false) {
         skillSuggestions.push(data[category].tainted.self);
      }
   }
   //initiative
   if (initiativeSkills.includes(skill) && isInit) {
       var sk = data[category]["skills"].initiative;
       skillSuggestions = skillSuggestions.concat(sk);
   }
   skillSuggestions = skillSuggestions.concat(tmpSuggestions);
   suggestions = {
      suggestions: skillSuggestions.sort((a, b) => (a.required > b.required) ? 1 : (a.required === b.required) ? ((a.extra && !b.extra)? 1 : -1) : -1),
      description: data[category].desc,
      image: categoryImagePath,
      category: category,

    };
   return suggestions;
}
// JavaScript source code
