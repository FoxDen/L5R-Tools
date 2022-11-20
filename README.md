# L5R-Tools

This is a very small (two!) set of tools for a GM of the Legend of the 5 Rings system. It has two functionalities at the moment.
# L5R Dragruler.
This tool is a conversion of the Foundry VTT Drag Ruler module for Legend of the 5 Rings. This shows what range band you are currently moving to from your current start point. The grids are also color-coded. 

This works for gridless and hexagonal maps as well. I hope to eventually implement terrain types, "Difficult squares" and diagonal movement. 

(!): As of Ver. 10, I know that the Dragruler module isn't working...please don't enable it until that is fixed. It shouldn't affect the functionality of any of the other tools though.

# L5R Opportunity Tracker
This tool determines the number of opportunities taken after rolling and accepting your results. I would recommend you delete and rebuild your dice_helper file after every major update, as the opportunity json is stored there!

Very grateful to ManuelVo ( https://github.com/manuelVo/foundryvtt-drag-ruler ) and wrycu ( https://github.com/wrycu/StarWarsFFG-Enhancements/tree/main/scripts ) for inspiration. This is also using TyphonJS (eventually) in order to set up Chat Messages. ( https://github.com/typhonjs-fvtt-demo/essential-svelte-esm )

# TODO
 * - Force users to roll if they are targeted by a martial roll (after succeeding opps and succ's)
 * - Modify rolls based on targeting, readied weapons and worn armor
 * - terrain modifications relying on other modules
 * - Tweak opportunity display, allow user to hide image or "shorten" roll, etc.
 * - Dueling popup, progressively adding strife
 * - Apply wounds thru popup, apply fatigue thru popup. (Try to integrate into chatlogmessage?)

 # Changelog (As of 11/17/2022, Ver. 2.5)
 - Updated Opportunities list
    - Tainted and Weapons added
    - Invocation opportunities added
    - First Aid opportunity added
 - Ordered Opportunities output, sorting by least to most.
 - Updated to V10 Foundry
 - Updated to use TyphonJS
 - Cleaned and split module tool parts into different sections for readability