// JavaScript source code
/*
 *  Containing: 
 *    - Forcing rolls
 *    - Modifying rolls
 *    - Displaying created wounds based on stance.
 *    - Applying created wounds on people's rolls.
 *    - Having those wounds matter.
 */

export function init() {
   game.settings.register("l5r-tools", "actor-helper", {
      name: game.i18n.localize('l5r-tools.settings.actor-helper.name'),
      hint: game.i18n.localize('l5r-tools.settings.actor-helper.hint'),
      scope: "world",
      config: true,
      type: Boolean,
      default: true
   })
}

export function actor_fatigue() {
   game.socket.on("module.l5r-tools", socket_listener);
   Hooks.on("createChatMessage", (messageData) => {
      if (game.settings.get("l5r-tools", "actor-helper")) {
         if (messageData["rolls"] != null
            && messageData["rolls"][0]["l5r5e"]["rnkEnded"] == true
            && game.combat.getCombatantByActor(messageData.rolls[0].actor) != undefined
            && messageData["rolls"][0]["l5r5e"]["summary"].totalSuccess > 1
            && messageData.user.targets.size > 0
         ) {
            var attacker = messageData.rolls[0].l5r5e.actor;
            var target = messageData.rolls[0].l5r5e.target;


            //store stance
            //get armor of target
            //get weapon of actor (or if using theology, something else?)
            //add together bonus successes (and strife if using fire stance) and weapon
            //subtract armor
            //display popup asking if damage will be applied
            //if there was a critical strike also involved, do function below
         }
      }
   });
}

async function socket_listener(data) {
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
}

function is_roll(message_data) {
   if (game.user.isGM && message_data['rolls'] !== null) {
      return true;
   }
   return false;
}
function applyEffect() {

}

function displayEffect() {

}