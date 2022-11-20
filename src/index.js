import BasicApplication from './view/BasicApplication.js';
import { init as opportunities_init, dice_helper, create_and_populate_journal as dice_helper_setup } from './module_opportunities.js';
import { init as rangeband_init } from './module_rangeband.js';
import { init as scenes_init } from './module_scenes.js';
import { actor_fatigue, init as actor_init } from './module_actor_stances.js';

Hooks.once('init', async function () {
   rangeband_init();
   scenes_init();
   //actor_init();
   opportunities_init();

   Handlebars.registerHelper("times", function (times, opts) {
      var out = "";
      var i;
      var data = {};

      if (times) {
         for (i = 0; i < times; i += 1) {
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
   Handlebars.registerHelper("bold", function (text) {
      var result = "<b>" + Handlebars.escapeExpression(text) + "</b>";
      return new Handlebars.SafeString(result);
   });
})
Hooks.once('ready', () => {
   dice_helper();
   dice_helper_setup();
   //actor_fatigue();
   //new BasicApplication().render(true, { focus: true });
})